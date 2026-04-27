import { sql, type Kysely, type Transaction } from 'kysely';
import type { DB, Database } from '$lib/database';
import type {
	CashOutflowOverview,
	CashOutflowType,
	CashboxDailySummary,
	PaymentConceptCode,
	PaymentItem,
	PaymentOverview
} from '$lib/types/finance';
import { formatLocalDateValue } from '$lib/utils/attendance';
import { isUuid } from '$lib/utils/validation';

interface PaymentItemInput {
	conceptCode: PaymentConceptCode;
	conceptLabel: string;
	detail?: string | null;
	amount: number | string;
}

interface CreatePaymentInput {
	studentCode?: string | null;
	payerFullName?: string | null;
	paymentDate?: string | null;
	observation?: string | null;
	items: PaymentItemInput[];
	registeredByUserCode: string;
}

interface CashboxScope {
	branchCode: string;
	cashierUserCode: string;
}

interface CreateOutflowInput {
	outflowType: CashOutflowType;
	outflowDate?: string | null;
	concept: string;
	description?: string | null;
	amount: number | string;
	responsibleName?: string | null;
	registeredByUserCode: string;
}

interface SetCashboxDayInput {
	businessDate?: string | null;
	amount: number | string;
	notes?: string | null;
	userCode: string;
}

interface MovementInput {
	branchCode: string;
	cashierUserCode: string;
	businessDate: string;
	movementType: 'payment' | 'expense' | 'surrender' | 'outflow_return';
	sourceType: 'payment' | 'outflow';
	sourceCode: string;
	direction: 'in' | 'out';
	amount: number;
	note: string | null;
	registeredByUserCode: string;
}

interface StudentSnapshot {
	code: string;
	first_name: string;
	last_name: string;
	dni: string | null;
}

interface CashboxDayControl {
	code: string;
	business_date: Date;
	opening_amount: string | number;
	closing_amount: string | number | null;
	notes: string | null;
	closed_at: Date | null;
}

type DatabaseExecutor = Kysely<DB> | Transaction<DB>;

const VALID_PAYMENT_CONCEPTS = new Set<PaymentConceptCode>([
	'enrollment',
	'monthly_fee',
	'first_installment',
	'second_installment',
	'initial_fee',
	'other'
]);

const VALID_OUTFLOW_TYPES = new Set<CashOutflowType>(['expense', 'surrender']);

function toNumber(value: number | string | bigint | null | undefined): number {
	if (typeof value === 'bigint') return Number(value);
	if (typeof value === 'number') return value;
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeNullableText(value: string | null | undefined): string | null {
	const normalized = value?.trim() ?? '';
	return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredText(value: string | null | undefined, message: string): string {
	const normalized = value?.trim() ?? '';
	if (!normalized) {
		throw new Error(message);
	}
	return normalized;
}

function normalizeDateValue(
	value: string | null | undefined,
	fallback = formatLocalDateValue()
): string {
	const normalized = value?.trim() ?? fallback;
	return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : fallback;
}

function toDateValue(value: string): Date {
	const [year, month, day] = value.split('-').map((part) => Number(part));
	return new Date(year, month - 1, day);
}

function toDateKey(
	value: Date | string | null | undefined,
	fallback = formatLocalDateValue()
): string {
	if (value instanceof Date) {
		return formatLocalDateValue(value);
	}

	const normalized = String(value ?? '').trim();
	return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : fallback;
}

function normalizePositiveAmount(
	value: number | string | null | undefined,
	message: string
): number {
	const parsed =
		typeof value === 'number' ? value : Number.parseFloat(String(value ?? '').replace(',', '.'));

	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(message);
	}

	return Number(parsed.toFixed(2));
}

function normalizeNonNegativeAmount(
	value: number | string | null | undefined,
	message: string
): number {
	const parsed =
		typeof value === 'number' ? value : Number.parseFloat(String(value ?? '').replace(',', '.'));

	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error(message);
	}

	return Number(parsed.toFixed(2));
}

function startOfMonth(dateValue: string): string {
	return `${dateValue.slice(0, 8)}01`;
}

function endOfMonth(dateValue: string): string {
	const date = new Date(`${dateValue}T00:00:00`);
	const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
	return formatLocalDateValue(monthEnd);
}

function normalizeDateRange(
	fromDate: string | null | undefined,
	toDate: string | null | undefined,
	fallbackDate = formatLocalDateValue()
): { fromDate: string; toDate: string } {
	let normalizedFrom = normalizeDateValue(fromDate, startOfMonth(fallbackDate));
	let normalizedTo = normalizeDateValue(toDate, fallbackDate);

	if (normalizedFrom > normalizedTo) {
		[normalizedFrom, normalizedTo] = [normalizedTo, normalizedFrom];
	}

	return {
		fromDate: normalizedFrom,
		toDate: normalizedTo
	};
}

async function findStudentSnapshot(
	db: DatabaseExecutor,
	studentCode: string
): Promise<StudentSnapshot> {
	if (!isUuid(studentCode)) {
		throw new Error('El alumno seleccionado no es válido');
	}

	const student = await db
		.selectFrom('students')
		.select(['code', 'first_name', 'last_name', 'dni'])
		.where('code', '=', studentCode)
		.executeTakeFirst();

	if (!student) {
		throw new Error('El alumno seleccionado no existe');
	}

	return student;
}

async function registerMovement(db: DatabaseExecutor, input: MovementInput): Promise<void> {
	await db
		.insertInto('cashbox_movements')
		.values({
			branch_code: input.branchCode,
			cashier_user_code: input.cashierUserCode,
			business_date: input.businessDate,
			movement_type: input.movementType,
			source_type: input.sourceType,
			source_code: input.sourceCode,
			direction: input.direction,
			amount: input.amount,
			note: input.note,
			registered_by_user_code: input.registeredByUserCode
		})
		.execute();
}

async function reverseMovement(
	db: DatabaseExecutor,
	sourceType: 'payment' | 'outflow',
	sourceCode: string,
	userCode: string
): Promise<void> {
	const result = await db
		.updateTable('cashbox_movements')
		.set({
			status: 'reversed',
			reversed_at: new Date(),
			reversed_by_user_code: userCode
		})
		.where('source_type', '=', sourceType)
		.where('source_code', '=', sourceCode)
		.where('status', '=', 'active')
		.executeTakeFirst();

	if (Number(result.numUpdatedRows ?? 0) === 0) {
		throw new Error('No se encontró un movimiento activo de caja para revertir');
	}
}

async function findCashboxDay(
	db: DatabaseExecutor,
	scope: CashboxScope,
	businessDate: string
): Promise<CashboxDayControl | null> {
	const businessDateValue = toDateValue(businessDate);

	const day = await db
		.selectFrom('cashbox_days')
		.select(['code', 'business_date', 'opening_amount', 'closing_amount', 'notes', 'closed_at'])
		.where('branch_code', '=', scope.branchCode)
		.where('cashier_user_code', '=', scope.cashierUserCode)
		.where('business_date', '=', businessDateValue)
		.executeTakeFirst();

	return (day as unknown as CashboxDayControl | undefined) ?? null;
}

async function countDayMovements(
	db: DatabaseExecutor,
	scope: CashboxScope,
	businessDate: string
): Promise<number> {
	const businessDateValue = toDateValue(businessDate);

	const result = await db
		.selectFrom('cashbox_movements')
		.select((eb) => eb.fn.count('code').as('movement_count'))
		.where('branch_code', '=', scope.branchCode)
		.where('cashier_user_code', '=', scope.cashierUserCode)
		.where('business_date', '=', businessDateValue)
		.executeTakeFirst();

	return toNumber(result?.movement_count);
}

async function assertMovementsAllowed(
	db: DatabaseExecutor,
	scope: CashboxScope,
	businessDate: string
): Promise<void> {
	const day = await findCashboxDay(db, scope, businessDate);

	if (!day) {
		throw new Error('Debes registrar la apertura de caja antes de crear ingresos o egresos');
	}

	if (day.closed_at) {
		throw new Error('La caja del día ya está cerrada y no admite más movimientos');
	}
}

async function assertDayNotClosed(
	db: DatabaseExecutor,
	scope: CashboxScope,
	businessDate: string
): Promise<void> {
	const day = await findCashboxDay(db, scope, businessDate);

	if (day?.closed_at) {
		throw new Error('La caja del día ya está cerrada y no admite más movimientos');
	}
}

function normalizePaymentItems(items: PaymentItemInput[]): PaymentItemInput[] {
	if (items.length === 0) {
		throw new Error('Debes agregar al menos un concepto de cobro');
	}

	return items.map((item) => {
		if (!VALID_PAYMENT_CONCEPTS.has(item.conceptCode)) {
			throw new Error('Uno de los conceptos del pago no es válido');
		}

		return {
			conceptCode: item.conceptCode,
			conceptLabel: normalizeRequiredText(
				item.conceptLabel,
				'Cada concepto debe tener una etiqueta'
			),
			detail: normalizeNullableText(item.detail),
			amount: normalizePositiveAmount(item.amount, 'Cada concepto debe tener un monto válido')
		};
	});
}

function emptyDailySummary(scope: CashboxScope, businessDate: string): CashboxDailySummary {
	return {
		business_date: businessDate,
		branch_code: scope.branchCode,
		branch_name: null,
		cashier_user_code: scope.cashierUserCode,
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

export class CashboxRepository {
	static normalizeDateRange = normalizeDateRange;

	static async getDailySummary(
		db: Database,
		scope: CashboxScope,
		businessDate: string
	): Promise<CashboxDailySummary> {
		const normalizedDate = normalizeDateValue(businessDate);
		const businessDateValue = toDateValue(normalizedDate);
		const summary = await db
			.selectFrom('cashbox_daily_summary')
			.selectAll()
			.where('branch_code', '=', scope.branchCode)
			.where('cashier_user_code', '=', scope.cashierUserCode)
			.where('business_date', '=', businessDateValue)
			.executeTakeFirst();

		if (!summary) {
			return emptyDailySummary(scope, normalizedDate);
		}

		return summary as unknown as CashboxDailySummary;
	}

	static async listDailySummaryByMonth(
		db: Database,
		scope: CashboxScope,
		referenceDate: string
	): Promise<CashboxDailySummary[]> {
		const normalizedDate = normalizeDateValue(referenceDate);
		const monthStart = toDateValue(startOfMonth(normalizedDate));
		const monthEnd = toDateValue(endOfMonth(normalizedDate));
		const rows = await db
			.selectFrom('cashbox_daily_summary')
			.selectAll()
			.where('branch_code', '=', scope.branchCode)
			.where('cashier_user_code', '=', scope.cashierUserCode)
			.where('business_date', '>=', monthStart)
			.where('business_date', '<=', monthEnd)
			.orderBy('business_date', 'desc')
			.execute();

		return rows as unknown as CashboxDailySummary[];
	}

	static async listPayments(
		db: Database,
		scope: CashboxScope,
		filters: { fromDate?: string | null; toDate?: string | null }
	): Promise<PaymentOverview[]> {
		const { fromDate, toDate } = normalizeDateRange(filters.fromDate, filters.toDate);
		const fromDateValue = toDateValue(fromDate);
		const toDateValueResult = toDateValue(toDate);
		const rows = await db
			.selectFrom('payment_overview')
			.selectAll()
			.where('branch_code', '=', scope.branchCode)
			.where('cashier_user_code', '=', scope.cashierUserCode)
			.where('payment_date', '>=', fromDateValue)
			.where('payment_date', '<=', toDateValueResult)
			.orderBy('payment_date', 'desc')
			.orderBy('created_at', 'desc')
			.execute();

		return rows as unknown as PaymentOverview[];
	}

	static async listPaymentsByStudent(
		db: Database,
		studentCode: string,
		filters: Partial<CashboxScope> = {}
	): Promise<PaymentOverview[]> {
		if (!isUuid(studentCode)) {
			return [];
		}

		let query = db
			.selectFrom('payment_overview')
			.selectAll()
			.where('student_code', '=', studentCode)
			.orderBy('payment_date', 'desc')
			.orderBy('created_at', 'desc');

		if (filters.branchCode) {
			query = query.where('branch_code', '=', filters.branchCode);
		}

		if (filters.cashierUserCode) {
			query = query.where('cashier_user_code', '=', filters.cashierUserCode);
		}

		const rows = await query.execute();

		return rows as unknown as PaymentOverview[];
	}

	static async listPaymentItems(db: Database, paymentCode: string): Promise<PaymentItem[]> {
		if (!isUuid(paymentCode)) {
			return [];
		}

		const rows = await db
			.selectFrom('payment_items')
			.selectAll()
			.where('payment_code', '=', paymentCode)
			.orderBy('position', 'asc')
			.execute();

		return rows as unknown as PaymentItem[];
	}

	static async listOutflows(
		db: Database,
		scope: CashboxScope,
		filters: { fromDate?: string | null; toDate?: string | null }
	): Promise<CashOutflowOverview[]> {
		const { fromDate, toDate } = normalizeDateRange(filters.fromDate, filters.toDate);
		const fromDateValue = toDateValue(fromDate);
		const toDateValueResult = toDateValue(toDate);
		const rows = await db
			.selectFrom('cash_outflow_overview')
			.selectAll()
			.where('branch_code', '=', scope.branchCode)
			.where('cashier_user_code', '=', scope.cashierUserCode)
			.where('outflow_date', '>=', fromDateValue)
			.where('outflow_date', '<=', toDateValueResult)
			.orderBy('outflow_date', 'desc')
			.orderBy('created_at', 'desc')
			.execute();

		return rows as unknown as CashOutflowOverview[];
	}

	static async findPaymentByCode(
		db: Database,
		paymentCode: string
	): Promise<(PaymentOverview & { items: PaymentItem[] }) | null> {
		if (!isUuid(paymentCode)) {
			return null;
		}

		const payment = await db
			.selectFrom('payment_overview')
			.selectAll()
			.where('code', '=', paymentCode)
			.executeTakeFirst();

		if (!payment) {
			return null;
		}

		const items = await CashboxRepository.listPaymentItems(db, paymentCode);

		return {
			...(payment as unknown as PaymentOverview),
			items
		};
	}

	static async createPayment(
		db: Database,
		scope: CashboxScope,
		input: CreatePaymentInput
	): Promise<{ code: string; payment_number: string; total_amount: number }> {
		const paymentDate = normalizeDateValue(input.paymentDate);
		const observation = normalizeNullableText(input.observation);
		const items = normalizePaymentItems(input.items);
		const totalAmount = Number(
			items.reduce((sum, item) => sum + toNumber(item.amount), 0).toFixed(2)
		);

		return db.transaction().execute(async (trx) => {
			await assertMovementsAllowed(trx, scope, paymentDate);

			let studentCode: string | null = null;
			let payerFullName: string;

			if (input.studentCode) {
				const student = await findStudentSnapshot(trx, input.studentCode);
				studentCode = student.code;
				payerFullName = `${student.first_name} ${student.last_name}`.trim();
			} else {
				payerFullName = normalizeRequiredText(
					input.payerFullName,
					'Debes registrar el nombre del pagador'
				);
			}

			const createdPayment = await trx
				.insertInto('payments')
				.values({
					branch_code: scope.branchCode,
					cashier_user_code: scope.cashierUserCode,
					student_code: studentCode,
					payer_full_name: payerFullName,
					payment_date: paymentDate,
					observation,
					total_amount: totalAmount,
					registered_by_user_code: input.registeredByUserCode
				})
				.returning(['code', 'payment_number'])
				.executeTakeFirstOrThrow();

			await trx
				.insertInto('payment_items')
				.values(
					items.map((item, index) => ({
						payment_code: createdPayment.code,
						position: index + 1,
						concept_code: item.conceptCode,
						concept_label: item.conceptLabel,
						detail: item.detail ?? null,
						amount: toNumber(item.amount)
					}))
				)
				.execute();

			await registerMovement(trx, {
				branchCode: scope.branchCode,
				cashierUserCode: scope.cashierUserCode,
				businessDate: paymentDate,
				movementType: 'payment',
				sourceType: 'payment',
				sourceCode: createdPayment.code,
				direction: 'in',
				amount: totalAmount,
				note: observation,
				registeredByUserCode: input.registeredByUserCode
			});

			return {
				code: createdPayment.code,
				payment_number: createdPayment.payment_number,
				total_amount: totalAmount
			};
		});
	}

	static async voidPayment(
		db: Database,
		scope: CashboxScope,
		paymentCode: string,
		userCode: string
	): Promise<boolean> {
		if (!isUuid(paymentCode)) {
			return false;
		}

		return db.transaction().execute(async (trx) => {
			const payment = await trx
				.selectFrom('payments')
				.select(['code', 'status', 'payment_date'])
				.where('code', '=', paymentCode)
				.where('branch_code', '=', scope.branchCode)
				.where('cashier_user_code', '=', scope.cashierUserCode)
				.executeTakeFirst();

			if (!payment) {
				return false;
			}

			if (payment.status === 'voided') {
				throw new Error('El ingreso seleccionado ya está anulado');
			}

			await assertDayNotClosed(trx, scope, toDateKey(payment.payment_date));

			await trx
				.updateTable('payments')
				.set({
					status: 'voided',
					voided_at: new Date(),
					voided_by_user_code: userCode
				})
				.where('code', '=', paymentCode)
				.where('branch_code', '=', scope.branchCode)
				.where('cashier_user_code', '=', scope.cashierUserCode)
				.execute();

			await reverseMovement(trx, 'payment', paymentCode, userCode);

			return true;
		});
	}

	static async createOutflow(
		db: Database,
		scope: CashboxScope,
		input: CreateOutflowInput
	): Promise<{ code: string; outflow_number: string; amount: number }> {
		if (!VALID_OUTFLOW_TYPES.has(input.outflowType)) {
			throw new Error('El tipo de salida no es válido');
		}

		const outflowDate = normalizeDateValue(input.outflowDate);
		const concept = normalizeRequiredText(input.concept, 'El concepto del egreso es obligatorio');
		const description = normalizeNullableText(input.description);
		const responsibleName = normalizeNullableText(input.responsibleName);
		const amount = normalizePositiveAmount(input.amount, 'El monto debe ser mayor a 0');

		return db.transaction().execute(async (trx) => {
			await assertMovementsAllowed(trx, scope, outflowDate);

			const createdOutflow = await trx
				.insertInto('cash_outflows')
				.values({
					branch_code: scope.branchCode,
					cashier_user_code: scope.cashierUserCode,
					outflow_type: input.outflowType,
					outflow_date: outflowDate,
					concept,
					description,
					amount,
					responsible_name: responsibleName,
					registered_by_user_code: input.registeredByUserCode
				})
				.returning(['code', 'outflow_number'])
				.executeTakeFirstOrThrow();

			await registerMovement(trx, {
				branchCode: scope.branchCode,
				cashierUserCode: scope.cashierUserCode,
				businessDate: outflowDate,
				movementType: input.outflowType,
				sourceType: 'outflow',
				sourceCode: createdOutflow.code,
				direction: 'out',
				amount,
				note: description ?? concept,
				registeredByUserCode: input.registeredByUserCode
			});

			return {
				code: createdOutflow.code,
				outflow_number: createdOutflow.outflow_number,
				amount
			};
		});
	}

	static async deleteOutflow(
		db: Database,
		scope: CashboxScope,
		outflowCode: string,
		userCode: string
	): Promise<boolean> {
		if (!isUuid(outflowCode)) {
			return false;
		}

		return db.transaction().execute(async (trx) => {
			const outflow = await trx
				.selectFrom('cash_outflows')
				.select(['code', 'status', 'outflow_date'])
				.where('code', '=', outflowCode)
				.where('branch_code', '=', scope.branchCode)
				.where('cashier_user_code', '=', scope.cashierUserCode)
				.executeTakeFirst();

			if (!outflow) {
				return false;
			}

			if (outflow.status === 'deleted') {
				throw new Error('El egreso seleccionado ya fue eliminado');
			}

			await assertDayNotClosed(trx, scope, toDateKey(outflow.outflow_date));

			await trx
				.updateTable('cash_outflows')
				.set({
					status: 'deleted',
					deleted_at: new Date(),
					deleted_by_user_code: userCode
				})
				.where('code', '=', outflowCode)
				.where('branch_code', '=', scope.branchCode)
				.where('cashier_user_code', '=', scope.cashierUserCode)
				.execute();

			await reverseMovement(trx, 'outflow', outflowCode, userCode);

			return true;
		});
	}

	static async createOutflowReturn(
		db: Database,
		scope: CashboxScope,
		input: {
			outflowCode: string;
			returnDate?: string | null;
			amount: number | string;
			returnedByName?: string | null;
			note?: string | null;
			registeredByUserCode: string;
		}
	): Promise<void> {
		if (!isUuid(input.outflowCode)) {
			throw new Error('El egreso seleccionado no es válido');
		}

		const returnDate = normalizeDateValue(input.returnDate);
		const amount = normalizePositiveAmount(input.amount, 'El monto del vuelto debe ser mayor a 0');
		const returnedByName = normalizeNullableText(input.returnedByName);
		const note = normalizeNullableText(input.note);

		await db.transaction().execute(async (trx) => {
			await assertMovementsAllowed(trx, scope, returnDate);

			const outflow = await trx
				.selectFrom('cash_outflows')
				.select(['code', 'status', 'amount', 'returned_amount', 'outflow_number'])
				.where('code', '=', input.outflowCode)
				.where('branch_code', '=', scope.branchCode)
				.where('cashier_user_code', '=', scope.cashierUserCode)
				.executeTakeFirst();

			if (!outflow) {
				throw new Error('El egreso seleccionado no existe');
			}

			if (outflow.status !== 'posted') {
				throw new Error('El egreso seleccionado no admite devoluciones');
			}

			const outflowAmount = toNumber(outflow.amount);
			const returnedAmount = toNumber(outflow.returned_amount);
			const pendingAmount = Number((outflowAmount - returnedAmount).toFixed(2));

			if (pendingAmount <= 0) {
				throw new Error('Este egreso ya no tiene monto pendiente por devolver');
			}

			if (amount > pendingAmount + 0.00001) {
				throw new Error('El monto del vuelto no puede ser mayor al pendiente del egreso');
			}

			const result = await trx
				.updateTable('cash_outflows')
				.set((eb) => ({
					returned_amount: sql<number>`${eb.ref('returned_amount')} + ${amount}`,
					returned_at: new Date(),
					returned_by_name: returnedByName,
					return_note: note,
					returned_by_user_code: input.registeredByUserCode
				}))
				.where('code', '=', input.outflowCode)
				.where('branch_code', '=', scope.branchCode)
				.where('cashier_user_code', '=', scope.cashierUserCode)
				.where('status', '=', 'posted')
				.executeTakeFirst();

			if (Number(result.numUpdatedRows ?? 0) === 0) {
				throw new Error('No se pudo actualizar el egreso para registrar el vuelto');
			}

			await registerMovement(trx, {
				branchCode: scope.branchCode,
				cashierUserCode: scope.cashierUserCode,
				businessDate: returnDate,
				movementType: 'outflow_return',
				sourceType: 'outflow',
				sourceCode: input.outflowCode,
				direction: 'in',
				amount,
				note: note ?? `Vuelto ${outflow.outflow_number}`,
				registeredByUserCode: input.registeredByUserCode
			});
		});
	}

	static async setDayOpening(
		db: Database,
		scope: CashboxScope,
		input: SetCashboxDayInput
	): Promise<void> {
		const businessDate = normalizeDateValue(input.businessDate);
		const amount = normalizeNonNegativeAmount(input.amount, 'El monto de apertura debe ser válido');
		const notes = normalizeNullableText(input.notes);

		await db.transaction().execute(async (trx) => {
			const [existingDay, movementCount] = await Promise.all([
				findCashboxDay(trx, scope, businessDate),
				countDayMovements(trx, scope, businessDate)
			]);

			if (existingDay?.closed_at) {
				throw new Error('La caja del día ya está cerrada y no permite actualizar la apertura');
			}

			if (movementCount > 0) {
				throw new Error('La apertura solo puede definirse antes de registrar movimientos');
			}

			await trx
				.insertInto('cashbox_days')
				.values({
					branch_code: scope.branchCode,
					cashier_user_code: scope.cashierUserCode,
					business_date: businessDate,
					opening_amount: amount,
					notes,
					opened_by_user_code: input.userCode
				})
				.onConflict((oc) =>
					oc.columns(['business_date', 'branch_code', 'cashier_user_code']).doUpdateSet({
						opening_amount: amount,
						notes,
						opened_by_user_code: input.userCode
					})
				)
				.execute();
		});
	}

	static async setDayClosing(
		db: Database,
		scope: CashboxScope,
		input: SetCashboxDayInput
	): Promise<void> {
		const businessDate = normalizeDateValue(input.businessDate);
		const notes = normalizeNullableText(input.notes);

		await db.transaction().execute(async (trx) => {
			const day = await findCashboxDay(trx, scope, businessDate);

			if (!day) {
				throw new Error('Debes registrar la apertura de caja antes de cerrar el día');
			}

			if (day.closed_at) {
				throw new Error('La caja del día ya está cerrada');
			}

			const summary = await CashboxRepository.getDailySummary(
				trx as unknown as Database,
				scope,
				businessDate
			);
			const closingAmount = normalizeNonNegativeAmount(
				summary.current_amount,
				'El monto de cierre calculado no es válido'
			);

			await trx
				.updateTable('cashbox_days')
				.set({
					closing_amount: closingAmount,
					notes,
					closed_by_user_code: input.userCode,
					closed_at: new Date()
				})
				.where('code', '=', day.code)
				.execute();
		});
	}

	static async getMonthlyTotals(
		db: Database,
		scope: CashboxScope,
		referenceDate: string
	): Promise<{ incomes: number; expenses: number; surrenders: number; closingBalance: number }> {
		const normalizedDate = normalizeDateValue(referenceDate);
		const monthStart = toDateValue(startOfMonth(normalizedDate));
		const monthEnd = toDateValue(endOfMonth(normalizedDate));
		const totals = await db
			.selectFrom('cashbox_daily_summary')
			.select((eb) => [
				sql<number>`COALESCE(SUM(${eb.ref('income_amount')}), 0)`.as('incomes'),
				sql<number>`COALESCE(SUM(${eb.ref('expense_amount')}), 0)`.as('expenses'),
				sql<number>`COALESCE(SUM(${eb.ref('surrender_amount')}), 0)`.as('surrenders'),
				sql<number>`COALESCE(SUM(${eb.ref('current_amount')}), 0)`.as('closing_balance')
			])
			.where('branch_code', '=', scope.branchCode)
			.where('cashier_user_code', '=', scope.cashierUserCode)
			.where('business_date', '>=', monthStart)
			.where('business_date', '<=', monthEnd)
			.executeTakeFirst();

		return {
			incomes: toNumber(totals?.incomes),
			expenses: toNumber(totals?.expenses),
			surrenders: toNumber(totals?.surrenders),
			closingBalance: toNumber(totals?.closing_balance)
		};
	}
}
