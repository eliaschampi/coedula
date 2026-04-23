import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { checkAllPermissions } from '$lib/permissions/server';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import { EvaluationRepository } from '$lib/server/repositories/evaluation.repository';
import { isUuid } from '$lib/utils/validation';

export const load: PageServerLoad = async ({ locals, url, depends }) => {
	depends('evaluations:student-results');

	if (!(await checkAllPermissions(locals.can, 'students:read', 'evaluations:read'))) {
		throw error(403, 'No tienes permisos para consultar resultados por alumno');
	}

	const requestedStudentCode = (url.searchParams.get('student') ?? '').trim();

	if (requestedStudentCode && !isUuid(requestedStudentCode)) {
		throw error(400, 'Alumno inválido');
	}

	const studentOptions = await EducationRepository.listStudentOptions(locals.db);

	if (!requestedStudentCode) {
		return {
			title: 'Resultados por alumno',
			studentOptions,
			student: null,
			results: []
		};
	}

	const [student, results] = await Promise.all([
		EducationRepository.findStudentByCode(locals.db, requestedStudentCode),
		EvaluationRepository.listStudentResults(locals.db, requestedStudentCode)
	]);

	if (!student) {
		throw error(404, 'Alumno no encontrado');
	}

	return {
		title: `Resultados · ${student.full_name}`,
		studentOptions,
		student,
		results
	};
};
