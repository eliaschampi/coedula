import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isUuid } from '$lib/utils/validation';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import { StudentDriveRepository } from '$lib/server/repositories/student-drive.repository';

export const load: PageServerLoad = async ({ params, locals, depends }) => {
	depends('students:profile');

	if (!(await locals.can('students:read'))) {
		throw error(403, 'No tienes permisos para consultar alumnos');
	}

	const { studentCode } = params;
	if (!studentCode || !isUuid(studentCode)) {
		throw error(400, 'Alumno inválido');
	}

	const [student, canReadEnrollments, canReadDrive, canUpdateStudents, canUpdateDrive] =
		await Promise.all([
			EducationRepository.findStudentByCode(locals.db, studentCode),
			locals.can('enrollments:read'),
			locals.can('drive:read'),
			locals.can('students:update'),
			locals.can('drive:update')
		]);

	if (!student) {
		throw error(404, 'Alumno no encontrado');
	}

	const [enrollments, linkedFiles] = await Promise.all([
		canReadEnrollments
			? EducationRepository.listStudentEnrollmentHistory(locals.db, studentCode)
			: Promise.resolve([]),
		canReadDrive ? StudentDriveRepository.listLinks(locals.db, studentCode) : Promise.resolve([])
	]);

	return {
		title: student.full_name,
		student,
		enrollments,
		linkedFiles,
		canReadEnrollments,
		canReadDrive,
		canManageAttachments: canUpdateStudents && canUpdateDrive
	};
};
