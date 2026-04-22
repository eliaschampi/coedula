import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { EvaluationRepository } from '$lib/server/repositories/evaluation.repository';
import { isUuid } from '$lib/utils/validation';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!(await locals.can('evaluations:read'))) {
		return json({ error: 'No tienes permisos para consultar resultados de evaluaciones' }, { status: 403 });
	}

	const evaluationCode = params.evaluationCode?.trim() ?? '';

	if (!isUuid(evaluationCode)) {
		return json({ error: 'La evaluación seleccionada no es válida' }, { status: 400 });
	}

	try {
		const results = await EvaluationRepository.listSavedResults(locals.db, evaluationCode);
		return json(results);
	} catch (error) {
		console.error('Error listing evaluation results:', error);
		return json({ error: 'No se pudieron obtener los resultados guardados' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	if (!(await locals.can('evaluations:update'))) {
		return json({ error: 'No tienes permisos para eliminar resultados de evaluaciones' }, { status: 403 });
	}

	const evaluationCode = params.evaluationCode?.trim() ?? '';

	if (!isUuid(evaluationCode)) {
		return json({ error: 'La evaluación seleccionada no es válida' }, { status: 400 });
	}

	const rawPayload = (await request.json().catch(() => ({}))) as { resultCodes?: unknown };
	const rawCodes = Array.isArray(rawPayload.resultCodes) ? rawPayload.resultCodes : [];
	const resultCodes = rawCodes
		.filter((value): value is string => typeof value === 'string')
		.map((value) => value.trim());

	if (resultCodes.some((value) => !isUuid(value))) {
		return json({ error: 'Uno o más resultados seleccionados no son válidos' }, { status: 400 });
	}

	try {
		const deletedCount = await EvaluationRepository.deleteSavedResults(
			locals.db,
			evaluationCode,
			resultCodes
		);

		return json({
			success: true,
			deletedCount,
			message:
				resultCodes.length === 0
					? 'Todos los resultados guardados fueron eliminados'
					: `${deletedCount} resultado(s) fueron eliminados`
		});
	} catch (error) {
		console.error('Error deleting evaluation results:', error);
		return json({ error: 'No se pudieron eliminar los resultados guardados' }, { status: 500 });
	}
};
