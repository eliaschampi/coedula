import type { SelectOption } from '$lib/components';
import type { AttendanceState } from '$lib/types/attendance';
import type { EnrollmentTurn } from '$lib/types/education';

interface AttendanceSummaryRecord {
	attendance_code?: string | null;
	attendance_state?: AttendanceState | null;
}

export interface AttendanceSummary {
	total: number;
	recorded: number;
	pending: number;
	present: number;
	late: number;
	absence: number;
	justified: number;
	incidents: number;
}

const VALID_ATTENDANCE_TURNS = new Set<EnrollmentTurn>(['turn_1', 'turn_2']);

export const ATTENDANCE_STATE_OPTIONS: SelectOption[] = [
	{ value: 'presente', label: 'Presente' },
	{ value: 'tarde', label: 'Tarde' },
	{ value: 'falta', label: 'Falta' },
	{ value: 'justificado', label: 'Justificado' },
	{ value: 'permiso', label: 'Permiso' }
];

export function formatAttendanceState(state: AttendanceState): string {
	if (state === 'presente') return 'Presente';
	if (state === 'tarde') return 'Tarde';
	if (state === 'falta') return 'Falta';
	if (state === 'justificado') return 'Justificado';
	return 'Permiso';
}

export function getAttendanceStateColor(
	state: AttendanceState | 'pending'
): 'success' | 'warning' | 'danger' | 'info' | 'secondary' {
	if (state === 'presente') return 'success';
	if (state === 'tarde') return 'warning';
	if (state === 'falta') return 'danger';
	if (state === 'justificado') return 'info';
	if (state === 'permiso') return 'secondary';
	return 'secondary';
}

export function isTimedAttendanceState(state: AttendanceState): boolean {
	return state === 'presente' || state === 'tarde';
}

export function formatAttendanceTime(value: string | null | undefined): string {
	if (!value) return '—';
	return value.slice(0, 5);
}

export function formatLocalDateValue(date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

export function normalizeAttendanceTurnFilter(
	value: string | null | undefined
): EnrollmentTurn | null {
	const normalized = (value ?? '').trim() as EnrollmentTurn;
	return VALID_ATTENDANCE_TURNS.has(normalized) ? normalized : null;
}

/**
 * Regla de negocio única: al listar o completar faltas por "Turno 1" (o 2) en malla/aula,
 * deben incluirse las matrículas `both` (asisten a ambos turnos; siguen al listado de cada
 * toma de asistencia). No duplica filas: sigue 1 registro asistencia/día/matrícula.
 */
export function enrollmentTurnMatchesListFilter(
	listFilter: 'turn_1' | 'turn_2',
	enrollmentTurn: EnrollmentTurn
): boolean {
	if (listFilter === 'turn_1') {
		return enrollmentTurn === 'turn_1' || enrollmentTurn === 'both';
	}
	return enrollmentTurn === 'turn_2' || enrollmentTurn === 'both';
}

export function summarizeAttendance(records: AttendanceSummaryRecord[]): AttendanceSummary {
	return records.reduce<AttendanceSummary>(
		(summary, record) => {
			summary.total += 1;

			const hasRecordedAttendance =
				typeof record.attendance_code === 'string'
					? record.attendance_code.length > 0
					: record.attendance_state !== null && record.attendance_state !== undefined;

			if (hasRecordedAttendance) {
				summary.recorded += 1;
			} else {
				summary.pending += 1;
			}

			if (record.attendance_state === 'presente') {
				summary.present += 1;
			} else if (record.attendance_state === 'tarde') {
				summary.late += 1;
			} else if (record.attendance_state === 'falta') {
				summary.absence += 1;
				summary.incidents += 1;
			} else if (
				record.attendance_state === 'justificado' ||
				record.attendance_state === 'permiso'
			) {
				summary.justified += 1;
				summary.incidents += 1;
			}

			return summary;
		},
		{
			total: 0,
			recorded: 0,
			pending: 0,
			present: 0,
			late: 0,
			absence: 0,
			justified: 0,
			incidents: 0
		}
	);
}
