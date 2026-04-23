import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { readFormField } from '$lib/utils/formData';
import { isUuid } from '$lib/utils/validation';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import { EvaluationRepository } from '$lib/server/repositories/evaluation.repository';
import type { EvaluationSectionFormItem } from '$lib/types/evaluation';

const VALID_GROUPS = new Set(['A', 'B', 'C', 'D']);

function parseSectionsPayload(payload: string): EvaluationSectionFormItem[] {
	if (!payload) {
		return [];
	}

	try {
		const parsed = JSON.parse(payload) as unknown;
		if (!Array.isArray(parsed)) {
			throw new Error('Debe enviar una lista de secciones válida');
		}

		return parsed.map((section, index) => {
			if (!section || typeof section !== 'object') {
				throw new Error(`La sección ${index + 1} no es válida`);
			}

			const record = section as Record<string, unknown>;

			return {
				course_code: typeof record.course_code === 'string' ? record.course_code.trim() : '',
				course_name: typeof record.course_name === 'string' ? record.course_name.trim() : '',
				order_in_eval: Number(record.order_in_eval) || index + 1,
				question_count: Number(record.question_count) || 0
			};
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'No se pudieron interpretar las secciones';
		throw new Error(message, { cause: error });
	}
}

export const load: PageServerLoad = async ({ locals, depends, url }) => {
	depends('evaluations:load');

	if (!(await locals.can('evaluations:read'))) {
		return {
			title: 'Evaluaciones',
			evaluations: [],
			cycles: [],
			cycleDegreeOptions: [],
			courses: [],
			selectedCycleCode: null,
			selectedCycleDegreeCode: null,
			selectedGroupCode: 'A',
			searchQuery: ''
		};
	}

	const requestedCycleCode = (url.searchParams.get('cycle') ?? '').trim();
	const requestedCycleDegreeCode = (url.searchParams.get('degree') ?? '').trim();
	const requestedGroupCode = (url.searchParams.get('group') ?? 'A').trim().toUpperCase();
	const searchQuery = (url.searchParams.get('search') ?? '').trim();

	const [cycles, allCycleDegreeOptions, courses] = await Promise.all([
		EducationRepository.listCycleOptions(locals.db),
		EducationRepository.listCycleDegreeOptions(locals.db),
		locals.db.selectFrom('courses').select(['code', 'name']).orderBy('name', 'asc').execute()
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
	const selectedGroupCode = VALID_GROUPS.has(requestedGroupCode) ? requestedGroupCode : 'A';

	const evaluations =
		selectedCycleCode && selectedCycleDegreeCode
			? await EvaluationRepository.listEvaluationsByFilters(locals.db, {
					cycleCode: selectedCycleCode,
					cycleDegreeCode: selectedCycleDegreeCode,
					groupCode: selectedGroupCode as 'A' | 'B' | 'C' | 'D',
					search: searchQuery
				})
			: [];

	return {
		title: 'Evaluaciones',
		evaluations,
		cycles,
		cycleDegreeOptions: allCycleDegreeOptions,
		courses,
		selectedCycleCode,
		selectedCycleDegreeCode,
		selectedGroupCode,
		searchQuery
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!(await locals.can('evaluations:create'))) {
			return fail(403, { error: 'No tienes permisos para crear evaluaciones' });
		}

		try {
			const formData = await request.formData();
			const name = readFormField(formData, 'name');
			const cycleDegreeCode = readFormField(formData, 'cycle_degree_code');
			const groupCode = readFormField(formData, 'group_code');
			const evalDate = readFormField(formData, 'eval_date');
			const sections = parseSectionsPayload(readFormField(formData, 'sections'));
			const userCode = locals.user?.code ?? '';

			if (!cycleDegreeCode || !isUuid(cycleDegreeCode)) {
				return fail(400, { error: 'Debe seleccionar una valores válidos' });
			}

			if (!VALID_GROUPS.has(groupCode)) {
				return fail(400, { error: 'Debe seleccionar un grupo válido' });
			}

			const evaluation = await EvaluationRepository.createEvaluation(
				locals.db,
				EvaluationRepository.normalizeEvaluationInput({
					name,
					cycleDegreeCode,
					groupCode: groupCode as 'A' | 'B' | 'C' | 'D',
					evalDate,
					userCode,
					sections
				})
			);

			return {
				success: true,
				type: 'success',
				evaluationCode: evaluation.code
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'No se pudo registrar la evaluación';
			return fail(400, { error: message });
		}
	},

	update: async ({ locals, request }) => {
		if (!(await locals.can('evaluations:update'))) {
			return fail(403, { error: 'No tienes permisos para actualizar evaluaciones' });
		}

		try {
			const formData = await request.formData();
			const evaluationCode = readFormField(formData, 'code');
			const name = readFormField(formData, 'name');
			const cycleDegreeCode = readFormField(formData, 'cycle_degree_code');
			const groupCode = readFormField(formData, 'group_code');
			const evalDate = readFormField(formData, 'eval_date');
			const sections = parseSectionsPayload(readFormField(formData, 'sections'));
			const userCode = locals.user?.code ?? '';

			if (!evaluationCode || !isUuid(evaluationCode)) {
				return fail(400, { error: 'La evaluación seleccionada no es válida' });
			}

			if (!cycleDegreeCode || !isUuid(cycleDegreeCode)) {
				return fail(400, { error: 'Debe seleccionar una nivel y grupo válidos' });
			}

			if (!VALID_GROUPS.has(groupCode)) {
				return fail(400, { error: 'Debe seleccionar un grupo válido' });
			}

			const updated = await EvaluationRepository.updateEvaluation(
				locals.db,
				EvaluationRepository.normalizeEvaluationInput({
					evaluationCode,
					name,
					cycleDegreeCode,
					groupCode: groupCode as 'A' | 'B' | 'C' | 'D',
					evalDate,
					userCode,
					sections
				})
			);

			if (!updated) {
				return fail(404, { error: 'La evaluación no fue encontrada' });
			}

			return { success: true, type: 'success' };
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'No se pudo actualizar la evaluación';
			return fail(400, { error: message });
		}
	},

	delete: async ({ locals, request }) => {
		if (!(await locals.can('evaluations:delete'))) {
			return fail(403, { error: 'No tienes permisos para eliminar evaluaciones' });
		}

		const formData = await request.formData();
		const evaluationCode = readFormField(formData, 'code');

		if (!evaluationCode || !isUuid(evaluationCode)) {
			return fail(400, { error: 'La evaluación seleccionada no es válida' });
		}

		try {
			const deleted = await EvaluationRepository.deleteEvaluation(locals.db, evaluationCode);

			if (!deleted) {
				return fail(404, { error: 'La evaluación no fue encontrada' });
			}

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'No se pudo eliminar la evaluación';
			return fail(400, { error: message });
		}
	}
};
