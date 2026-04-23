import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { EvaluationRepository } from '$lib/server/repositories/evaluation.repository';
import { isUuid } from '$lib/utils/validation';

function normalizeReturnTo(value: string | null): string {
	const normalized = value?.trim() ?? '';

	if (!normalized.startsWith('/') || normalized.startsWith('//')) {
		return '/evaluations/results';
	}

	return normalized;
}

export const load: PageServerLoad = async ({ params, locals, url, depends }) => {
	depends('evaluations:result-detail');

	if (!(await locals.can('evaluations:read'))) {
		throw error(403, 'No tienes permisos para consultar el detalle del resultado');
	}

	const resultCode = (params.resultCode ?? '').trim();

	if (!resultCode || !isUuid(resultCode)) {
		throw error(400, 'Resultado inválido');
	}

	const result = await EvaluationRepository.getResultDetail(locals.db, resultCode);

	if (!result) {
		throw error(404, 'Resultado no encontrado');
	}

	return {
		title: `Resultado · ${result.student.full_name}`,
		result,
		returnTo: normalizeReturnTo(url.searchParams.get('returnTo'))
	};
};
