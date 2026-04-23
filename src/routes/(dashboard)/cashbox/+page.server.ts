import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { CashboxRepository } from '$lib/server/repositories/cashbox.repository';
import { readFormField } from '$lib/utils/formData';
import { formatLocalDateValue } from '$lib/utils/attendance';
import { isUuid } from '$lib/utils/validation';
import type { CashboxDailySummary, PaymentConceptCode } from '$lib/types/finance';

interface PaymentItemPayload {
	conceptCode: PaymentConceptCode;
	conceptLabel: string;
	detail?: string | null;
	amount: number | string;
}

type CashboxTabValue = 'summary' | 'payments' | 'outflows' | 'monthly';
type CashboxLocals = Parameters<PageServerLoad>[0]['locals'];

const TODAY = formatLocalDateValue();
const VALID_TABS = new Set<CashboxTabValue>(['summary', 'payments', 'outflows', 'monthly']);

function hasCashboxWritePermission(canCreate: boolean, canUpdate: boolean): boolean {
	return canCreate || canUpdate;
}

function parsePaymentItems(rawValue: string): PaymentItemPayload[] {
	if (!rawValue) {
		throw new Error('Debes agregar al menos un concepto de cobro');
	}

	const parsed = JSON.parse(rawValue) as unknown;
	if (!Array.isArray(parsed)) {
		throw new Error('Los conceptos del pago no son válidos');
	}

	return parsed.map((item) => {
		if (!item || typeof item !== 'object') {
			throw new Error('Uno de los conceptos del pago no es válido');
		}

		const conceptCode =
			typeof item.conceptCode === 'string' ? (item.conceptCode as PaymentConceptCode) : null;
		const conceptLabel = typeof item.conceptLabel === 'string' ? item.conceptLabel : '';
		const detail = typeof item.detail === 'string' ? item.detail : null;
		const amount =
			typeof item.amount === 'number' || typeof item.amount === 'string' ? item.amount : null;

		if (!conceptCode || amount === null) {
			throw new Error('Uno de los conceptos del pago no es válido');
		}

		return {
			conceptCode,
			conceptLabel,
			detail,
			amount
		};
	});
}

function normalizeTab(value: string | null | undefined): CashboxTabValue {
	return VALID_TABS.has(value as CashboxTabValue) ? (value as CashboxTabValue) : 'summary';
}

function buildCurrentUserName(user: CashboxLocals['user'] | null | undefined): string {
	const parts = [user?.name, user?.last_name].filter(
		(part): part is string => typeof part === 'string' && part.trim().length > 0
	);
	return parts.join(' ').trim() || 'Usuario actual';
}

function buildEmptySummary(
	selectedDate: string,
	branchCode: string | null,
	cashierUserCode: string | null
): CashboxDailySummary {
	return {
		business_date: selectedDate,
		branch_code: branchCode,
		branch_name: null,
		cashier_user_code: cashierUserCode,
		cashier_full_name: null,
		cashbox_day_code: null,
		opened_by_user_code: null,
		closed_by_user_code: null,
		opening_amount: 0,
		income_amount: 0,
		expense_amount: 0,
		surrender_amount: 0,
		current_amount: 0,
		closing_amount: null,
		notes: null,
		closed_at: null,
		created_at: null,
		updated_at: null
	};
}

async function resolveCashboxScope(
	locals: CashboxLocals,
	requestedBranchCode: string | null | undefined
): Promise<{ branchCode: string; cashierUserCode: string }> {
	const cashierUserCode = (locals.user?.code ?? '').trim();

	if (!isUuid(cashierUserCode)) {
		throw new Error('No se pudo identificar al usuario actual');
	}

	const branches = await CashboxRepository.listAvailableBranches(
		locals.db,
		cashierUserCode,
		Boolean(locals.user?.is_super_admin)
	);

	if (branches.length === 0) {
		throw new Error('No tienes una sede asignada para operar caja');
	}

	const branchCode = (requestedBranchCode ?? '').trim();
	if (!branchCode || !branches.some((branch) => branch.code === branchCode)) {
		throw new Error('La sede seleccionada no es válida para tu usuario');
	}

	return { branchCode, cashierUserCode };
}

export const load: PageServerLoad = async ({ locals, depends, url }) => {
	depends('cashbox:load');

	const [canReadCashbox, canReadPayments] = await Promise.all([
		locals.can('cashbox:read'),
		locals.can('payments:read')
	]);

	const currentUserCode = isUuid(locals.user?.code ?? '') ? (locals.user?.code ?? '') : null;
	const currentUserName = buildCurrentUserName(locals.user);
	const branches = currentUserCode
		? await CashboxRepository.listAvailableBranches(
				locals.db,
				currentUserCode,
				Boolean(locals.user?.is_super_admin)
			)
		: [];
	const selectedBranchCode = CashboxRepository.pickRequestedBranchCode(
		url.searchParams.get('branch_code'),
		branches
	);
	const selectedDate = (url.searchParams.get('date') ?? TODAY).trim() || TODAY;
	const selectedTab = normalizeTab(url.searchParams.get('tab'));
	const { fromDate: paymentFromDate, toDate: paymentToDate } = CashboxRepository.normalizeDateRange(
		url.searchParams.get('payments_from'),
		url.searchParams.get('payments_to'),
		selectedDate
	);
	const { fromDate: outflowFromDate, toDate: outflowToDate } = CashboxRepository.normalizeDateRange(
		url.searchParams.get('outflows_from'),
		url.searchParams.get('outflows_to'),
		selectedDate
	);
	const emptySummary = buildEmptySummary(selectedDate, selectedBranchCode, currentUserCode);

	if (!canReadCashbox && !canReadPayments) {
		return {
			title: 'Caja',
			today: TODAY,
			branches,
			selectedBranchCode,
			currentUserName,
			selectedDate,
			selectedTab,
			paymentFromDate,
			paymentToDate,
			outflowFromDate,
			outflowToDate,
			canReadCashbox,
			canReadPayments,
			summary: emptySummary,
			monthlySummary: [],
			monthlyTotals: {
				incomes: 0,
				expenses: 0,
				surrenders: 0,
				closingBalance: 0
			},
			payments: [],
			outflows: []
		};
	}

	if (!selectedBranchCode || !currentUserCode) {
		return {
			title: 'Caja',
			today: TODAY,
			branches,
			selectedBranchCode,
			currentUserName,
			selectedDate,
			selectedTab,
			paymentFromDate,
			paymentToDate,
			outflowFromDate,
			outflowToDate,
			canReadCashbox,
			canReadPayments,
			summary: emptySummary,
			monthlySummary: [],
			monthlyTotals: {
				incomes: 0,
				expenses: 0,
				surrenders: 0,
				closingBalance: 0
			},
			payments: [],
			outflows: []
		};
	}

	const scope = {
		branchCode: selectedBranchCode,
		cashierUserCode: currentUserCode
	};

	const [summary, monthlySummary, monthlyTotals, payments, outflows] = await Promise.all([
		canReadCashbox
			? CashboxRepository.getDailySummary(locals.db, scope, selectedDate)
			: Promise.resolve(emptySummary),
		canReadCashbox
			? CashboxRepository.listDailySummaryByMonth(locals.db, scope, selectedDate)
			: Promise.resolve([]),
		canReadCashbox
			? CashboxRepository.getMonthlyTotals(locals.db, scope, selectedDate)
			: Promise.resolve({
					incomes: 0,
					expenses: 0,
					surrenders: 0,
					closingBalance: 0
				}),
		canReadPayments
			? CashboxRepository.listPayments(locals.db, scope, {
					fromDate: paymentFromDate,
					toDate: paymentToDate
				})
			: Promise.resolve([]),
		canReadCashbox
			? CashboxRepository.listOutflows(locals.db, scope, {
					fromDate: outflowFromDate,
					toDate: outflowToDate
				})
			: Promise.resolve([])
	]);

	return {
		title: 'Caja',
		today: TODAY,
		branches,
		selectedBranchCode,
		currentUserName,
		selectedDate,
		selectedTab,
		paymentFromDate,
		paymentToDate,
		outflowFromDate,
		outflowToDate,
		canReadCashbox,
		canReadPayments,
		summary,
		monthlySummary,
		monthlyTotals,
		payments,
		outflows
	};
};

export const actions: Actions = {
	createPayment: async ({ locals, request }) => {
		if (!(await locals.can('payments:create'))) {
			return fail(403, { error: 'No tienes permisos para registrar ingresos' });
		}

		try {
			const formData = await request.formData();
			const scope = await resolveCashboxScope(locals, readFormField(formData, 'branch_code'));
			const studentCode = readFormField(formData, 'student_code');
			const payerFirstName = readFormField(formData, 'payer_first_name');
			const payerLastName = readFormField(formData, 'payer_last_name');
			const payerDocument = readFormField(formData, 'payer_document');
			const paymentDate = readFormField(formData, 'payment_date');
			const observation = readFormField(formData, 'observation');
			const itemsJson = readFormField(formData, 'items_json');

			if (studentCode && !isUuid(studentCode)) {
				return fail(400, { error: 'El alumno seleccionado no es válido' });
			}

			const createdPayment = await CashboxRepository.createPayment(locals.db, scope, {
				studentCode: studentCode || null,
				payerFirstName,
				payerLastName,
				payerDocument,
				paymentDate,
				observation,
				items: parsePaymentItems(itemsJson),
				registeredByUserCode: locals.user?.code ?? ''
			});

			return {
				success: true,
				type: 'success',
				paymentCode: createdPayment.code,
				paymentNumber: createdPayment.payment_number
			};
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'No se pudo registrar el ingreso';
			return fail(400, { error: message });
		}
	},

	voidPayment: async ({ locals, request }) => {
		if (!(await locals.can('payments:update'))) {
			return fail(403, { error: 'No tienes permisos para anular ingresos' });
		}

		const formData = await request.formData();
		const paymentCode = readFormField(formData, 'code');

		if (!paymentCode || !isUuid(paymentCode)) {
			return fail(400, { error: 'El ingreso seleccionado no es válido' });
		}

		try {
			const scope = await resolveCashboxScope(locals, readFormField(formData, 'branch_code'));
			const updated = await CashboxRepository.voidPayment(
				locals.db,
				scope,
				paymentCode,
				locals.user?.code ?? ''
			);

			if (!updated) {
				return fail(404, { error: 'El ingreso no fue encontrado' });
			}

			return { success: true, type: 'success' };
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'No se pudo anular el ingreso';
			return fail(400, { error: message });
		}
	},

	createOutflow: async ({ locals, request }) => {
		if (!(await locals.can('cashbox:create'))) {
			return fail(403, { error: 'No tienes permisos para registrar egresos de caja' });
		}

		try {
			const formData = await request.formData();
			const scope = await resolveCashboxScope(locals, readFormField(formData, 'branch_code'));
			const outflowType = readFormField(formData, 'outflow_type');
			const outflowDate = readFormField(formData, 'outflow_date');
			const concept = readFormField(formData, 'concept');
			const description = readFormField(formData, 'description');
			const amount = readFormField(formData, 'amount');
			const responsibleName = readFormField(formData, 'responsible_name');

			await CashboxRepository.createOutflow(locals.db, scope, {
				outflowType: outflowType as 'expense' | 'surrender',
				outflowDate,
				concept,
				description,
				amount,
				responsibleName,
				registeredByUserCode: locals.user?.code ?? ''
			});

			return { success: true, type: 'success' };
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'No se pudo registrar el egreso';
			return fail(400, { error: message });
		}
	},

	deleteOutflow: async ({ locals, request }) => {
		if (!(await locals.can('cashbox:delete'))) {
			return fail(403, { error: 'No tienes permisos para eliminar egresos de caja' });
		}

		const formData = await request.formData();
		const outflowCode = readFormField(formData, 'code');

		if (!outflowCode || !isUuid(outflowCode)) {
			return fail(400, { error: 'El egreso seleccionado no es válido' });
		}

		try {
			const scope = await resolveCashboxScope(locals, readFormField(formData, 'branch_code'));
			const deleted = await CashboxRepository.deleteOutflow(
				locals.db,
				scope,
				outflowCode,
				locals.user?.code ?? ''
			);

			if (!deleted) {
				return fail(404, { error: 'El egreso no fue encontrado' });
			}

			return { success: true, type: 'success' };
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'No se pudo eliminar el egreso';
			return fail(400, { error: message });
		}
	},

	setOpening: async ({ locals, request }) => {
		const [canCreateCashbox, canUpdateCashbox] = await Promise.all([
			locals.can('cashbox:create'),
			locals.can('cashbox:update')
		]);

		if (!hasCashboxWritePermission(canCreateCashbox, canUpdateCashbox)) {
			return fail(403, { error: 'No tienes permisos para registrar apertura de caja' });
		}

		try {
			const formData = await request.formData();
			const scope = await resolveCashboxScope(locals, readFormField(formData, 'branch_code'));
			const businessDate = readFormField(formData, 'business_date');
			const amount = readFormField(formData, 'amount');
			const notes = readFormField(formData, 'notes');

			await CashboxRepository.setDayOpening(locals.db, scope, {
				businessDate,
				amount,
				notes,
				userCode: locals.user?.code ?? ''
			});

			return { success: true, type: 'success' };
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'No se pudo registrar la apertura';
			return fail(400, { error: message });
		}
	},

	setClosing: async ({ locals, request }) => {
		const [canCreateCashbox, canUpdateCashbox] = await Promise.all([
			locals.can('cashbox:create'),
			locals.can('cashbox:update')
		]);

		if (!hasCashboxWritePermission(canCreateCashbox, canUpdateCashbox)) {
			return fail(403, { error: 'No tienes permisos para registrar cierre de caja' });
		}

		try {
			const formData = await request.formData();
			const scope = await resolveCashboxScope(locals, readFormField(formData, 'branch_code'));
			const businessDate = readFormField(formData, 'business_date');
			const amount = readFormField(formData, 'amount');
			const notes = readFormField(formData, 'notes');

			await CashboxRepository.setDayClosing(locals.db, scope, {
				businessDate,
				amount,
				notes,
				userCode: locals.user?.code ?? ''
			});

			return { success: true, type: 'success' };
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'No se pudo registrar el cierre';
			return fail(400, { error: message });
		}
	}
};
