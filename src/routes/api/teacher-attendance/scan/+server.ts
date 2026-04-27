import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { WORKSPACE } from '$lib/messages/workspace';
import { TeacherAttendanceRepository } from '$lib/server/repositories/teacher-attendance.repository';
import { getWorkspaceBranchUuid } from '$lib/server/user-branch.server';
import { normalizeTeacherNumberInput } from '$lib/utils/teacher';
import {
	TeacherAttendanceOutOfWindowError,
	TeacherScheduleNotFoundError
} from '$lib/server/services/teacher-attendance.service';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!(await locals.can('teacher_attendance:create'))) {
		return json(
			{ message: 'No tienes permisos para registrar asistencia docente' },
			{ status: 403 }
		);
	}

	const payload = (await request.json().catch(() => ({}))) as {
		teacher_number?: string;
	};

	const teacherNumber = normalizeTeacherNumberInput(payload.teacher_number);
	const branchCode = getWorkspaceBranchUuid(locals.user);

	if (!teacherNumber) {
		return json(
			{ message: 'Debe ingresar un número de docente válido (TCH-XXXXXX)' },
			{ status: 400 }
		);
	}

	if (!branchCode) {
		return json({ message: WORKSPACE.api.scanMissingBranch }, { status: 400 });
	}

	try {
		const result = await TeacherAttendanceRepository.registerByTeacherNumber(
			locals.db,
			teacherNumber,
			branchCode,
			new Date()
		);

		return json(result);
	} catch (caught) {
		if (caught instanceof TeacherAttendanceOutOfWindowError) {
			return json(
				{
					code: 'out_of_window',
					message: caught.message,
					closest_entry_time: caught.closestEntryTime,
					tolerance_minutes: caught.toleranceMinutes
				},
				{ status: 400 }
			);
		}

		if (caught instanceof TeacherScheduleNotFoundError) {
			return json({ code: 'schedule_not_found', message: caught.message }, { status: 400 });
		}

		const message =
			caught instanceof Error ? caught.message : 'No se pudo registrar la asistencia docente';
		return json({ message }, { status: 400 });
	}
};
