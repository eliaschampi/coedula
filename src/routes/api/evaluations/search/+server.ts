import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { EvaluationRepository } from '$lib/server/repositories/evaluation.repository';
import type { GroupCode } from '$lib/types/education';

const VALID_GROUPS = new Set<GroupCode>(['A', 'B', 'C', 'D']);

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('evaluations:read'))) {
		throw error(403, 'No tienes permisos para consultar evaluaciones');
	}

	const cycleCode = (url.searchParams.get('cycle') ?? '').trim();
	const cycleDegreeCode = (url.searchParams.get('degree') ?? '').trim();
	const requestedGroupCode = (url.searchParams.get('group') ?? 'A').trim().toUpperCase();
	const search = (url.searchParams.get('search') ?? '').trim();
	const configuredOnly = url.searchParams.get('configuredOnly') === 'true';

	if (!cycleCode || !cycleDegreeCode) {
		return json({ items: [] });
	}

	const groupCode = VALID_GROUPS.has(requestedGroupCode as GroupCode)
		? (requestedGroupCode as GroupCode)
		: 'A';

	const evaluations = await EvaluationRepository.listEvaluationsByFilters(locals.db, {
		cycleCode,
		cycleDegreeCode,
		groupCode,
		search
	});

	return json({
		items: (configuredOnly ? evaluations.filter((evaluation) => evaluation.has_questions) : evaluations).map(
			(evaluation) => ({
				code: evaluation.code,
				name: evaluation.name,
				eval_date: evaluation.eval_date
			})
		)
	});
};
