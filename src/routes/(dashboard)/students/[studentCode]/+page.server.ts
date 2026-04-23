import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isUuid } from '$lib/utils/validation';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import { StudentDriveRepository } from '$lib/server/repositories/student-drive.repository';
import { CashboxRepository } from '$lib/server/repositories/cashbox.repository';

export const load: PageServerLoad = async ({ params, locals, depends }) => {
	depends('students:profile');

	if (!(await locals.can('students:read'))) {
		throw error(403, 'No tienes permisos para consultar alumnos');
	}

	const { studentCode } = params;
	if (!studentCode || !isUuid(studentCode)) {
		throw error(400, 'Alumno inválido');
	}

	const [
		student,
		canReadEnrollments,
		canReadDrive,
		canReadPayments,
		canUpdateStudents,
		canUpdateDrive
	] = await Promise.all([
		EducationRepository.findStudentByCode(locals.db, studentCode),
		locals.can('enrollments:read'),
		locals.can('drive:read'),
		locals.can('payments:read'),
		locals.can('students:update'),
		locals.can('drive:update')
	]);

	if (!student) {
		throw error(404, 'Alumno no encontrado');
	}

	const [enrollments, linkedFiles, studentPayments] = await Promise.all([
		canReadEnrollments
			? EducationRepository.listStudentEnrollmentHistory(locals.db, studentCode)
			: Promise.resolve([]),
		canReadDrive ? StudentDriveRepository.listLinks(locals.db, studentCode) : Promise.resolve([]),
		canReadPayments
			? CashboxRepository.listPaymentsByStudent(locals.db, studentCode)
			: Promise.resolve([])
	]);

	return {
		title: student.full_name,
		student,
		enrollments,
		studentPayments,
		linkedFiles,
		canReadEnrollments,
		canReadDrive,
		canReadPayments,
		canManageAttachments: canUpdateStudents && canUpdateDrive
	};
};

export const actions: Actions = {
	delete: async ({ locals, params }) => {
		if (!(await locals.can('students:delete'))) {
			return fail(403, { error: 'No tienes permisos para eliminar alumnos' });
		}

		const studentCode = (params.studentCode ?? '').trim();
		if (!studentCode || !isUuid(studentCode)) {
			return fail(400, { error: 'El alumno seleccionado no es válido' });
		}

		try {
			const deleted = await EducationRepository.deleteStudent(locals.db, studentCode);

			if (!deleted) {
				return fail(404, { error: 'El alumno no fue encontrado' });
			}

			return { success: true, type: 'success' };
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'No se pudo eliminar el alumno';
			return fail(400, { error: message });
		}
	}
};
