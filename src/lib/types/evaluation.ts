import type { OmrErrorCode } from '$lib/omrProcessor';
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

export interface EvaluationScoreSummary {
	correct_count: number;
	incorrect_count: number;
	blank_count: number;
	total_questions: number;
	score: number;
}

export interface EvaluationSectionScoreSummary extends EvaluationScoreSummary {
	section_name: string;
}

export interface EvaluationProcessedAnswer {
	question_code: string;
	student_answer: EvaluationStudentAnswer;
	order_in_eval: number;
	correct_key: EvaluationAnswerKey;
	score_percent: number;
	is_correct: boolean;
	is_blank: boolean;
	is_multiple: boolean;
	section_code: string;
	section_name?: string | null;
}

export interface EvaluationProcessingStudentSummary {
	code: string;
	full_name: string;
	student_number: string;
	dni: string | null;
	photo_url: string | null;
}

export interface EvaluationProcessingSuccessData {
	roll_code: string;
	enrollment_code: string | null;
	enrollment_number: string | null;
	student: EvaluationProcessingStudentSummary | null;
	answers: EvaluationProcessedAnswer[];
	scores: {
		general: EvaluationScoreSummary;
		by_section: Record<string, EvaluationSectionScoreSummary>;
	};
	omr_debug_image?: string | null;
}

export type EvaluationProcessingErrorCode =
	| OmrErrorCode
	| 'VALIDATION_ERROR'
	| 'ENROLLMENT_NOT_FOUND'
	| 'INTERNAL_ERROR';

export interface EvaluationProcessingErrorData {
	code: EvaluationProcessingErrorCode;
	message: string;
	details?: unknown;
	roll_code?: string;
	omr_debug_image?: string | null;
}

export interface EvaluationProcessingBatchItem {
	id: string;
	success: boolean;
	data?: EvaluationProcessingSuccessData;
	error?: EvaluationProcessingErrorData;
}

export interface EvaluationProcessingBatchRequest {
	evaluationCode: string;
	items: Array<{
		id: string;
		imageData: string;
		rollCode?: string;
	}>;
}

export interface EvaluationProcessingBatchResponse {
	success: boolean;
	error?: {
		code: string;
		message: string;
	};
	results: EvaluationProcessingBatchItem[];
}

export interface EvaluationProcessingSaveItem {
	enrollment_code: string;
	roll_code: string;
	answers: Array<{
		question_code: string;
		student_answer: EvaluationStudentAnswer;
	}>;
}

export interface EvaluationProcessingSavePayload {
	evaluation_code: string;
	results: EvaluationProcessingSaveItem[];
}

export interface EvaluationSavedResultSummary {
	code: string;
	enrollment_code: string;
	enrollment_number: string;
	roll_code: string;
	student_code: string;
	student_full_name: string;
	student_number: string;
	student_dni: string | null;
	student_photo_url: string | null;
	correct_count: number;
	incorrect_count: number;
	blank_count: number;
	score: number;
	calculated_at: DateValue;
}
