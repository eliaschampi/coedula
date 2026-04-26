import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isUuid } from '$lib/utils/validation';
import { formatLocalDateValue } from '$lib/utils';
import { getTeacherWeekdayFromDate } from '$lib/utils/teacher';
import { TeacherAttendanceRepository } from '$lib/server/repositories/teacher-attendance.repository';
import { TeacherRepository } from '$lib/server/repositories/teacher.repository';
import {
	readTeacherAttendanceCreatePayload,
	readTeacherAttendanceUpdatePayload
} from '$lib/server/services/teacher-attendance-form.service';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDateFilter(value: string | null, fallback: string): string {
	const normalized = value?.trim() ?? '';
	return ISO_DATE_REGEX.test(normalized) ? normalized : fallback;
}

export const load: PageServerLoad = async ({ locals, depends, url }) => {
	depends('teacher_attendance:load');

	const today = formatLocalDateValue();

	if (!(await locals.can('teacher_attendance:read'))) {
		return {
			title: 'Asistencia docente',
			rows: [],
			branches: [],
			teachers: [],
			schedulesForDay: [],
			selectedBranchCode: null,
			selectedDate: today,
			today
		};
	}

	const branches = await TeacherAttendanceRepository.listAvailableBranches(locals.db);
	const requestedBranchCode = (url.searchParams.get('branch') ?? '').trim();
	const selectedBranchCode =
		branches.find((branch) => branch.code === requestedBranchCode)?.code ??
		branches[0]?.code ??
		null;
	const selectedDate = normalizeDateFilter(url.searchParams.get('date'), today);
	const weekday = getTeacherWeekdayFromDate(selectedDate);

	const [rows, teachers, schedulesForDay] = await Promise.all([
		selectedBranchCode
			? TeacherAttendanceRepository.listByFilters(locals.db, {
					branchCode: selectedBranchCode,
					attendanceDate: selectedDate
				})
			: Promise.resolve([]),
		TeacherRepository.listOptions(locals.db),
		selectedBranchCode
			? TeacherRepository.listSchedulesByBranchAndWeekday(locals.db, selectedBranchCode, weekday)
			: Promise.resolve([])
	]);

	return {
		title: 'Asistencia docente',
		rows,
		branches,
		teachers,
		schedulesForDay,
		selectedBranchCode,
		selectedDate,
		today
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!(await locals.can('teacher_attendance:create'))) {
			return fail(403, { error: 'No tienes permisos para registrar asistencia docente' });
		}

		try {
			const formData = await request.formData();
			const payload = readTeacherAttendanceCreatePayload(formData);

			if ('error' in payload) {
				return fail(400, { error: payload.error });
			}

			await TeacherAttendanceRepository.create(locals.db, payload);

			return { success: true, type: 'success' };
		} catch (caught) {
			const dbError = caught as { code?: string };
			if (dbError.code === '23505') {
				return fail(400, {
					error: 'Ya existe una asistencia para este horario en la fecha seleccionada'
				});
			}
			const message =
				caught instanceof Error ? caught.message : 'No se pudo registrar la asistencia';
			return fail(400, { error: message });
		}
	},

	update: async ({ locals, request }) => {
		if (!(await locals.can('teacher_attendance:update'))) {
			return fail(403, { error: 'No tienes permisos para editar asistencia docente' });
		}

		try {
			const formData = await request.formData();
			const payload = readTeacherAttendanceUpdatePayload(formData);

			if ('error' in payload) {
				return fail(400, { error: payload.error });
			}

			const updated = await TeacherAttendanceRepository.update(locals.db, payload);

			if (!updated) {
				return fail(404, { error: 'El registro de asistencia no fue encontrado' });
			}

			return { success: true, type: 'success' };
		} catch (caught) {
			const message =
				caught instanceof Error ? caught.message : 'No se pudo actualizar la asistencia';
			return fail(400, { error: message });
		}
	},

	delete: async ({ locals, request }) => {
		if (!(await locals.can('teacher_attendance:delete'))) {
			return fail(403, { error: 'No tienes permisos para eliminar asistencia docente' });
		}

		try {
			const formData = await request.formData();
			const attendanceCode = formData.get('code');
			const code = typeof attendanceCode === 'string' ? attendanceCode.trim() : '';

			if (!isUuid(code)) {
				return fail(400, { error: 'El registro de asistencia seleccionado no es válido' });
			}

			const deleted = await TeacherAttendanceRepository.delete(locals.db, code);
			if (!deleted) {
				return fail(404, { error: 'El registro de asistencia no fue encontrado' });
			}

			return { success: true, type: 'success' };
		} catch (caught) {
			const message =
				caught instanceof Error ? caught.message : 'No se pudo eliminar la asistencia';
			return fail(400, { error: message });
		}
	}
};
