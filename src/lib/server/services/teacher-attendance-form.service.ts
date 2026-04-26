import { readFormField } from '$lib/utils/formData';
import type { TeacherAttendanceState } from '$lib/types/teacher';
import { isUuid } from '$lib/utils/validation';
import { normalizeTeacherTimeInput } from '$lib/utils/teacher';

const VALID_TEACHER_ATTENDANCE_STATES = new Set<TeacherAttendanceState>(['presente', 'tarde']);

export interface TeacherAttendanceCreatePayload {
	teacherCode: string;
	branchCode: string;
	scheduleCode: string;
	attendanceDate: string;
	state: TeacherAttendanceState;
	entryTime: string;
	observation: string | null;
}

export interface TeacherAttendanceUpdatePayload {
	attendanceCode: string;
	state: TeacherAttendanceState;
	entryTime: string;
	observation: string | null;
}

function normalizeNullableText(value: string | null): string | null {
	const normalized = value?.trim() ?? '';
	return normalized.length > 0 ? normalized : null;
}

function parseState(value: string): TeacherAttendanceState | null {
	return VALID_TEACHER_ATTENDANCE_STATES.has(value as TeacherAttendanceState)
		? (value as TeacherAttendanceState)
		: null;
}

export function readTeacherAttendanceCreatePayload(
	formData: FormData
): TeacherAttendanceCreatePayload | { error: string } {
	const teacherCode = readFormField(formData, 'teacher_code');
	const branchCode = readFormField(formData, 'branch_code');
	const scheduleCode = readFormField(formData, 'schedule_code');
	const attendanceDate = readFormField(formData, 'attendance_date');
	const stateValue = readFormField(formData, 'state');
	const entryTime = normalizeTeacherTimeInput(readFormField(formData, 'entry_time'));
	const observation = normalizeNullableText(readFormField(formData, 'observation'));

	if (!isUuid(teacherCode)) {
		return { error: 'Debe seleccionar un docente válido' };
	}

	if (!isUuid(branchCode)) {
		return { error: 'Debe seleccionar una sede válida' };
	}

	if (!isUuid(scheduleCode)) {
		return { error: 'Debe seleccionar un horario válido' };
	}

	if (!/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate)) {
		return { error: 'Debe seleccionar una fecha válida' };
	}

	const state = parseState(stateValue);
	if (!state) {
		return { error: 'Debe seleccionar un estado válido (presente o tarde)' };
	}

	if (!entryTime) {
		return { error: 'La hora de ingreso es obligatoria' };
	}

	return {
		teacherCode,
		branchCode,
		scheduleCode,
		attendanceDate,
		state,
		entryTime,
		observation
	};
}

export function readTeacherAttendanceUpdatePayload(
	formData: FormData
): TeacherAttendanceUpdatePayload | { error: string } {
	const attendanceCode = readFormField(formData, 'code');
	const stateValue = readFormField(formData, 'state');
	const entryTime = normalizeTeacherTimeInput(readFormField(formData, 'entry_time'));
	const observation = normalizeNullableText(readFormField(formData, 'observation'));

	if (!isUuid(attendanceCode)) {
		return { error: 'El registro de asistencia seleccionado no es válido' };
	}

	const state = parseState(stateValue);
	if (!state) {
		return { error: 'Debe seleccionar un estado válido (presente o tarde)' };
	}

	if (!entryTime) {
		return { error: 'La hora de ingreso es obligatoria' };
	}

	return {
		attendanceCode,
		state,
		entryTime,
		observation
	};
}
