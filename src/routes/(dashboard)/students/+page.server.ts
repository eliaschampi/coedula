import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { readFormField } from '$lib/utils/formData';
import { isUuid } from '$lib/utils/validation';
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

export const actions: Actions = {
	delete: async ({ locals, request }) => {
		if (!(await locals.can('students:delete'))) {
			return fail(403, { error: 'No tienes permisos para eliminar alumnos' });
		}

		const formData = await request.formData();
		const studentCode = readFormField(formData, 'code');

		if (!studentCode || !isUuid(studentCode)) {
			return fail(400, { error: 'El alumno seleccionado no es válido' });
		}

		try {
			const deleted = await EducationRepository.deleteStudent(locals.db, studentCode);

			if (!deleted) {
				return fail(404, { error: 'El alumno no fue encontrado' });
			}

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'No se pudo eliminar el alumno';
			return fail(400, { error: message });
		}
	}
};
