import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { EducationRepository } from '$lib/server/repositories/education.repository';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('students:read'))) {
		throw error(403, 'No tienes permisos para consultar alumnos');
	}

	const query = (url.searchParams.get('q') ?? '').trim();
	const results = await EducationRepository.searchStudents(locals.db, query, 12);

	return json({ items: results });
};
