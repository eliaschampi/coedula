import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { readFormCheckbox, readFormField, readFormFieldList } from '$lib/utils/formData';
import { areUuids, isUuid } from '$lib/utils/validation';
import { EducationRepository } from '$lib/server/repositories/education.repository';

function isValidDateInput(value: string): boolean {
	if (!value) return false;
	const date = new Date(`${value}T00:00:00`);
	return !Number.isNaN(date.getTime());
}

function isValidTimeInput(value: string): boolean {
	return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function parseMoney(value: string, fieldLabel: string): number | null {
	if (!value) return null;
	const parsed = Number.parseFloat(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error(`${fieldLabel} debe ser un monto válido mayor o igual a 0`);
	}
	return parsed;
}

function parseMinutes(value: string, fieldLabel: string): number {
	if (!value) return 0;
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error(`${fieldLabel} debe ser un número válido mayor o igual a 0`);
	}
	return parsed;
}

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('cycles:load');

	if (!(await locals.can('cycles:read'))) {
		return {
			title: 'Ciclos',
			cycles: [],
			branches: [],
			degreeCatalog: [],
			cycleDegreeMap: {}
		};
	}

	const [cycles, branches, degreeCatalog, cycleDegreeOptions] = await Promise.all([
		EducationRepository.listCycles(locals.db),
		locals.db.selectFrom('branches').select(['code', 'name']).orderBy('name', 'asc').execute(),
		EducationRepository.listDegreeCatalog(locals.db),
		EducationRepository.listCycleDegreeOptions(locals.db)
	]);

	const cycleDegreeMap = cycleDegreeOptions.reduce<Record<string, string[]>>((acc, option) => {
		if (!acc[option.cycle_code]) {
			acc[option.cycle_code] = [];
		}
		acc[option.cycle_code].push(option.degree_code);
		return acc;
	}, {});

	return {
		title: 'Ciclos',
		cycles,
		branches,
		degreeCatalog,
		cycleDegreeMap
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!(await locals.can('cycles:create'))) {
			return fail(403, { error: 'No tienes permisos para crear ciclos' });
		}

		try {
			const formData = await request.formData();
			const title = readFormField(formData, 'title');
			const branchCode = readFormField(formData, 'branch_code');
			const modality = readFormField(formData, 'modality');
			const startDate = readFormField(formData, 'start_date');
			const endDate = readFormField(formData, 'end_date');
			const baseCost = parseMoney(readFormField(formData, 'base_cost'), 'El costo base');
			const turn1AttendanceTime = readFormField(formData, 'turn_1_attendance_time');
			const turn2AttendanceTime = readFormField(formData, 'turn_2_attendance_time');
			const turn1ToleranceMinutes = parseMinutes(
				readFormField(formData, 'turn_1_tolerance_minutes'),
				'La tolerancia del turno 1'
			);
			const turn2ToleranceMinutes = parseMinutes(
				readFormField(formData, 'turn_2_tolerance_minutes'),
				'La tolerancia del turno 2'
			);
			const notes = readFormField(formData, 'notes');
			const degreeCodes = readFormFieldList(formData, 'degree_codes');
			const isActive = readFormCheckbox(formData, 'is_active');

			if (!title) {
				return fail(400, { error: 'El nombre del ciclo es obligatorio' });
			}

			if (!branchCode || !isUuid(branchCode)) {
				return fail(400, { error: 'Debe seleccionar una sede válida' });
			}

			if (!modality) {
				return fail(400, { error: 'La modalidad es obligatoria' });
			}

			if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) {
				return fail(400, { error: 'Debe indicar un rango de fechas válido' });
			}

			if (!isValidTimeInput(turn1AttendanceTime)) {
				return fail(400, {
					error: 'La hora de asistencia del turno 1 es obligatoria y debe ser válida'
				});
			}

			if (turn2AttendanceTime && !isValidTimeInput(turn2AttendanceTime)) {
				return fail(400, {
					error: 'La hora de asistencia del turno 2 debe ser válida cuando se configure'
				});
			}

			if (new Date(`${endDate}T00:00:00`).getTime() < new Date(`${startDate}T00:00:00`).getTime()) {
				return fail(400, { error: 'La fecha final no puede ser menor a la fecha inicial' });
			}

			if (degreeCodes.length === 0 || !areUuids(degreeCodes)) {
				return fail(400, { error: 'Debe seleccionar al menos un grado válido' });
			}

			await EducationRepository.createCycle(
				locals.db,
				EducationRepository.normalizeCycleInput({
					branchCode,
					title,
					modality,
					startDate,
					endDate,
					baseCost: baseCost ?? 0,
					turn1AttendanceTime,
					turn1ToleranceMinutes,
					turn2AttendanceTime,
					turn2ToleranceMinutes: turn2AttendanceTime ? turn2ToleranceMinutes : 0,
					isActive,
					notes,
					degreeCodes
				})
			);

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'No se pudo crear el ciclo';
			return fail(400, { error: message });
		}
	},

	update: async ({ locals, request }) => {
		if (!(await locals.can('cycles:update'))) {
			return fail(403, { error: 'No tienes permisos para actualizar ciclos' });
		}

		try {
			const formData = await request.formData();
			const cycleCode = readFormField(formData, 'code');
			const title = readFormField(formData, 'title');
			const branchCode = readFormField(formData, 'branch_code');
			const modality = readFormField(formData, 'modality');
			const startDate = readFormField(formData, 'start_date');
			const endDate = readFormField(formData, 'end_date');
			const baseCost = parseMoney(readFormField(formData, 'base_cost'), 'El costo base');
			const turn1AttendanceTime = readFormField(formData, 'turn_1_attendance_time');
			const turn2AttendanceTime = readFormField(formData, 'turn_2_attendance_time');
			const turn1ToleranceMinutes = parseMinutes(
				readFormField(formData, 'turn_1_tolerance_minutes'),
				'La tolerancia del turno 1'
			);
			const turn2ToleranceMinutes = parseMinutes(
				readFormField(formData, 'turn_2_tolerance_minutes'),
				'La tolerancia del turno 2'
			);
			const notes = readFormField(formData, 'notes');
			const degreeCodes = readFormFieldList(formData, 'degree_codes');
			const isActive = readFormCheckbox(formData, 'is_active');

			if (!cycleCode || !isUuid(cycleCode)) {
				return fail(400, { error: 'El ciclo seleccionado no es válido' });
			}

			if (!title) {
				return fail(400, { error: 'El nombre del ciclo es obligatorio' });
			}

			if (!branchCode || !isUuid(branchCode)) {
				return fail(400, { error: 'Debe seleccionar una sede válida' });
			}

			if (!modality) {
				return fail(400, { error: 'La modalidad es obligatoria' });
			}

			if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) {
				return fail(400, { error: 'Debe indicar un rango de fechas válido' });
			}

			if (!isValidTimeInput(turn1AttendanceTime)) {
				return fail(400, {
					error: 'La hora de asistencia del turno 1 es obligatoria y debe ser válida'
				});
			}

			if (turn2AttendanceTime && !isValidTimeInput(turn2AttendanceTime)) {
				return fail(400, {
					error: 'La hora de asistencia del turno 2 debe ser válida cuando se configure'
				});
			}

			if (new Date(`${endDate}T00:00:00`).getTime() < new Date(`${startDate}T00:00:00`).getTime()) {
				return fail(400, { error: 'La fecha final no puede ser menor a la fecha inicial' });
			}

			if (degreeCodes.length === 0 || !areUuids(degreeCodes)) {
				return fail(400, { error: 'Debe seleccionar al menos un grado válido' });
			}

			await EducationRepository.updateCycle(
				locals.db,
				EducationRepository.normalizeCycleInput({
					cycleCode,
					branchCode,
					title,
					modality,
					startDate,
					endDate,
					baseCost: baseCost ?? 0,
					turn1AttendanceTime,
					turn1ToleranceMinutes,
					turn2AttendanceTime,
					turn2ToleranceMinutes: turn2AttendanceTime ? turn2ToleranceMinutes : 0,
					isActive,
					notes,
					degreeCodes
				})
			);

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'No se pudo actualizar el ciclo';
			return fail(400, { error: message });
		}
	},

	delete: async ({ locals, request }) => {
		if (!(await locals.can('cycles:delete'))) {
			return fail(403, { error: 'No tienes permisos para eliminar ciclos' });
		}

		const formData = await request.formData();
		const cycleCode = readFormField(formData, 'code');

		if (!cycleCode || !isUuid(cycleCode)) {
			return fail(400, { error: 'El ciclo seleccionado no es válido' });
		}

		try {
			const deleted = await EducationRepository.deleteCycle(locals.db, cycleCode);

			if (!deleted) {
				return fail(404, { error: 'El ciclo no fue encontrado' });
			}

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'No se pudo eliminar el ciclo';
			return fail(400, { error: message });
		}
	}
};
