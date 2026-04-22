import { readFormField } from '$lib/utils/formData';
import type { AttendanceState } from '$lib/types/attendance';
import { isTimedAttendanceState } from '$lib/utils';

const VALID_ATTENDANCE_STATES = new Set<AttendanceState>([
	'presente',
	'falta',
	'tarde',
	'justificado',
	'permiso'
]);

export interface AttendanceFormPayload {
	enrollmentCode: string;
	attendanceDate: string;
	state: AttendanceState;
	entryTime: string | null;
	observation: string | null;
}

function normalizeNullableText(value: string | null | undefined): string | null {
	const normalized = value?.trim() ?? '';
	return normalized.length > 0 ? normalized : null;
}

function normalizeEntryTime(value: string | null, state: AttendanceState): string | null {
	if (!isTimedAttendanceState(state)) {
		return null;
	}

	const normalized = value?.trim() ?? '';
	if (!normalized) {
		return null;
	}

	if (/^\d{2}:\d{2}$/.test(normalized)) {
		return `${normalized}:00`;
	}

	return normalized;
}

export function readAttendanceFormPayload(formData: FormData): AttendanceFormPayload {
	const state = readFormField(formData, 'state') as AttendanceState;
	const entryTime = normalizeNullableText(readFormField(formData, 'entry_time'));

	return {
		enrollmentCode: readFormField(formData, 'enrollment_code'),
		attendanceDate: readFormField(formData, 'attendance_date'),
		state,
		entryTime: normalizeEntryTime(entryTime, state),
		observation: normalizeNullableText(readFormField(formData, 'observation'))
	};
}

export function validateAttendanceFormPayload(payload: AttendanceFormPayload): string | null {
	if (!payload.enrollmentCode) {
		return 'Debe seleccionar una matrícula válida';
	}

	if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.attendanceDate)) {
		return 'Debe seleccionar una fecha válida para la asistencia';
	}

	if (!VALID_ATTENDANCE_STATES.has(payload.state)) {
		return 'Debe seleccionar un estado de asistencia válido';
	}

	if (isTimedAttendanceState(payload.state)) {
		if (!payload.entryTime) {
			return 'La hora de ingreso es obligatoria para presentes y tardanzas';
		}

		if (!/^\d{2}:\d{2}(:\d{2})?$/.test(payload.entryTime)) {
			return 'La hora de ingreso debe tener un formato válido';
		}
	}

	return null;
}
