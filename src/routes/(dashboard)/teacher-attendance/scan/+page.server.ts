import type { PageServerLoad } from './$types';
import { TeacherAttendanceRepository } from '$lib/server/repositories/teacher-attendance.repository';

export const load: PageServerLoad = async ({ locals }) => {
	if (!(await locals.can('teacher_attendance:create'))) {
		return {
			title: 'Escanear asistencia docente',
			branches: []
		};
	}

	const branches = await TeacherAttendanceRepository.listAvailableBranches(locals.db);

	return {
		title: 'Escanear asistencia docente',
		branches
	};
};
