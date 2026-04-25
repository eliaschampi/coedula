import type { DateValue } from './education';

export type PaymentStatus = 'posted' | 'voided';
export type CashOutflowType = 'expense' | 'surrender';
export type CashOutflowStatus = 'posted' | 'deleted';
export type CashMovementType = 'payment' | 'expense' | 'surrender';
export type PaymentConceptCode =
	| 'enrollment'
	| 'monthly_fee'
	| 'first_installment'
	| 'second_installment'
	| 'initial_fee'
	| 'other';

export interface CashboxBranchOption {
	code: string;
	name: string;
}

export interface PaymentItem {
	code: string;
	payment_code: string;
	position: number;
	concept_code: PaymentConceptCode;
	concept_label: string;
	detail: string | null;
	amount: string | number;
	created_at: DateValue;
	updated_at: DateValue;
}

export interface PaymentOverview {
	code: string;
	payment_number: string;
	branch_code: string;
	branch_name: string | null;
	cashier_user_code: string;
	cashier_full_name: string | null;
	student_code: string | null;
	student_number: string | null;
	student_full_name: string | null;
	payer_full_name: string;
	payment_date: DateValue;
	observation: string | null;
	status: PaymentStatus;
	total_amount: string | number;
	registered_by_user_code: string;
	registered_by_full_name: string | null;
	voided_at: DateValue;
	voided_by_user_code: string | null;
	created_at: DateValue;
	updated_at: DateValue;
	item_count: number;
	concept_summary: string;
}

export interface CashOutflowOverview {
	code: string;
	outflow_number: string;
	branch_code: string;
	branch_name: string | null;
	cashier_user_code: string;
	cashier_full_name: string | null;
	outflow_type: CashOutflowType;
	outflow_date: DateValue;
	concept: string;
	description: string | null;
	amount: string | number;
	responsible_name: string | null;
	status: CashOutflowStatus;
	registered_by_user_code: string;
	registered_by_full_name: string | null;
	deleted_at: DateValue;
	deleted_by_user_code: string | null;
	created_at: DateValue;
	updated_at: DateValue;
}

export interface CashboxDailySummary {
	business_date: DateValue;
	branch_code: string | null;
	branch_name: string | null;
	cashier_user_code: string | null;
	cashier_full_name: string | null;
	cashbox_day_code: string | null;
	opened_by_user_code: string | null;
	closed_by_user_code: string | null;
	opening_amount: string | number;
	income_amount: string | number;
	expense_amount: string | number;
	surrender_amount: string | number;
	current_amount: string | number;
	closing_amount: string | number | null;
	notes: string | null;
	closed_at: DateValue;
	created_at: DateValue;
	updated_at: DateValue;
}
