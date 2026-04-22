import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isUuid } from '$lib/utils/validation';
import { EducationRepository } from '$lib/server/repositories/education.repository';

export const load: PageServerLoad = async ({ params, locals, depends }) => {
	depends('students:profile');

	if (!(await locals.can('students:read'))) {
		throw error(403, 'No tienes permisos para consultar alumnos');
	}

	const { studentCode } = params;
	if (!studentCode || !isUuid(studentCode)) {
		throw error(400, 'Alumno inválido');
	}

	const [student, enrollments] = await Promise.all([
		EducationRepository.findStudentByCode(locals.db, studentCode),
		EducationRepository.listStudentEnrollmentHistory(locals.db, studentCode)
	]);

	if (!student) {
		throw error(404, 'Alumno no encontrado');
	}

	return {
		title: student.full_name,
		student,
		enrollments
	};
};
