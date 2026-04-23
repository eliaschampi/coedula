import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasAnyPermission } from '$lib/permissions/server';
import { EducationRepository } from '$lib/server/repositories/education.repository';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (
		!hasAnyPermission(
			locals.userPermissions,
			locals.user,
			'students:read',
			'enrollments:create',
			'enrollments:update',
			'payments:create',
			'payments:update'
		)
	) {
		throw error(403, 'No tienes permisos para consultar alumnos');
	}

	const query = (url.searchParams.get('q') ?? '').trim();
	const results = await EducationRepository.searchStudentOptions(locals.db, query, 12);

	return json({ items: results });
};
