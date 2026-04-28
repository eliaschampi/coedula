import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasAnyPermission } from '$lib/permissions/server';
import { EducationRepository } from '$lib/server/repositories/education.repository';

const PAGE_SIZE = 25;

export const GET: RequestHandler = async ({ url, locals }) => {
	if (
		!hasAnyPermission(
			locals.userPermissions,
			locals.user,
			'students:read',
			'enrollments:read',
			'enrollments:create',
			'enrollments:update'
		)
	) {
		throw error(403, 'No tienes permisos para consultar alumnos');
	}

	const recent = url.searchParams.get('recent') === '1';
	const query = (url.searchParams.get('q') ?? '').trim();
	const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
	const offset = (page - 1) * PAGE_SIZE;

	if (recent) {
		const { rows, hasMore } = await EducationRepository.listRecentStudentsRegistroPaginated(
			locals.db,
			{ limit: PAGE_SIZE, offset }
		);
		return json({ items: rows, page, hasMore, list: 'recent' as const });
	}

	if (query.length < 2) {
		return json({ items: [], page, hasMore: false, list: 'search' as const });
	}

	const { rows, hasMore } = await EducationRepository.searchStudentsRegistroPaginated(locals.db, {
		query,
		limit: PAGE_SIZE,
		offset
	});

	return json({ items: rows, page, hasMore, list: 'search' as const });
};
