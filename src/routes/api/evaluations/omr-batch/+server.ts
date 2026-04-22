import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { EvaluationProcessingService } from '$lib/server/services/evaluation-processing.service';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!(await locals.can('evaluations:update'))) {
		return json(
			{
				success: false,
				error: {
					code: 'FORBIDDEN',
					message: 'No tienes permisos para procesar evaluaciones'
				},
				results: []
			},
			{ status: 403 }
		);
	}

	try {
		const rawPayload = await request.json().catch(() => null);
		const payload = EvaluationProcessingService.validateBatchRequest(rawPayload);
		const response = await EvaluationProcessingService.processBatch(locals.db, payload);
		return json(response);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'No se pudo procesar el lote de imágenes';

		return json(
			{
				success: false,
				error: {
					code: 'INVALID_PARAMS',
					message
				},
				results: []
			},
			{ status: 400 }
		);
	}
};
