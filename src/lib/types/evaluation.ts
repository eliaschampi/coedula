import type { DateValue, GroupCode } from './education';

export type EvaluationAnswerKey = 'A' | 'B' | 'C' | 'D' | 'E';
export type EvaluationDraftAnswerKey = EvaluationAnswerKey | '';
export type EvaluationStudentAnswer = EvaluationAnswerKey | 'error_multiple' | null;

export interface EvaluationSectionFormItem {
	course_code: string;
	course_name: string;
	order_in_eval: number;
	question_count: number;
}

export interface EvaluationSectionOverview extends EvaluationSectionFormItem {
	code: string;
	eval_code: string;
}

export interface EvaluationOverview {
	code: string;
	name: string;
	cycle_degree_code: string;
	cycle_code: string;
	branch_code: string;
	branch_name: string;
	cycle_title: string;
	modality: string;
	degree_code: string;
	degree_name: string;
	degree_short_name: string | null;
	degree_sort_order: number;
	group_code: GroupCode;
	eval_date: DateValue;
	user_code: string;
	created_at: DateValue;
	updated_at: DateValue;
	section_count: number;
	planned_question_count: number;
	configured_question_count: number;
	has_questions: boolean;
	eval_sections: EvaluationSectionOverview[];
}

export interface EvaluationQuestionRecord {
	code: string;
	eval_code: string;
	section_code: string;
	order_in_eval: number;
	correct_key: EvaluationAnswerKey;
	omitable: boolean;
	score_percent: number;
}

export interface EvaluationQuestionDraft extends Omit<EvaluationQuestionRecord, 'correct_key'> {
	correct_key: EvaluationDraftAnswerKey;
}
