import type { PageServerLoad } from './$types';
import { EducationRepository } from '$lib/server/repositories/education.repository';

export const load: PageServerLoad = async ({ locals, depends, url }) => {
	depends('students:load');

	const searchQuery = (url.searchParams.get('search') ?? '').trim();

	if (!(await locals.can('students:read'))) {
		return {
			title: 'Alumnos',
			searchQuery,
			students: [],
			summary: {
				activeStudents: 0,
				studentsWithEnrollments: 0,
				totalEnrollments: 0
			}
		};
	}

	const [summary, students] = await Promise.all([
		EducationRepository.getStudentDirectorySummary(locals.db),
		EducationRepository.searchStudents(locals.db, searchQuery)
	]);

	return {
		title: 'Alumnos',
		searchQuery,
		summary,
		students
	};
};
