import type { SelectOption } from '$lib/components';
import type {
	EvaluationAnswerKey,
	EvaluationDraftAnswerKey,
	EvaluationQuestionDraft,
	EvaluationSectionFormItem,
	EvaluationSectionOverview
} from '$lib/types/evaluation';

export const DEFAULT_EVALUATION_SECTION_QUESTION_COUNT = 10;
export const MAX_EVALUATION_QUESTIONS = 80;
export const EVALUATION_ANSWER_KEYS = ['A', 'B', 'C', 'D', 'E'] as const;
const A5_VERTICAL_RATIO = 1 / 1.414;
const A5_RATIO_TOLERANCE = 0.05;

export const EVALUATION_ANSWER_KEY_OPTIONS: SelectOption[] = EVALUATION_ANSWER_KEYS.map((key) => ({
	value: key,
	label: key
}));

export function isEvaluationAnswerKey(value: string): value is EvaluationAnswerKey {
	return EVALUATION_ANSWER_KEYS.includes(value as EvaluationAnswerKey);
}

export function calculateEvaluationQuestionTotal(
	sections: Array<EvaluationSectionFormItem | EvaluationSectionOverview>
): number {
	return sections.reduce(
		(total, section) => total + Math.max(Number(section.question_count) || 0, 0),
		0
	);
}

export function normalizeEvaluationSections(
	sections: EvaluationSectionFormItem[]
): EvaluationSectionFormItem[] {
	return [...sections]
		.map((section, index) => ({
			course_code: section.course_code.trim(),
			course_name: section.course_name.trim(),
			order_in_eval: Number(section.order_in_eval) || index + 1,
			question_count: Math.max(Number(section.question_count) || 0, 0)
		}))
		.filter((section) => section.course_code.length > 0)
		.sort((left, right) => left.order_in_eval - right.order_in_eval)
		.map((section, index) => ({
			...section,
			order_in_eval: index + 1
		}));
}

export function buildEvaluationSectionStarts(
	sections: EvaluationSectionOverview[]
): Record<string, number> {
	let current = 1;
	const starts: Record<string, number> = {};

	for (const section of sections) {
		starts[section.code] = current;
		current += section.question_count;
	}

	return starts;
}

export function getLocalEvaluationQuestionIndex(
	globalOrder: number,
	sectionCode: string,
	sectionStarts: Record<string, number>
): number {
	const start = sectionStarts[sectionCode] ?? 1;
	return globalOrder - start + 1;
}

export function buildEvaluationKeyString(questions: EvaluationQuestionDraft[]): string {
	return [...questions]
		.sort((left, right) => left.order_in_eval - right.order_in_eval)
		.map((question) => question.correct_key)
		.join('');
}

export function applyEvaluationKeyString(
	questions: EvaluationQuestionDraft[],
	keyString: string
): EvaluationQuestionDraft[] {
	const normalizedKeys = keyString.trim().toUpperCase();
	const sortedQuestions = [...questions].sort(
		(left, right) => left.order_in_eval - right.order_in_eval
	);

	return sortedQuestions.map((question, index) => ({
		...question,
		correct_key: (normalizedKeys[index] ?? question.correct_key) as EvaluationDraftAnswerKey
	}));
}

export function validateEvaluationSheetProportion(
	width: number,
	height: number
): {
	isValid: boolean;
	format: string;
} {
	const imageRatio = width / height;
	const isValid = Math.abs(imageRatio - A5_VERTICAL_RATIO) <= A5_RATIO_TOLERANCE;

	return {
		isValid,
		format: isValid ? 'A5 Vertical' : 'Formato no A5'
	};
}
