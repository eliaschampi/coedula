<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		Alert,
		Button,
		Card,
		Chip,
		Dialog,
		EmptyState,
		Input,
		NumberInput,
		PageHeader,
		SegmentedControl,
		Select,
		StatCard,
		Table,
		Tabs,
		Textarea,
		type TableRow
	} from '$lib/components';
	import CashboxDateControl from './CashboxDateControl.svelte';
	import CashboxRangeControl from './CashboxRangeControl.svelte';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import {
		PAYMENT_CONCEPT_OPTIONS,
		formatCashOutflowStatus,
		formatCashOutflowType,
		formatEducationCurrency,
		formatEducationDate,
		formatPaymentConceptLabel,
		formatPaymentStatus,
		getCashOutflowStatusColor,
		getCashOutflowTypeColor,
		getPaymentStatusColor
	} from '$lib/utils';
	import type { CashOutflowType, PaymentConceptCode } from '$lib/types/finance';
	import type { PageData } from './$types';

	type PaymentRow = PageData['payments'][number];
	type OutflowRow = PageData['outflows'][number];
	type MonthlyRow = PageData['monthlySummary'][number];

	interface StudentSearchItem {
		code: string;
		full_name: string;
		student_number: string;
		dni: string | null;
		photo_url: string | null;
		current_cycle_title: string | null;
		current_degree_name: string | null;
	}

	interface PaymentDraftItem {
		id: string;
		conceptCode: PaymentConceptCode;
		conceptLabel: string;
		detail: string;
		amount: number;
	}

	type CashboxTabValue = 'summary' | 'payments' | 'outflows' | 'monthly';

	const { data }: { data: PageData } = $props();

	const MONTH_OPTIONS: Array<{ value: string; label: string }> = [
		{ value: 'Enero', label: 'Enero' },
		{ value: 'Febrero', label: 'Febrero' },
		{ value: 'Marzo', label: 'Marzo' },
		{ value: 'Abril', label: 'Abril' },
		{ value: 'Mayo', label: 'Mayo' },
		{ value: 'Junio', label: 'Junio' },
		{ value: 'Julio', label: 'Julio' },
		{ value: 'Agosto', label: 'Agosto' },
		{ value: 'Septiembre', label: 'Septiembre' },
		{ value: 'Octubre', label: 'Octubre' },
		{ value: 'Noviembre', label: 'Noviembre' },
		{ value: 'Diciembre', label: 'Diciembre' }
	];
	const MONTH_SET = new Set(MONTH_OPTIONS.map((month) => month.value));

	const canReadCashbox = $derived(data.canReadCashbox && can('cashbox:read'));
	const canReadPayments = $derived(data.canReadPayments && can('payments:read'));
	const canCreateCashbox = $derived(can('cashbox:create'));
	const canUpdateCashbox = $derived(can('cashbox:update'));
	const canDeleteCashbox = $derived(can('cashbox:delete'));
	const canCreatePayments = $derived(can('payments:create'));
	const canUpdatePayments = $derived(can('payments:update'));
	const canReadStudents = $derived(can('students:read'));
	const canSearchStudents = $derived(canReadStudents || canCreatePayments || canUpdatePayments);

	const paymentRows = $derived(data.payments as unknown as TableRow[]);
	const outflowRows = $derived(data.outflows as unknown as TableRow[]);
	const monthlyRows = $derived(data.monthlySummary as unknown as TableRow[]);
	const canWriteCashbox = $derived(canCreateCashbox || canUpdateCashbox);
	const workspaceBranch = $derived(
		data.user?.current_branch
			? { code: data.user.current_branch, name: data.user.current_branch_name }
			: null
	);
	const hasOpening = $derived(data.summary.cashbox_day_code !== null);
	const isDayClosed = $derived(Boolean(data.summary.closed_at));
	const canOperateSelectedDate = $derived(hasOpening && !isDayClosed);
	const canOpenSelectedDate = $derived(canWriteCashbox && !isDayClosed);
	const canCloseSelectedDate = $derived(canWriteCashbox && hasOpening && !isDayClosed);
	const canCreatePaymentToday = $derived(canCreatePayments && canOperateSelectedDate);
	const canCreateOutflowToday = $derived(canCreateCashbox && canOperateSelectedDate);

	let activeTab = $state<CashboxTabValue>('summary');
	let selectedDate = $state('');
	let paymentFromDateFilter = $state('');
	let paymentToDateFilter = $state('');
	let outflowFromDateFilter = $state('');
	let outflowToDateFilter = $state('');
	let showPaymentModal = $state(false);
	let showOutflowModal = $state(false);
	let showCashDayModal = $state(false);
	let showVoidPaymentDialog = $state(false);
	let showDeleteOutflowDialog = $state(false);
	let showOutflowReturnDialog = $state(false);

	let paymentErrorMessage = $state('');
	let outflowErrorMessage = $state('');
	let cashDayErrorMessage = $state('');
	let deletePaymentErrorMessage = $state('');
	let deleteOutflowErrorMessage = $state('');
	let outflowReturnErrorMessage = $state('');

	let paymentPayerMode = $state<'student' | 'manual'>('student');
	let paymentDate = $state('');
	let paymentStudentCode = $state('');
	let selectedStudentPreview = $state<StudentSearchItem | null>(null);
	let manualPayerFullName = $state('');
	let paymentObservation = $state('');
	let paymentItems = $state<PaymentDraftItem[]>([]);
	let draftConceptCode = $state<PaymentConceptCode>('monthly_fee');
	let draftCustomConceptLabel = $state('');
	let draftConceptDetail = $state('');
	let draftConceptAmount = $state(0);

	let studentSearchQuery = $state('');
	let studentSearchLoading = $state(false);
	let studentSearchResults = $state<StudentSearchItem[]>([]);

	let outflowType = $state<CashOutflowType>('expense');
	let outflowDate = $state('');
	let outflowConcept = $state('');
	let outflowDescription = $state('');
	let outflowResponsibleName = $state('');
	let outflowAmount = $state(0);

	let cashDayMode = $state<'opening' | 'closing'>('opening');
	let cashDayDate = $state('');
	let cashDayAmount = $state(0);
	let cashDayNotes = $state('');

	let selectedPayment = $state<PaymentRow | null>(null);
	let selectedOutflow = $state<OutflowRow | null>(null);
	let selectedOutflowForReturn = $state<OutflowRow | null>(null);

	let outflowReturnDate = $state('');
	let outflowReturnAmount = $state(0);
	let outflowReturnReturnedByName = $state('');
	let outflowReturnNote = $state('');

	const availableTabs = $derived.by(() => {
		const tabs: Array<{ value: CashboxTabValue; label: string; icon: string }> = [];

		if (canReadCashbox) {
			tabs.push({ value: 'summary', label: 'Resumen', icon: 'wallet' });
		}

		if (canReadPayments) {
			tabs.push({ value: 'payments', label: 'Ingresos', icon: 'creditCard' });
		}

		if (canReadCashbox) {
			tabs.push({ value: 'outflows', label: 'Egresos', icon: 'shoppingBag' });
			tabs.push({ value: 'monthly', label: 'Mensual', icon: 'calendar' });
		}

		return tabs;
	});

	const paymentTotal = $derived(paymentItems.reduce((sum, item) => sum + item.amount, 0));

	const paymentItemsPayload = $derived(
		JSON.stringify(
			paymentItems.map((item) => ({
				conceptCode: item.conceptCode,
				conceptLabel: item.conceptLabel,
				detail: item.detail,
				amount: item.amount
			}))
		)
	);

	$effect(() => {
		activeTab = data.selectedTab;
		selectedDate = data.selectedDate;
		paymentFromDateFilter = data.paymentFromDate;
		paymentToDateFilter = data.paymentToDate;
		outflowFromDateFilter = data.outflowFromDate;
		outflowToDateFilter = data.outflowToDate;
	});

	$effect(() => {
		if (!availableTabs.some((tab) => tab.value === activeTab)) {
			activeTab = availableTabs[0]?.value ?? 'summary';
		}
	});

	$effect(() => {
		if (!paymentDate) {
			paymentDate = data.selectedDate;
		}

		if (!outflowDate) {
			outflowDate = data.selectedDate;
		}

		if (!cashDayDate) {
			cashDayDate = data.selectedDate;
		}
	});

	$effect(() => {
		if (
			!showPaymentModal ||
			paymentPayerMode !== 'student' ||
			!canSearchStudents ||
			studentSearchQuery.trim().length < 2
		) {
			studentSearchLoading = false;
			if (studentSearchQuery.trim().length === 0) {
				studentSearchResults = [];
			}
			return;
		}

		let cancelled = false;
		studentSearchLoading = true;

		const timer = window.setTimeout(async () => {
			try {
				const response = await fetch(
					`/api/students/search?context=payments&q=${encodeURIComponent(studentSearchQuery)}`
				);
				const payload = (await response.json()) as {
					items?: StudentSearchItem[];
					message?: string;
				};

				if (!response.ok) {
					throw new Error(payload.message || 'No se pudo buscar alumnos');
				}

				if (!cancelled) {
					studentSearchResults = payload.items ?? [];
				}
			} catch (caught) {
				if (!cancelled) {
					showToast(
						caught instanceof Error ? caught.message : 'No se pudo buscar alumnos',
						'error'
					);
					studentSearchResults = [];
				}
			} finally {
				if (!cancelled) {
					studentSearchLoading = false;
				}
			}
		}, 180);

		return () => {
			cancelled = true;
			window.clearTimeout(timer);
		};
	});

	function getActionError(result: { data?: Record<string, unknown> }): string | null {
		const error = result.data?.error;
		return typeof error === 'string' && error.length > 0 ? error : null;
	}

	function submitForm(formId: string): void {
		const form = document.getElementById(formId);
		if (form instanceof HTMLFormElement) {
			form.requestSubmit();
		}
	}

	function resetPaymentForm(): void {
		paymentErrorMessage = '';
		paymentPayerMode = 'student';
		paymentDate = data.selectedDate;
		paymentStudentCode = '';
		selectedStudentPreview = null;
		manualPayerFullName = '';
		paymentObservation = '';
		paymentItems = [];
		draftConceptCode = 'monthly_fee';
		draftCustomConceptLabel = '';
		draftConceptDetail = '';
		draftConceptAmount = 0;
		studentSearchQuery = '';
		studentSearchResults = [];
	}

	function resetOutflowForm(): void {
		outflowErrorMessage = '';
		outflowType = 'expense';
		outflowDate = data.selectedDate;
		outflowConcept = '';
		outflowDescription = '';
		outflowResponsibleName = '';
		outflowAmount = 0;
	}

	function resetCashDayForm(mode: 'opening' | 'closing'): void {
		cashDayMode = mode;
		cashDayErrorMessage = '';
		cashDayDate = data.selectedDate;
		cashDayAmount =
			mode === 'opening'
				? Number(data.summary.opening_amount ?? 0)
				: Number(data.summary.closing_amount ?? data.summary.current_amount ?? 0);
		cashDayNotes = data.summary.notes ?? '';
	}

	function openPaymentModal(): void {
		if (!canCreatePaymentToday) return;
		resetPaymentForm();
		showPaymentModal = true;
	}

	function openOutflowModal(type: CashOutflowType = 'expense'): void {
		if (!canCreateOutflowToday) return;
		resetOutflowForm();
		outflowType = type;
		showOutflowModal = true;
	}

	function openCashDayModal(mode: 'opening' | 'closing'): void {
		if (
			(mode === 'opening' && !canOpenSelectedDate) ||
			(mode === 'closing' && !canCloseSelectedDate)
		) {
			return;
		}
		resetCashDayForm(mode);
		showCashDayModal = true;
	}

	function openVoidPaymentDialog(payment: PaymentRow): void {
		if (!canUpdatePayments) return;
		deletePaymentErrorMessage = '';
		selectedPayment = payment;
		showVoidPaymentDialog = true;
	}

	function openDeleteOutflowDialog(outflow: OutflowRow): void {
		if (!canDeleteCashbox) return;
		deleteOutflowErrorMessage = '';
		selectedOutflow = outflow;
		showDeleteOutflowDialog = true;
	}

	function resetOutflowReturnForm(outflow: OutflowRow): void {
		outflowReturnErrorMessage = '';
		selectedOutflowForReturn = outflow;
		outflowReturnDate = data.selectedDate;
		outflowReturnAmount = 0;
		outflowReturnReturnedByName = outflow.responsible_name ?? '';
		outflowReturnNote = '';
	}

	function openOutflowReturnDialog(outflow: OutflowRow): void {
		if (!canWriteCashbox) return;
		if (outflow.status === 'deleted') return;
		const pending = Number(outflow.pending_amount ?? 0);
		if (pending <= 0) return;
		resetOutflowReturnForm(outflow);
		showOutflowReturnDialog = true;
	}

	function closePaymentModal(): void {
		showPaymentModal = false;
		paymentErrorMessage = '';
	}

	function closeOutflowModal(): void {
		showOutflowModal = false;
		outflowErrorMessage = '';
	}

	function closeCashDayModal(): void {
		showCashDayModal = false;
		cashDayErrorMessage = '';
	}

	function closeVoidPaymentDialog(): void {
		showVoidPaymentDialog = false;
		deletePaymentErrorMessage = '';
		selectedPayment = null;
	}

	function closeDeleteOutflowDialog(): void {
		showDeleteOutflowDialog = false;
		deleteOutflowErrorMessage = '';
		selectedOutflow = null;
	}

	function closeOutflowReturnDialog(): void {
		showOutflowReturnDialog = false;
		outflowReturnErrorMessage = '';
		selectedOutflowForReturn = null;
	}

	function updateQuery(updates: Record<string, string | null>): void {
		const params = new SvelteURLSearchParams(page.url.searchParams);

		Object.entries(updates).forEach(([key, value]) => {
			if (value) {
				params.set(key, value);
				return;
			}

			params.delete(key);
		});

		const search = params.toString();
		void goto(resolve(`${page.url.pathname}${search ? `?${search}` : ''}` as '/'), {
			keepFocus: true,
			noScroll: true
		});
	}

	function applySelectedDate(targetTab: CashboxTabValue): void {
		updateQuery({
			date: selectedDate || data.today,
			tab: targetTab
		});
	}

	function resetSelectedDate(targetTab: CashboxTabValue): void {
		selectedDate = data.today;
		updateQuery({
			date: data.today,
			tab: targetTab
		});
	}

	function applyPaymentRange(): void {
		updateQuery({
			payments_from: paymentFromDateFilter || null,
			payments_to: paymentToDateFilter || null,
			tab: 'payments'
		});
	}

	function resetPaymentRange(): void {
		paymentFromDateFilter = data.selectedDate;
		paymentToDateFilter = data.selectedDate;
		updateQuery({
			payments_from: null,
			payments_to: null,
			tab: 'payments'
		});
	}

	function applyOutflowRange(): void {
		updateQuery({
			outflows_from: outflowFromDateFilter || null,
			outflows_to: outflowToDateFilter || null,
			tab: 'outflows'
		});
	}

	function resetOutflowRange(): void {
		outflowFromDateFilter = data.selectedDate;
		outflowToDateFilter = data.selectedDate;
		updateQuery({
			outflows_from: null,
			outflows_to: null,
			tab: 'outflows'
		});
	}

	function handlePayerModeChange(value: string | number): void {
		paymentPayerMode = value === 'manual' ? 'manual' : 'student';
		if (paymentPayerMode === 'manual') {
			paymentStudentCode = '';
			selectedStudentPreview = null;
			studentSearchQuery = '';
			studentSearchResults = [];
		}
	}

	function selectStudent(student: StudentSearchItem): void {
		paymentStudentCode = student.code;
		selectedStudentPreview = student;
		studentSearchQuery = '';
		studentSearchResults = [];
		studentSearchLoading = false;
	}

	function removeSelectedStudent(): void {
		paymentStudentCode = '';
		selectedStudentPreview = null;
		studentSearchQuery = '';
		studentSearchResults = [];
	}

	function addPaymentItem(): void {
		const conceptCode = draftConceptCode;
		const conceptLabel =
			conceptCode === 'other'
				? draftCustomConceptLabel.trim()
				: formatPaymentConceptLabel(conceptCode);
		const detail = draftConceptDetail.trim();

		if (!conceptLabel) {
			showToast('Debes indicar el concepto del item', 'error');
			return;
		}

		if (conceptCode === 'monthly_fee' && !MONTH_SET.has(detail)) {
			showToast('Selecciona el mes correspondiente a la mensualidad', 'error');
			return;
		}

		if (draftConceptAmount <= 0) {
			showToast('Debes indicar un monto mayor a 0', 'error');
			return;
		}

		paymentItems = [
			...paymentItems,
			{
				id: crypto.randomUUID(),
				conceptCode,
				conceptLabel,
				detail,
				amount: Number(draftConceptAmount.toFixed(2))
			}
		];

		draftConceptCode = 'monthly_fee';
		draftCustomConceptLabel = '';
		draftConceptDetail = '';
		draftConceptAmount = 0;
	}

	function removePaymentItem(itemId: string): void {
		paymentItems = paymentItems.filter((item) => item.id !== itemId);
	}

	function openTicket(paymentCode: string): void {
		window.open(`/api/payments/${paymentCode}/ticket`, '_blank', 'noopener,noreferrer');
	}

	function getPaymentPayerLabel(payment: PaymentRow): string {
		if (payment.student_full_name) {
			return payment.student_number
				? `${payment.student_full_name} · ${payment.student_number}`
				: payment.student_full_name;
		}

		return payment.payer_full_name;
	}
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader
		title="Caja"
		subtitle="Cobros, egresos, rendiciones y resumen diario de caja en un flujo compacto y auditable"
		icon="wallet"
	>
		{#snippet actions()}
			<div class="lumi-flex lumi-flex--gap-sm lumi-flex--wrap">
				<Button
					type="filled"
					color="primary"
					icon="plus"
					onclick={openPaymentModal}
					disabled={!canCreatePaymentToday}
				>
					Nuevo ingreso
				</Button>
				<Button
					type="border"
					color="warning"
					icon="shoppingBag"
					onclick={() => openOutflowModal('expense')}
					disabled={!canCreateOutflowToday}
				>
					Nuevo gasto
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	{#if !canReadCashbox && !canReadPayments}
		<Alert type="warning" closable>No tienes permisos para consultar el módulo de caja.</Alert>
	{:else if !data.user?.current_branch}
		<Card spaced>
			<EmptyState
				icon="building"
				title="Sin sede asignada"
				description="Necesitas al menos una sede activa y un contexto de trabajo. Configúralo en sedes o en tu perfil."
			/>
		</Card>
	{:else}
		<Card>
			<div class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--gap-md">
				<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
					<Chip color="secondary" size="sm">{data.currentUserName}</Chip>
					<Chip color={isDayClosed ? 'success' : hasOpening ? 'info' : 'warning'} size="sm">
						{isDayClosed ? 'Caja cerrada' : hasOpening ? 'Caja abierta' : 'Sin apertura'}
					</Chip>
				</div>

				<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
					<Chip color="primary" size="sm" icon="building2">{workspaceBranch?.name ?? 'Sede'}</Chip>
				</div>
			</div>
		</Card>

		<Tabs bind:value={activeTab} tabs={availableTabs}>
			{#if activeTab === 'summary'}
				<Card
					title="Corte diario"
					subtitle={`${workspaceBranch?.name ?? 'Sede'} · ${formatEducationDate(data.summary.business_date)}`}
				>
					<div class="lumi-stack lumi-stack--lg">
						<CashboxDateControl
							bind:value={selectedDate}
							label="Fecha operativa"
							onapply={() => applySelectedDate('summary')}
							onreset={() => resetSelectedDate('summary')}
						/>

						{#if !hasOpening}
							<Alert type="warning" closable={false}>
								Registra la apertura antes de generar ingresos, gastos o rendiciones.
							</Alert>
						{:else if isDayClosed}
							<Alert type="success" closable={false}>
								La caja de este día ya fue cerrada. El saldo quedó fijado y ya no admite más
								movimientos.
							</Alert>
						{/if}

						<div class="lumi-grid lumi-grid--columns-3 lumi-grid--gap-md">
							<StatCard
								title="Apertura"
								value={formatEducationCurrency(data.summary.opening_amount)}
								icon="wallet"
								color="primary"
								subtitle="Monto base del día"
							/>
							<StatCard
								title="Ingresos"
								value={formatEducationCurrency(data.summary.income_amount)}
								icon="creditCard"
								color="success"
								subtitle="Cobros activos"
							/>
							<StatCard
								title="Gastos"
								value={formatEducationCurrency(data.summary.expense_amount)}
								icon="shoppingBag"
								color="warning"
								subtitle="Salidas operativas"
							/>
							<StatCard
								title="Rendiciones"
								value={formatEducationCurrency(data.summary.surrender_amount)}
								icon="hand"
								color="info"
								subtitle="Entregas registradas"
							/>
							<StatCard
								title="Caja actual"
								value={formatEducationCurrency(data.summary.current_amount)}
								icon="activity"
								color="primary"
								subtitle="Saldo operativo"
							/>
							<StatCard
								title="Cierre"
								value={formatEducationCurrency(data.summary.closing_amount ?? 0)}
								icon="calendar"
								color="secondary"
								subtitle={data.summary.closing_amount !== null ? 'Monto registrado' : 'Sin cierre'}
							/>
						</div>

						<div class="lumi-flex lumi-flex--gap-md">
							<Button
								type="gradient"
								color="primary"
								onclick={() => openCashDayModal('opening')}
								disabled={!canOpenSelectedDate}
							>
								{Number(data.summary.opening_amount) > 0
									? 'Actualizar apertura'
									: 'Registrar apertura'}
							</Button>
							<Button
								type="border"
								color="secondary"
								onclick={() => openCashDayModal('closing')}
								disabled={!canCloseSelectedDate}
							>
								Registrar cierre
							</Button>
						</div>

						{#if data.summary.notes}
							<Alert type="info" closable={false}>
								<strong>Nota del día:</strong>
								{data.summary.notes}
							</Alert>
						{/if}
					</div>
				</Card>
			{:else if activeTab === 'payments'}
				<Card>
					{#snippet header()}
						<div class="lumi-section-toolbar">
							<div class="lumi-section-toolbar__copy">
								<h2 class="lumi-section-toolbar__title">Ingresos registrados</h2>
								<p class="lumi-section-toolbar__subtitle">
									Cobros por alumno registrado o pagador manual con ticket imprimible.
								</p>
							</div>
							<div class="lumi-section-toolbar__actions">
								<CashboxRangeControl
									bind:fromValue={paymentFromDateFilter}
									bind:toValue={paymentToDateFilter}
									onapply={applyPaymentRange}
									onreset={resetPaymentRange}
								/>
							</div>
						</div>
					{/snippet}

					{#if !canReadPayments}
						<Alert type="warning" closable>No tienes permisos para consultar ingresos.</Alert>
					{:else if data.payments.length === 0}
						<EmptyState
							title="Sin ingresos en este rango"
							description="Cuando registres cobros en las fechas seleccionadas aparecerán aquí."
							icon="creditCard"
						/>
					{:else}
						<Table data={paymentRows} search pagination hover itemsPerPage={10}>
							{#snippet thead()}
								<th>Ingreso</th>
								<th>Pagador</th>
								<th>Conceptos</th>
								<th>Total</th>
								<th>Estado</th>
								<th>Acciones</th>
							{/snippet}

							{#snippet row({ row })}
								{@const payment = row as unknown as PaymentRow}
								<td>
									<div class="lumi-stack lumi-stack--2xs">
										<span class="lumi-font--medium">{payment.payment_number}</span>
										<span class="lumi-text--xs lumi-text--muted">
											{formatEducationDate(payment.payment_date)}
										</span>
									</div>
								</td>
								<td>
									<div class="lumi-stack lumi-stack--2xs">
										<span class="lumi-font--medium">{getPaymentPayerLabel(payment)}</span>
										<span class="lumi-text--xs lumi-text--muted">
											{payment.student_code ? 'Alumno vinculado' : 'Pagador manual'}
										</span>
									</div>
								</td>
								<td>
									<div class="lumi-stack lumi-stack--2xs">
										<span class="lumi-font--medium">{payment.concept_summary}</span>
										<span class="lumi-text--xs lumi-text--muted">
											{payment.item_count} item{payment.item_count === 1 ? '' : 's'}
										</span>
									</div>
								</td>
								<td>{formatEducationCurrency(payment.total_amount)}</td>
								<td>
									<Chip color={getPaymentStatusColor(payment.status)} size="sm">
										{formatPaymentStatus(payment.status)}
									</Chip>
								</td>
								<td>
									<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
										<Button
											type="flat"
											size="sm"
											icon="eye"
											onclick={() => openTicket(payment.code)}
										>
											Ticket
										</Button>
										<Button
											type="flat"
											size="sm"
											icon="xCircle"
											color="danger"
											onclick={() => openVoidPaymentDialog(payment)}
											disabled={!canUpdatePayments || payment.status === 'voided'}
										>
											Anular
										</Button>
									</div>
								</td>
							{/snippet}
						</Table>
					{/if}
				</Card>
			{:else if activeTab === 'outflows'}
				<Card>
					{#snippet header()}
						<div class="lumi-section-toolbar">
							<div class="lumi-section-toolbar__copy">
								<h2 class="lumi-section-toolbar__title">Egresos y rendiciones</h2>
								<p class="lumi-section-toolbar__subtitle">
									Salidas de caja diferenciadas entre gasto operativo y rendición.
								</p>
							</div>
							<div class="lumi-section-toolbar__actions">
								<CashboxRangeControl
									bind:fromValue={outflowFromDateFilter}
									bind:toValue={outflowToDateFilter}
									onapply={applyOutflowRange}
									onreset={resetOutflowRange}
								/>
							</div>
						</div>
					{/snippet}

					{#if !canReadCashbox}
						<Alert type="warning" closable>No tienes permisos para consultar egresos.</Alert>
					{:else if data.outflows.length === 0}
						<EmptyState
							title="Sin egresos en este rango"
							description="Los gastos operativos y rendiciones aparecerán aquí."
							icon="shoppingBag"
						/>
					{:else}
						<Table data={outflowRows} search pagination hover itemsPerPage={10}>
							{#snippet thead()}
								<th>Egreso</th>
								<th>Tipo</th>
								<th>Concepto</th>
								<th>Monto</th>
								<th>Vuelto</th>
								<th>Pendiente</th>
								<th>Estado</th>
								<th>Acciones</th>
							{/snippet}

							{#snippet row({ row })}
								{@const outflow = row as unknown as OutflowRow}
								<td>
									<div class="lumi-stack lumi-stack--2xs">
										<span class="lumi-font--medium">{outflow.outflow_number}</span>
										<span class="lumi-text--xs lumi-text--muted">
											{formatEducationDate(outflow.outflow_date)}
										</span>
									</div>
								</td>
								<td>
									<Chip color={getCashOutflowTypeColor(outflow.outflow_type)} size="sm">
										{formatCashOutflowType(outflow.outflow_type)}
									</Chip>
								</td>
								<td>
									<div class="lumi-stack lumi-stack--2xs">
										<span class="lumi-font--medium">{outflow.concept}</span>
										<span class="lumi-text--xs lumi-text--muted">
											{outflow.responsible_name || 'Sin responsable'}
										</span>
									</div>
								</td>
								<td>{formatEducationCurrency(outflow.amount)}</td>
								<td>{formatEducationCurrency(outflow.returned_amount ?? 0)}</td>
								<td>{formatEducationCurrency(outflow.pending_amount ?? 0)}</td>
								<td>
									<Chip color={getCashOutflowStatusColor(outflow.status)} size="sm">
										{formatCashOutflowStatus(outflow.status)}
									</Chip>
								</td>
								<td>
									<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
										<Button
											type="flat"
											size="sm"
											icon="undo"
											color="info"
											onclick={() => openOutflowReturnDialog(outflow)}
											disabled={!canWriteCashbox ||
												outflow.status === 'deleted' ||
												Number(outflow.pending_amount ?? 0) <= 0}
										>
											Vuelto
										</Button>
										<Button
											type="flat"
											size="sm"
											icon="trash"
											color="danger"
											onclick={() => openDeleteOutflowDialog(outflow)}
											disabled={!canDeleteCashbox || outflow.status === 'deleted'}
										>
											Eliminar
										</Button>
									</div>
								</td>
							{/snippet}
						</Table>
					{/if}
				</Card>
			{:else}
				<div class="lumi-stack lumi-stack--lg">
					<CashboxDateControl
						bind:value={selectedDate}
						label="Mes base"
						onapply={() => applySelectedDate('monthly')}
						onreset={() => resetSelectedDate('monthly')}
					/>

					<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-md">
						<StatCard
							title="Ingresos del mes"
							value={formatEducationCurrency(data.monthlyTotals.incomes)}
							icon="creditCard"
							color="success"
							subtitle="Total acumulado del mes"
						/>
						<StatCard
							title="Gastos del mes"
							value={formatEducationCurrency(data.monthlyTotals.expenses)}
							icon="shoppingBag"
							color="warning"
							subtitle="Salidas operativas del mes"
						/>
						<StatCard
							title="Rendiciones del mes"
							value={formatEducationCurrency(data.monthlyTotals.surrenders)}
							icon="hand"
							color="info"
							subtitle="Entregas realizadas en el mes"
						/>
						<StatCard
							title="Saldo acumulado"
							value={formatEducationCurrency(data.monthlyTotals.closingBalance)}
							icon="activity"
							color="primary"
							subtitle="Suma de saldos diarios del mes"
						/>
					</div>

					<Card title="Resumen mensual" subtitle="Caja diaria del mes de la fecha seleccionada">
						{#if data.monthlySummary.length === 0}
							<EmptyState
								title="Sin movimientos mensuales"
								description="Cuando existan días con actividad de caja, aparecerán aquí."
								icon="calendar"
							/>
						{:else}
							<Table data={monthlyRows} pagination hover itemsPerPage={12}>
								{#snippet thead()}
									<th>Fecha</th>
									<th>Apertura</th>
									<th>Ingresos</th>
									<th>Gastos</th>
									<th>Rendiciones</th>
									<th>Saldo</th>
									<th>Cierre</th>
								{/snippet}

								{#snippet row({ row })}
									{@const day = row as unknown as MonthlyRow}
									<td>{formatEducationDate(day.business_date)}</td>
									<td>{formatEducationCurrency(day.opening_amount)}</td>
									<td>{formatEducationCurrency(day.income_amount)}</td>
									<td>{formatEducationCurrency(day.expense_amount)}</td>
									<td>{formatEducationCurrency(day.surrender_amount)}</td>
									<td>{formatEducationCurrency(day.current_amount)}</td>
									<td>
										{day.closing_amount !== null
											? formatEducationCurrency(day.closing_amount)
											: 'Sin cierre'}
									</td>
								{/snippet}
							</Table>
						{/if}
					</Card>
				</div>
			{/if}
		</Tabs>
	{/if}
</div>

<Dialog bind:open={showPaymentModal} title="Nuevo ingreso" size="lg">
	<form
		id="cashbox-payment-form"
		method="POST"
		action="?/createPayment"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					const paymentCode =
						typeof result.data?.paymentCode === 'string' ? result.data.paymentCode : '';
					showToast('Ingreso registrado exitosamente', 'success');
					await invalidate('cashbox:load');
					closePaymentModal();
					if (paymentCode) {
						openTicket(paymentCode);
					}
				} else if (result.type === 'failure') {
					paymentErrorMessage = getActionError(result) ?? 'No se pudo registrar el ingreso';
				}
			};
		}}
	>
		{#if paymentErrorMessage}
			<Alert type="danger" closable onclose={() => (paymentErrorMessage = '')}>
				{paymentErrorMessage}
			</Alert>
		{/if}

		<input type="hidden" name="student_code" value={paymentStudentCode} />
		<input type="hidden" name="payer_full_name" value={manualPayerFullName} />
		<input type="hidden" name="items_json" value={paymentItemsPayload} />

		<div class="lumi-stack lumi-stack--md">
			<SegmentedControl
				value={paymentPayerMode}
				options={[
					{ value: 'student', label: 'Alumno registrado', icon: 'graduationCap' },
					{ value: 'manual', label: 'Pagador manual', icon: 'user' }
				]}
				onchange={handlePayerModeChange}
				fullWidth
				aria-label="Modo de pagador"
			/>

			<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
				<Input
					name="payment_date"
					type="date"
					bind:value={paymentDate}
					label="Fecha de pago"
					required
				/>
				{#if paymentPayerMode === 'manual'}
					<Input
						bind:value={manualPayerFullName}
						label="Pagador"
						placeholder="Ej: Juan Pérez"
						required
					/>
				{:else}
					<Input
						bind:value={studentSearchQuery}
						label="Buscar alumno"
						placeholder="Nombre, DNI o código institucional"
						disabled={!canSearchStudents}
					/>
				{/if}
			</div>

			{#if paymentPayerMode === 'student'}
				<div class="lumi-stack lumi-stack--sm">
					{#if selectedStudentPreview}
						<div class="lumi-selected-panel">
							<div class="lumi-selected-panel__identity">
								<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
									<span class="lumi-font--medium">{selectedStudentPreview.full_name}</span>
									<span class="lumi-text--xs lumi-text--muted">
										{selectedStudentPreview.student_number} · {selectedStudentPreview.dni ||
											'Sin DNI'}
									</span>
								</div>
							</div>
							<Button type="flat" size="sm" color="danger" icon="x" onclick={removeSelectedStudent}>
								Quitar
							</Button>
						</div>
					{/if}

					{#if !canSearchStudents}
						<Alert type="warning" closable={false}>
							No tienes permisos para buscar alumnos en este flujo de ingreso.
						</Alert>
					{:else if studentSearchLoading}
						<p class="lumi-text--sm lumi-text--muted">Buscando alumnos…</p>
					{:else if studentSearchQuery.trim().length >= 2 && studentSearchResults.length > 0}
						<div class="lumi-item-list" role="listbox" aria-label="Resultados de alumnos">
							{#each studentSearchResults as student (student.code)}
								<button
									type="button"
									class="lumi-item-row lumi-item-row--interactive"
									onclick={() => selectStudent(student)}
								>
									<div class="lumi-item-row__copy">
										<span class="lumi-font--medium">{student.full_name}</span>
										<span class="lumi-text--xs lumi-text--muted">
											{student.student_number} · {student.dni || 'Sin DNI'}
										</span>
									</div>
								</button>
							{/each}
						</div>
					{:else if studentSearchQuery.trim().length >= 2}
						<p class="lumi-text--sm lumi-text--muted">
							No encontramos alumnos para ese criterio de búsqueda.
						</p>
					{:else if !selectedStudentPreview}
						<p class="lumi-text--sm lumi-text--muted">
							Escribe al menos dos caracteres para vincular el ingreso a un alumno.
						</p>
					{/if}
				</div>
			{/if}

			<Card title="Conceptos de cobro" subtitle="Agrega uno o varios conceptos antes de confirmar">
				<div class="lumi-stack lumi-stack--md">
					<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
						<Select
							value={draftConceptCode}
							options={PAYMENT_CONCEPT_OPTIONS}
							label="Concepto"
							onchange={(value) => (draftConceptCode = String(value) as PaymentConceptCode)}
						/>
						<NumberInput
							value={draftConceptAmount}
							label="Monto"
							min={0}
							max={1000000}
							step={0.01}
							color="primary"
							onchange={(value) => (draftConceptAmount = value)}
						/>
					</div>

					{#if draftConceptCode === 'other'}
						<Input
							bind:value={draftCustomConceptLabel}
							label="Nombre del concepto"
							placeholder="Ej. Inscripción de invitado"
						/>
					{/if}

					{#if draftConceptCode === 'monthly_fee'}
						<Select
							value={draftConceptDetail}
							options={MONTH_OPTIONS}
							label="Mes"
							placeholder="Selecciona el mes"
							clearable={false}
							onchange={(value) => (draftConceptDetail = String(value))}
						/>
					{:else}
						<Textarea
							bind:value={draftConceptDetail}
							label="Detalle"
							placeholder="Concepto adicional del ingreso"
							rows={2}
						/>
					{/if}

					<div class="lumi-flex lumi-justify--end">
						<Button type="border" color="primary" icon="plus" onclick={addPaymentItem}>
							Agregar item
						</Button>
					</div>

					{#if paymentItems.length === 0}
						<EmptyState
							title="Sin conceptos agregados"
							description="Agrega al menos un item para completar el ingreso."
							icon="list"
						/>
					{:else}
						<div class="lumi-item-list">
							{#each paymentItems as item (item.id)}
								<div class="lumi-item-row">
									<div class="lumi-item-row__copy">
										<strong>{item.conceptLabel}</strong>
										{#if item.detail}
											<span class="lumi-text--xs lumi-text--muted">{item.detail}</span>
										{/if}
									</div>
									<div class="lumi-item-row__actions">
										<span class="lumi-font--medium">
											{formatEducationCurrency(item.amount)}
										</span>
										<Button
											type="flat"
											size="sm"
											color="danger"
											icon="trash"
											onclick={() => removePaymentItem(item.id)}
										/>
									</div>
								</div>
							{/each}
						</div>
					{/if}

					<div class="lumi-total-box">
						<span>Total del ingreso</span>
						<strong>{formatEducationCurrency(paymentTotal)}</strong>
					</div>
				</div>
			</Card>

			<Textarea
				name="observation"
				bind:value={paymentObservation}
				label="Observación"
				placeholder="Opcional"
				rows={3}
			/>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closePaymentModal}>Cancelar</Button>
		<Button type="filled" color="primary" onclick={() => submitForm('cashbox-payment-form')}>
			Registrar ingreso
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showOutflowModal} title="Registrar egreso de caja" size="md">
	<form
		id="cashbox-outflow-form"
		method="POST"
		action="?/createOutflow"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Egreso registrado exitosamente', 'success');
					await invalidate('cashbox:load');
					closeOutflowModal();
				} else if (result.type === 'failure') {
					outflowErrorMessage = getActionError(result) ?? 'No se pudo registrar el egreso';
				}
			};
		}}
	>
		{#if outflowErrorMessage}
			<Alert type="danger" closable onclose={() => (outflowErrorMessage = '')}>
				{outflowErrorMessage}
			</Alert>
		{/if}

		<input type="hidden" name="outflow_type" value={outflowType} />
		<input type="hidden" name="amount" value={String(outflowAmount)} />

		<div class="lumi-stack lumi-stack--md">
			<SegmentedControl
				value={outflowType}
				options={[
					{ value: 'expense', label: 'Gasto', icon: 'shoppingBag' },
					{ value: 'surrender', label: 'Rendición', icon: 'hand' }
				]}
				onchange={(value) => (outflowType = value === 'surrender' ? 'surrender' : 'expense')}
				fullWidth
				aria-label="Tipo de salida"
			/>

			<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
				<Input name="outflow_date" type="date" bind:value={outflowDate} label="Fecha" required />
				<NumberInput
					value={outflowAmount}
					label="Monto"
					min={0}
					max={1000000}
					step={0.01}
					color={outflowType === 'surrender' ? 'info' : 'warning'}
					onchange={(value) => (outflowAmount = value)}
				/>
			</div>

			<Input
				name="concept"
				bind:value={outflowConcept}
				label="Concepto"
				placeholder={outflowType === 'surrender'
					? 'Ej. Entrega parcial a coordinación'
					: 'Ej. Compra de materiales'}
				required
			/>

			<Input
				name="responsible_name"
				bind:value={outflowResponsibleName}
				label={outflowType === 'surrender' ? 'Responsable receptor' : 'Responsable'}
				placeholder="Opcional"
			/>

			<Textarea
				name="description"
				bind:value={outflowDescription}
				label="Detalle"
				placeholder="Detalle opcional del egreso"
				rows={3}
			/>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeOutflowModal}>Cancelar</Button>
		<Button
			type="filled"
			color={outflowType === 'surrender' ? 'info' : 'warning'}
			onclick={() => submitForm('cashbox-outflow-form')}
		>
			Registrar {outflowType === 'surrender' ? 'rendición' : 'gasto'}
		</Button>
	{/snippet}
</Dialog>

<Dialog
	bind:open={showCashDayModal}
	title={cashDayMode === 'opening' ? 'Registrar apertura' : 'Registrar cierre'}
	size="sm"
>
	<form
		id="cashbox-day-form"
		method="POST"
		action={`?/${cashDayMode === 'opening' ? 'setOpening' : 'setClosing'}`}
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast(
						cashDayMode === 'opening'
							? 'Apertura registrada exitosamente'
							: 'Cierre registrado exitosamente',
						'success'
					);
					await invalidate('cashbox:load');
					closeCashDayModal();
				} else if (result.type === 'failure') {
					cashDayErrorMessage =
						getActionError(result) ??
						(cashDayMode === 'opening'
							? 'No se pudo registrar la apertura'
							: 'No se pudo registrar el cierre');
				}
			};
		}}
	>
		{#if cashDayErrorMessage}
			<Alert type="danger" closable onclose={() => (cashDayErrorMessage = '')}>
				{cashDayErrorMessage}
			</Alert>
		{/if}

		<input
			type="hidden"
			name="amount"
			value={cashDayMode === 'closing'
				? String(data.summary.current_amount ?? 0)
				: String(cashDayAmount)}
		/>

		<div class="lumi-stack lumi-stack--md">
			<Input name="business_date" type="date" bind:value={cashDayDate} label="Fecha" required />
			{#if cashDayMode === 'opening'}
				<NumberInput
					value={cashDayAmount}
					label="Monto de apertura"
					min={0}
					max={1000000}
					step={0.01}
					color="primary"
					onchange={(value) => (cashDayAmount = value)}
				/>
			{:else}
				<div class="lumi-total-box">
					<span>Monto de cierre</span>
					<strong>{formatEducationCurrency(data.summary.current_amount)}</strong>
				</div>
				<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
					El cierre toma automáticamente el saldo actual del día y ya no permite modificaciones
					posteriores.
				</p>
			{/if}
			<Textarea
				name="notes"
				bind:value={cashDayNotes}
				label="Nota del día"
				placeholder="Opcional"
				rows={3}
			/>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeCashDayModal}>Cancelar</Button>
		<Button
			type="filled"
			color={cashDayMode === 'opening' ? 'primary' : 'secondary'}
			onclick={() => submitForm('cashbox-day-form')}
		>
			Guardar
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showVoidPaymentDialog} title="Anular ingreso" size="sm">
	<form
		id="void-payment-form"
		method="POST"
		action="?/voidPayment"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Ingreso anulado exitosamente', 'success');
					await invalidate('cashbox:load');
					closeVoidPaymentDialog();
				} else if (result.type === 'failure') {
					deletePaymentErrorMessage = getActionError(result) ?? 'No se pudo anular el ingreso';
				}
			};
		}}
	>
		{#if selectedPayment}
			<input type="hidden" name="code" value={selectedPayment.code} />
		{/if}

		{#if deletePaymentErrorMessage}
			<Alert type="danger" closable onclose={() => (deletePaymentErrorMessage = '')}>
				{deletePaymentErrorMessage}
			</Alert>
		{/if}

		<p class="lumi-margin--none lumi-text--sm">
			¿Deseas anular el ingreso <strong>{selectedPayment?.payment_number}</strong>? La trazabilidad
			se conservará y su efecto en caja será revertido.
		</p>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeVoidPaymentDialog}>Cancelar</Button>
		<Button type="filled" color="danger" onclick={() => submitForm('void-payment-form')}>
			Anular
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showOutflowReturnDialog} title="Registrar vuelto (devolución)" size="sm">
	<form
		id="outflow-return-form"
		method="POST"
		action="?/createOutflowReturn"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Vuelto registrado exitosamente', 'success');
					await invalidate('cashbox:load');
					closeOutflowReturnDialog();
				} else if (result.type === 'failure') {
					outflowReturnErrorMessage =
						getActionError(result) ?? 'No se pudo registrar el vuelto del egreso';
				}
			};
		}}
	>
		{#if outflowReturnErrorMessage}
			<Alert type="danger" closable onclose={() => (outflowReturnErrorMessage = '')}>
				{outflowReturnErrorMessage}
			</Alert>
		{/if}

		{#if selectedOutflowForReturn}
			<input type="hidden" name="outflow_code" value={selectedOutflowForReturn.code} />
		{/if}
		<input type="hidden" name="amount" value={String(outflowReturnAmount)} />

		<div class="lumi-stack lumi-stack--md">
			{#if selectedOutflowForReturn}
				<Alert type="info" closable={false}>
					<strong>{selectedOutflowForReturn.outflow_number}</strong> · {selectedOutflowForReturn.concept}
					<br />
					Pendiente:
					<strong>{formatEducationCurrency(selectedOutflowForReturn.pending_amount ?? 0)}</strong>
				</Alert>
			{/if}

			<Input
				name="return_date"
				type="date"
				bind:value={outflowReturnDate}
				label="Fecha de devolución"
				required
			/>

			<NumberInput
				value={outflowReturnAmount}
				label="Monto devuelto (vuelto)"
				min={0}
				max={1000000}
				step={0.01}
				color="info"
				onchange={(value) => (outflowReturnAmount = value)}
			/>

			<Input
				name="returned_by_name"
				bind:value={outflowReturnReturnedByName}
				label="Responsable que devuelve"
				placeholder="Opcional"
			/>

			<Textarea
				name="note"
				bind:value={outflowReturnNote}
				label="Nota"
				placeholder="Opcional"
				rows={3}
			/>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeOutflowReturnDialog}>Cancelar</Button>
		<Button type="filled" color="info" onclick={() => submitForm('outflow-return-form')}>
			Registrar vuelto
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showDeleteOutflowDialog} title="Eliminar egreso" size="sm">
	<form
		id="delete-outflow-form"
		method="POST"
		action="?/deleteOutflow"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Egreso eliminado exitosamente', 'success');
					await invalidate('cashbox:load');
					closeDeleteOutflowDialog();
				} else if (result.type === 'failure') {
					deleteOutflowErrorMessage = getActionError(result) ?? 'No se pudo eliminar el egreso';
				}
			};
		}}
	>
		{#if selectedOutflow}
			<input type="hidden" name="code" value={selectedOutflow.code} />
		{/if}

		{#if deleteOutflowErrorMessage}
			<Alert type="danger" closable onclose={() => (deleteOutflowErrorMessage = '')}>
				{deleteOutflowErrorMessage}
			</Alert>
		{/if}

		<p class="lumi-margin--none lumi-text--sm">
			¿Deseas eliminar el egreso <strong>{selectedOutflow?.outflow_number}</strong>? El registro
			quedará marcado como eliminado y su movimiento será revertido en caja.
		</p>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeDeleteOutflowDialog}>Cancelar</Button>
		<Button type="filled" color="danger" onclick={() => submitForm('delete-outflow-form')}>
			Eliminar
		</Button>
	{/snippet}
</Dialog>
