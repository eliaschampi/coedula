import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import { EvaluationRepository } from '$lib/server/repositories/evaluation.repository';
import type { GroupCode } from '$lib/types/education';

const VALID_GROUPS = new Set<GroupCode>(['A', 'B', 'C', 'D']);

export const load: PageServerLoad = async ({ locals, url, depends }) => {
	depends('evaluations:results');

	if (!(await locals.can('evaluations:read'))) {
		throw error(403, 'No tienes permisos para consultar resultados de evaluaciones');
	}

	const requestedCycleCode = (url.searchParams.get('cycle') ?? '').trim();
	const requestedCycleDegreeCode = (url.searchParams.get('degree') ?? '').trim();
	const requestedGroupCode = (url.searchParams.get('group') ?? 'A').trim().toUpperCase();
	const requestedEvaluationCode = (url.searchParams.get('evaluation') ?? '').trim();
	const searchQuery = (url.searchParams.get('search') ?? '').trim();

	const [cycles, allCycleDegreeOptions] = await Promise.all([
		EducationRepository.listCycleOptions(locals.db),
		EducationRepository.listCycleDegreeOptions(locals.db)
	]);

	const selectedCycleCode =
		cycles.find((cycle) => cycle.code === requestedCycleCode)?.code ?? cycles[0]?.code ?? null;
	const cycleDegreeOptions = allCycleDegreeOptions.filter(
		(option) => option.cycle_code === selectedCycleCode
	);
	const selectedCycleDegreeCode =
		cycleDegreeOptions.find((option) => option.code === requestedCycleDegreeCode)?.code ??
		cycleDegreeOptions[0]?.code ??
		null;
	const selectedGroupCode = VALID_GROUPS.has(requestedGroupCode as GroupCode)
		? (requestedGroupCode as GroupCode)
		: 'A';

	const evaluations =
		selectedCycleCode && selectedCycleDegreeCode
			? (await EvaluationRepository.listEvaluationsByFilters(locals.db, {
					cycleCode: selectedCycleCode,
					cycleDegreeCode: selectedCycleDegreeCode,
					groupCode: selectedGroupCode,
					search: searchQuery
				})).filter((evaluation) => evaluation.has_questions)
			: [];

	const selectedEvaluationCode =
		evaluations.find((evaluation) => evaluation.code === requestedEvaluationCode)?.code ??
		evaluations[0]?.code ??
		null;
	const selectedEvaluation =
		evaluations.find((evaluation) => evaluation.code === selectedEvaluationCode) ?? null;
	const results = selectedEvaluationCode
		? await EvaluationRepository.listSavedResults(locals.db, selectedEvaluationCode)
		: [];

	return {
		title: 'Resultados de evaluaciones',
		cycles,
		cycleDegreeOptions: allCycleDegreeOptions,
		evaluations,
		selectedCycleCode,
		selectedCycleDegreeCode,
		selectedGroupCode,
		selectedEvaluationCode,
		selectedEvaluation,
		searchQuery,
		results
	};
};
