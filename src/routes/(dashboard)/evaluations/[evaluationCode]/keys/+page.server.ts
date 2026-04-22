import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { readFormCheckbox, readFormField } from '$lib/utils/formData';
import { isUuid } from '$lib/utils/validation';
import { EvaluationRepository } from '$lib/server/repositories/evaluation.repository';
import {
	buildEvaluationSectionStarts,
	getLocalEvaluationQuestionIndex,
	isEvaluationAnswerKey
} from '$lib/utils';

function normalizeReturnTo(value: string | null): string {
	const normalized = value?.trim() ?? '';

	if (!normalized.startsWith('/evaluations')) {
		return '/evaluations';
	}

	if (normalized.startsWith('//')) {
		return '/evaluations';
	}

	return normalized;
}

function parseScorePercent(value: string, questionLabel: string): number {
	const normalized = value.trim() || '1';
	const parsed = Number.parseFloat(normalized);

	if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
		throw new Error(`La ponderación de ${questionLabel} debe estar entre 0 y 1`);
	}

	return Number(parsed.toFixed(2));
}

export const load: PageServerLoad = async ({ params, url, locals }) => {
	if (!(await locals.can('evaluations:read'))) {
		throw error(403, 'Acceso no autorizado');
	}

	const evaluationCode = params.evaluationCode;
	if (!evaluationCode || !isUuid(evaluationCode)) {
		throw error(404, 'Evaluación no encontrada');
	}

	const evaluation = await EvaluationRepository.getEvaluationByCode(locals.db, evaluationCode);
	if (!evaluation) {
		throw error(404, 'Evaluación no encontrada');
	}

	const existingQuestions = await EvaluationRepository.listQuestions(locals.db, evaluationCode);
	const returnTo = normalizeReturnTo(url.searchParams.get('returnTo'));

	return {
		title: 'Claves de evaluación',
		evaluation,
		sections: evaluation.eval_sections,
		existingQuestions,
		returnTo
	};
};

export const actions: Actions = {
	saveQuestions: async ({ request, params, locals }) => {
		if (!(await locals.can('evaluations:update'))) {
			return fail(403, { error: 'No tienes permisos para actualizar claves de evaluaciones' });
		}

		const evaluationCode = params.evaluationCode;
		if (!evaluationCode || !isUuid(evaluationCode)) {
			return fail(400, { error: 'La evaluación seleccionada no es válida' });
		}

		try {
			const sections = await EvaluationRepository.listSections(locals.db, evaluationCode);
			if (sections.length === 0) {
				return fail(400, { error: 'La evaluación no tiene secciones configuradas' });
			}

			const formData = await request.formData();
			const sectionStarts = buildEvaluationSectionStarts(sections);
			const questions = sections.flatMap((section) => {
				const start = sectionStarts[section.code] ?? 1;

				return Array.from({ length: section.question_count }, (_, index) => {
					const localIndex = index + 1;
					const questionLabel = `pregunta ${getLocalEvaluationQuestionIndex(
						start + index,
						section.code,
						sectionStarts
					)}`;
					const correctKey = readFormField(
						formData,
						`question_${section.code}_${localIndex}`
					).toUpperCase();

					if (!isEvaluationAnswerKey(correctKey)) {
						throw new Error(`Debe seleccionar una respuesta válida para ${questionLabel}`);
					}

					return {
						sectionCode: section.code,
						orderInEval: start + index,
						correctKey,
						omitable: readFormCheckbox(formData, `omitable_${section.code}_${localIndex}`),
						scorePercent: parseScorePercent(
							readFormField(formData, `score_${section.code}_${localIndex}`),
							questionLabel
						)
					};
				});
			});

			await EvaluationRepository.replaceQuestions(locals.db, evaluationCode, questions);

			return { success: true, type: 'success' };
		} catch (caught) {
			const message =
				caught instanceof Error ? caught.message : 'No se pudieron guardar las claves';
			return fail(400, { error: message });
		}
	}
};
