import type { SelectOption } from '$lib/components';
import type {
	CashOutflowStatus,
	CashOutflowType,
	PaymentConceptCode,
	PaymentStatus
} from '$lib/types/finance';

export const PAYMENT_CONCEPT_OPTIONS: SelectOption[] = [
	{ value: 'enrollment', label: 'Matrícula' },
	{ value: 'monthly_fee', label: 'Mensualidad' },
	{ value: 'first_installment', label: 'Primera cuota' },
	{ value: 'second_installment', label: 'Segunda cuota' },
	{ value: 'initial_fee', label: 'Cuota inicial' },
	{ value: 'other', label: 'Otro concepto' }
];

export const CASH_OUTFLOW_TYPE_OPTIONS: SelectOption[] = [
	{ value: 'expense', label: 'Gasto' },
	{ value: 'surrender', label: 'Rendición' }
];

export function formatPaymentConceptLabel(code: PaymentConceptCode): string {
	if (code === 'enrollment') return 'Matrícula';
	if (code === 'monthly_fee') return 'Mensualidad';
	if (code === 'first_installment') return 'Primera cuota';
	if (code === 'second_installment') return 'Segunda cuota';
	if (code === 'initial_fee') return 'Cuota inicial';
	return 'Otro concepto';
}

export function formatPaymentStatus(status: PaymentStatus): string {
	if (status === 'voided') return 'Anulado';
	return 'Registrado';
}

export function getPaymentStatusColor(status: PaymentStatus): 'success' | 'danger' | 'secondary' {
	if (status === 'voided') return 'danger';
	return 'success';
}

export function formatCashOutflowType(type: CashOutflowType): string {
	if (type === 'surrender') return 'Rendición';
	return 'Gasto';
}

export function getCashOutflowTypeColor(type: CashOutflowType): 'warning' | 'info' | 'secondary' {
	if (type === 'surrender') return 'info';
	return 'warning';
}

export function formatCashOutflowStatus(status: CashOutflowStatus): string {
	if (status === 'deleted') return 'Eliminado';
	return 'Registrado';
}

export function getCashOutflowStatusColor(
	status: CashOutflowStatus
): 'success' | 'danger' | 'secondary' {
	if (status === 'deleted') return 'danger';
	return 'success';
}
