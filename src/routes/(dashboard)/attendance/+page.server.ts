import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { readFormField } from '$lib/utils/formData';
import { isUuid } from '$lib/utils/validation';
import { formatLocalDateValue, normalizeAttendanceTurnFilter } from '$lib/utils';
import type { CycleOption, EnrollmentTurn, GroupCode } from '$lib/types/education';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import { AttendanceRepository } from '$lib/server/repositories/attendance.repository';
import {
	readAttendanceFormPayload,
	validateAttendanceFormPayload
} from '$lib/server/services/attendance-form.service';

const VALID_GROUPS = new Set<GroupCode>(['A', 'B', 'C', 'D']);

function normalizeDateFilter(value: string | null, fallback: string): string {
	const normalized = value?.trim() ?? '';
	return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : fallback;
}

function normalizeGroupFilter(value: string | null): GroupCode {
	const normalized = (value ?? 'A').trim().toUpperCase() as GroupCode;
	return VALID_GROUPS.has(normalized) ? normalized : 'A';
}

function getCycleAttendanceTurns(cycle: CycleOption | null | undefined): EnrollmentTurn[] {
	if (!cycle) return ['turn_1'];

	const turns: EnrollmentTurn[] = [];
	if (cycle.turn_1_attendance_time) {
		turns.push('turn_1');
	}
	if (cycle.turn_2_attendance_time) {
		turns.push('turn_2');
	}

	return turns.length > 0 ? turns : ['turn_1'];
}

export const load: PageServerLoad = async ({ locals, depends, url }) => {
	depends('attendance:load');

	const today = formatLocalDateValue();

	if (!(await locals.can('attendance:read'))) {
		return {
			title: 'Asistencia',
			rows: [],
			cycles: [],
			cycleDegreeOptions: [],
			selectedCycleCode: null,
			selectedCycleDegreeCode: null,
			selectedGroupCode: 'A' as GroupCode,
			selectedTurn: 'turn_1' as EnrollmentTurn,
			selectedDate: today,
			searchQuery: '',
			today
		};
	}

	const requestedCycleCode = (url.searchParams.get('cycle') ?? '').trim();
	const requestedCycleDegreeCode = (url.searchParams.get('degree') ?? '').trim();
	const requestedGroupCode = normalizeGroupFilter(url.searchParams.get('group'));
	const requestedTurn = normalizeAttendanceTurnFilter(url.searchParams.get('turn'));
	const requestedDate = normalizeDateFilter(url.searchParams.get('date'), today);
	const searchQuery = (url.searchParams.get('search') ?? '').trim();

	const [cycles, allCycleDegreeOptions] = await Promise.all([
		EducationRepository.listCycleOptions(locals.db),
		EducationRepository.listCycleDegreeOptions(locals.db)
	]);

	const selectedCycleCode =
		cycles.find((cycle) => cycle.code === requestedCycleCode)?.code ?? cycles[0]?.code ?? null;
	const selectedCycle = cycles.find((cycle) => cycle.code === selectedCycleCode) ?? null;
	const availableTurns = getCycleAttendanceTurns(selectedCycle);
	const cycleDegreeOptions = allCycleDegreeOptions.filter(
		(option) => option.cycle_code === selectedCycleCode
	);
	const selectedCycleDegreeCode =
		cycleDegreeOptions.find((option) => option.code === requestedCycleDegreeCode)?.code ??
		cycleDegreeOptions[0]?.code ??
		null;
	const selectedTurn =
		requestedTurn && availableTurns.includes(requestedTurn) ? requestedTurn : availableTurns[0];

	let rows =
		selectedCycleCode && selectedCycleDegreeCode
			? await AttendanceRepository.listDailyByFilters(locals.db, {
					attendanceDate: requestedDate,
					cycleCode: selectedCycleCode,
					cycleDegreeCode: selectedCycleDegreeCode,
					groupCode: requestedGroupCode,
					turn: selectedTurn,
					search: searchQuery
				})
			: [];

	let resolvedTurn = selectedTurn;

	if (
		!requestedTurn &&
		rows.length === 0 &&
		availableTurns[1] &&
		selectedCycleCode &&
		selectedCycleDegreeCode
	) {
		resolvedTurn = availableTurns[1];
		rows = await AttendanceRepository.listDailyByFilters(locals.db, {
			attendanceDate: requestedDate,
			cycleCode: selectedCycleCode,
			cycleDegreeCode: selectedCycleDegreeCode,
			groupCode: requestedGroupCode,
			turn: resolvedTurn,
			search: searchQuery
		});
	}

	return {
		title: 'Asistencia',
		rows,
		cycles,
		cycleDegreeOptions: allCycleDegreeOptions,
		selectedCycleCode,
		selectedCycleDegreeCode,
		selectedGroupCode: requestedGroupCode,
		selectedTurn: resolvedTurn,
		selectedDate: requestedDate,
		searchQuery,
		today
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!(await locals.can('attendance:create'))) {
			return fail(403, { error: 'No tienes permisos para registrar asistencia' });
		}

		try {
			const formData = await request.formData();
			const payload = readAttendanceFormPayload(formData);
			const validationError = validateAttendanceFormPayload(payload);

			if (validationError) {
				return fail(400, { error: validationError });
			}

			if (!isUuid(payload.enrollmentCode)) {
				return fail(400, { error: 'Debe seleccionar una matrícula válida' });
			}

			await AttendanceRepository.createAttendance(locals.db, payload);

			return { success: true, type: 'success' };
		} catch (caught) {
			const dbError = caught as { code?: string };
			if (dbError.code === '23505') {
				return fail(400, {
					error: 'La asistencia para este alumno ya fue registrada en la fecha seleccionada'
				});
			}

			const message =
				caught instanceof Error ? caught.message : 'No se pudo registrar la asistencia';
			return fail(400, { error: message });
		}
	},

	update: async ({ locals, request }) => {
		if (!(await locals.can('attendance:update'))) {
			return fail(403, { error: 'No tienes permisos para editar asistencia' });
		}

		try {
			const formData = await request.formData();
			const attendanceCode = readFormField(formData, 'code');
			const payload = readAttendanceFormPayload(formData);
			const validationError = validateAttendanceFormPayload(payload);

			if (validationError) {
				return fail(400, { error: validationError });
			}

			if (!attendanceCode || !isUuid(attendanceCode)) {
				return fail(400, { error: 'El registro de asistencia seleccionado no es válido' });
			}

			const updated = await AttendanceRepository.updateAttendance(locals.db, {
				...payload,
				attendanceCode
			});

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

	complete_missing: async ({ locals, request }) => {
		if (!(await locals.can('attendance:create'))) {
			return fail(403, { error: 'No tienes permisos para completar asistencias pendientes' });
		}

		const formData = await request.formData();
		const attendanceDate = normalizeDateFilter(readFormField(formData, 'attendance_date'), '');
		const today = formatLocalDateValue();

		if (attendanceDate !== today) {
			return fail(400, {
				error: 'Solo puedes completar faltas automáticas para la fecha actual'
			});
		}

		const cycleDegreeCode = readFormField(formData, 'cycle_degree_code');
		if (!cycleDegreeCode || !isUuid(cycleDegreeCode)) {
			return fail(400, { error: 'Debe seleccionar un grado válido para completar asistencias' });
		}

		try {
			const selectedTurn =
				normalizeAttendanceTurnFilter(readFormField(formData, 'turn')) ?? 'turn_1';
			const insertedCount = await AttendanceRepository.completeMissingForFilters(locals.db, {
				attendanceDate,
				cycleCode: normalizeNullable(readFormField(formData, 'cycle_code')),
				cycleDegreeCode,
				groupCode: normalizeGroupFilter(readFormField(formData, 'group_code')),
				turn: selectedTurn
			});

			return {
				success: true,
				type: 'success',
				insertedCount
			};
		} catch (caught) {
			const message =
				caught instanceof Error ? caught.message : 'No se pudieron completar las faltas pendientes';
			return fail(400, { error: message });
		}
	}
};

function normalizeNullable(value: string): string | null {
	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
}
