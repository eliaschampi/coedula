import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateDetailedEvaluationResultsCsv } from '$lib/server/services/evaluation-results-export.service';
import { isUuid } from '$lib/utils/validation';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!(await locals.can('evaluations:read'))) {
		throw error(403, 'No tienes permisos para exportar resultados de evaluaciones');
	}

	const evaluationCode = params.evaluationCode?.trim() ?? '';

	if (!evaluationCode || !isUuid(evaluationCode)) {
		throw error(400, 'La evaluación seleccionada no es válida');
	}

	try {
		const { filename, content } = await generateDetailedEvaluationResultsCsv(locals.db, evaluationCode);

		return new Response(content, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Cache-Control': 'private, no-store'
			}
		});
	} catch (caught) {
		const message =
			caught instanceof Error ? caught.message : 'No se pudieron exportar los resultados';
		throw error(
			message === 'La evaluación seleccionada no existe'
				? 404
				: message === 'No existen resultados guardados para exportar'
					? 409
					: 500,
			message
		);
	}
};
