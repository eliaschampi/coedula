import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import { EvaluationRepository } from '$lib/server/repositories/evaluation.repository';
import { EvaluationProcessingService } from '$lib/server/services/evaluation-processing.service';
import type { GroupCode } from '$lib/types/education';
import { getWorkspaceBranchUuid } from '$lib/server/user-branch.server';
import { isUuid } from '$lib/utils/validation';

const VALID_GROUPS = new Set<GroupCode>(['A', 'B', 'C', 'D']);

export const load: PageServerLoad = async ({ locals, url, depends }) => {
	depends('evaluations:process:load');

	if (!(await locals.can('evaluations:update'))) {
		throw error(403, 'No tienes permisos para procesar evaluaciones');
	}

	const requestedCycleCode = (url.searchParams.get('cycle') ?? '').trim();
	const requestedCycleDegreeCode = (url.searchParams.get('degree') ?? '').trim();
	const requestedGroupCode = (url.searchParams.get('group') ?? 'A').trim().toUpperCase();
	const requestedEvaluationCode = (url.searchParams.get('evaluation') ?? '').trim();
	const searchQuery = (url.searchParams.get('search') ?? '').trim();

	const workspaceBranch = getWorkspaceBranchUuid(locals.user);
	const [cycles, allCycleDegreeOptions] = workspaceBranch
		? await Promise.all([
				EducationRepository.listCycleOptions(locals.db, { branchCode: workspaceBranch }),
				EducationRepository.listCycleDegreeOptions(locals.db, { branchCode: workspaceBranch })
			])
		: [[], []];

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
			? (
					await EvaluationRepository.listEvaluationsByFilters(locals.db, {
						cycleCode: selectedCycleCode,
						cycleDegreeCode: selectedCycleDegreeCode,
						groupCode: selectedGroupCode,
						search: searchQuery
					})
				).filter((evaluation) => evaluation.has_questions)
			: [];

	const selectedEvaluationCode =
		evaluations.find((evaluation) => evaluation.code === requestedEvaluationCode)?.code ??
		evaluations[0]?.code ??
		null;
	const selectedEvaluation =
		evaluations.find((evaluation) => evaluation.code === selectedEvaluationCode) ?? null;

	const [questions, savedResultsCount] = selectedEvaluationCode
		? await Promise.all([
				EvaluationRepository.listQuestions(locals.db, selectedEvaluationCode),
				EvaluationRepository.countSavedResults(locals.db, selectedEvaluationCode)
			])
		: [[], 0];

	return {
		title: 'Procesar evaluaciones',
		cycles,
		cycleDegreeOptions: allCycleDegreeOptions,
		evaluations,
		selectedCycleCode,
		selectedCycleDegreeCode,
		selectedGroupCode,
		selectedEvaluationCode,
		selectedEvaluation,
		questions,
		searchQuery,
		savedResultsCount
	};
};

export const actions: Actions = {
	saveResults: async ({ locals, request }) => {
		if (!(await locals.can('evaluations:update'))) {
			return fail(403, { error: 'No tienes permisos para guardar resultados de evaluaciones' });
		}

		const formData = await request.formData();
		const payloadText = String(formData.get('resultsToSave') ?? '').trim();

		if (!payloadText) {
			return fail(400, { error: 'No se recibieron resultados para guardar' });
		}

		try {
			const rawPayload = JSON.parse(payloadText) as unknown;
			const payload = EvaluationProcessingService.validateSavePayload(rawPayload);

			if (!isUuid(payload.evaluation_code)) {
				return fail(400, { error: 'La evaluación seleccionada no es válida' });
			}

			const result = await EvaluationProcessingService.saveProcessedBatch(locals.db, payload);

			if (result.errors.length > 0) {
				return fail(400, {
					error: `Se guardaron ${result.successCount} de ${payload.results.length} resultados`,
					errors: result.errors,
					savedEnrollmentCodes: result.savedEnrollmentCodes
				});
			}

			return {
				success: true,
				message: `Se guardaron ${result.successCount} resultados correctamente`,
				savedEnrollmentCodes: result.savedEnrollmentCodes
			};
		} catch (caught) {
			const message =
				caught instanceof Error ? caught.message : 'No se pudieron guardar los resultados';
			return fail(400, { error: message });
		}
	}
};
