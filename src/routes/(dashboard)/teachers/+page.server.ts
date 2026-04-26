import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { readFormField } from '$lib/utils/formData';
import { isUuid } from '$lib/utils/validation';
import {
	isTeacherWeekday,
	normalizeTeacherTimeInput,
	parseTeacherToleranceMinutes
} from '$lib/utils/teacher';
import { TeacherRepository } from '$lib/server/repositories/teacher.repository';
import { TeacherAttendanceRepository } from '$lib/server/repositories/teacher-attendance.repository';
import type { TeacherWeekday } from '$lib/types/teacher';

const DUPLICATE_KEY_CODE = '23505';

export const load: PageServerLoad = async ({ locals, depends, url }) => {
	depends('teachers:load');

	if (!(await locals.can('teachers:read'))) {
		return {
			title: 'Docentes',
			teachers: [],
			branches: [],
			searchQuery: ''
		};
	}

	const searchQuery = (url.searchParams.get('search') ?? '').trim();
	const [teachers, branches] = await Promise.all([
		TeacherRepository.listDirectory(locals.db, searchQuery),
		TeacherAttendanceRepository.listAvailableBranches(locals.db)
	]);

	return {
		title: 'Docentes',
		teachers,
		branches,
		searchQuery
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!(await locals.can('teachers:create'))) {
			return fail(403, { error: 'No tienes permisos para crear docentes' });
		}

		try {
			const formData = await request.formData();
			const firstName = readFormField(formData, 'first_name');
			const lastName = readFormField(formData, 'last_name');
			const phone = readFormField(formData, 'phone');

			if (!firstName) {
				return fail(400, { error: 'Los nombres son obligatorios' });
			}

			if (!lastName) {
				return fail(400, { error: 'Los apellidos son obligatorios' });
			}

			await TeacherRepository.create(locals.db, {
				firstName,
				lastName,
				phone: phone || null
			});

			return { success: true, type: 'success' };
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'No se pudo crear el docente';
			return fail(400, { error: message });
		}
	},

	update: async ({ locals, request }) => {
		if (!(await locals.can('teachers:update'))) {
			return fail(403, { error: 'No tienes permisos para actualizar docentes' });
		}

		try {
			const formData = await request.formData();
			const teacherCode = readFormField(formData, 'code');
			const firstName = readFormField(formData, 'first_name');
			const lastName = readFormField(formData, 'last_name');
			const phone = readFormField(formData, 'phone');

			if (!isUuid(teacherCode)) {
				return fail(400, { error: 'El docente seleccionado no es válido' });
			}

			if (!firstName) {
				return fail(400, { error: 'Los nombres son obligatorios' });
			}

			if (!lastName) {
				return fail(400, { error: 'Los apellidos son obligatorios' });
			}

			const updated = await TeacherRepository.update(locals.db, {
				teacherCode,
				firstName,
				lastName,
				phone: phone || null
			});

			if (!updated) {
				return fail(404, { error: 'Docente no encontrado' });
			}

			return { success: true, type: 'success' };
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'No se pudo actualizar el docente';
			return fail(400, { error: message });
		}
	},

	delete: async ({ locals, request }) => {
		if (!(await locals.can('teachers:delete'))) {
			return fail(403, { error: 'No tienes permisos para eliminar docentes' });
		}

		try {
			const formData = await request.formData();
			const teacherCode = readFormField(formData, 'code');

			if (!isUuid(teacherCode)) {
				return fail(400, { error: 'El docente seleccionado no es válido' });
			}

			const deleted = await TeacherRepository.delete(locals.db, teacherCode);

			if (!deleted) {
				return fail(404, { error: 'Docente no encontrado' });
			}

			return { success: true, type: 'success' };
		} catch (caught) {
			const dbError = caught as { code?: string };
			if (dbError.code === '23503') {
				return fail(400, {
					error: 'No se puede eliminar el docente porque tiene asistencias asociadas'
				});
			}
			const message = caught instanceof Error ? caught.message : 'No se pudo eliminar el docente';
			return fail(400, { error: message });
		}
	},

	create_schedule: async ({ locals, request }) => {
		if (!(await locals.can('teachers:update'))) {
			return fail(403, { error: 'No tienes permisos para configurar horarios' });
		}

		try {
			const formData = await request.formData();
			const teacherCode = readFormField(formData, 'teacher_code');
			const branchCode = readFormField(formData, 'branch_code');
			const weekdayValue = Number(readFormField(formData, 'weekday'));
			const entryTime = normalizeTeacherTimeInput(readFormField(formData, 'entry_time'));
			const tolerance = parseTeacherToleranceMinutes(readFormField(formData, 'tolerance_minutes'));

			if (!isUuid(teacherCode)) {
				return fail(400, { error: 'El docente seleccionado no es válido' });
			}

			if (!isUuid(branchCode)) {
				return fail(400, { error: 'La sede seleccionada no es válida' });
			}

			if (!Number.isInteger(weekdayValue) || !isTeacherWeekday(weekdayValue)) {
				return fail(400, { error: 'Debe seleccionar un día de la semana válido' });
			}

			if (!entryTime) {
				return fail(400, { error: 'La hora de ingreso debe tener un formato válido' });
			}

			if (tolerance === null) {
				return fail(400, { error: 'La tolerancia debe ser un entero entre 0 y 240 minutos' });
			}

			await TeacherRepository.createSchedule(locals.db, {
				teacherCode,
				branchCode,
				weekday: weekdayValue as TeacherWeekday,
				entryTime,
				toleranceMinutes: tolerance
			});

			return { success: true, type: 'success' };
		} catch (caught) {
			const dbError = caught as { code?: string };
			if (dbError.code === DUPLICATE_KEY_CODE) {
				return fail(400, {
					error: 'Ya existe un horario con la misma hora para esta sede y día'
				});
			}

			const message = caught instanceof Error ? caught.message : 'No se pudo crear el horario';
			return fail(400, { error: message });
		}
	},

	delete_schedule: async ({ locals, request }) => {
		if (!(await locals.can('teachers:update'))) {
			return fail(403, { error: 'No tienes permisos para eliminar horarios' });
		}

		try {
			const formData = await request.formData();
			const scheduleCode = readFormField(formData, 'schedule_code');

			if (!isUuid(scheduleCode)) {
				return fail(400, { error: 'El horario seleccionado no es válido' });
			}

			const deleted = await TeacherRepository.deleteSchedule(locals.db, scheduleCode);
			if (!deleted) {
				return fail(404, { error: 'Horario no encontrado' });
			}

			return { success: true, type: 'success' };
		} catch (caught) {
			const dbError = caught as { code?: string };
			if (dbError.code === '23503') {
				return fail(400, {
					error: 'No se puede eliminar el horario porque tiene asistencias asociadas'
				});
			}
			const message = caught instanceof Error ? caught.message : 'No se pudo eliminar el horario';
			return fail(400, { error: message });
		}
	}
};
