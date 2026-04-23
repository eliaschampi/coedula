import type { GroupCode } from '$lib/types/education';

export interface EvaluationSelectionValue {
	cycleCode: string | null;
	cycleDegreeCode: string | null;
	groupCode: GroupCode;
	searchQuery: string;
	evaluationCode: string | null;
}

export function buildEvaluationSelectionUrl(
	basePath: string,
	selection: EvaluationSelectionValue,
	includeEvaluation = true
): string {
	const params = new URLSearchParams();

	if (selection.cycleCode) {
		params.set('cycle', selection.cycleCode);
	}

	if (selection.cycleDegreeCode) {
		params.set('degree', selection.cycleDegreeCode);
	}

	if (selection.groupCode) {
		params.set('group', selection.groupCode);
	}

	const searchQuery = selection.searchQuery.trim();
	if (searchQuery) {
		params.set('search', searchQuery);
	}

	if (includeEvaluation && selection.evaluationCode) {
		params.set('evaluation', selection.evaluationCode);
	}

	const query = params.toString();
	return query ? `${basePath}?${query}` : basePath;
}
