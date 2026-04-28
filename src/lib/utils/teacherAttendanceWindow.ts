import type { TeacherScheduleItem, TeacherWeekday } from '$lib/types/teacher';

/**
 * Minimal schedule shape for acceptance-window math (entry ± tolerance, same calendar day).
 */
export interface TeacherAttendanceScheduleSlot {
	code: string;
	weekday: TeacherWeekday;
	entryTime: string;
	toleranceMinutes: number;
}

export type TeacherScheduleWindowRow = Pick<
	TeacherScheduleItem,
	'code' | 'weekday' | 'entry_time' | 'tolerance_minutes'
>;

export function teacherEntryMinutesOfDay(entryTime: string): number {
	const [hours, minutes] = entryTime.split(':').map(Number);
	return hours * 60 + minutes;
}

/** Window is `[entry_time - tolerance, entry_time + tolerance]` in minutes-of-day. */
export function isTeacherAttendanceSlotWithinWindowAtMinutes(
	slot: TeacherAttendanceScheduleSlot,
	currentMinutesOfDay: number
): boolean {
	const expected = teacherEntryMinutesOfDay(slot.entryTime);
	const lower = expected - slot.toleranceMinutes;
	const upper = expected + slot.toleranceMinutes;
	return currentMinutesOfDay >= lower && currentMinutesOfDay <= upper;
}

export function isTeacherAttendanceSlotWithinWindowAt(
	slot: TeacherAttendanceScheduleSlot,
	now: Date
): boolean {
	const currentMinutes = now.getHours() * 60 + now.getMinutes();
	return isTeacherAttendanceSlotWithinWindowAtMinutes(slot, currentMinutes);
}

export function toTeacherAttendanceScheduleSlot(
	row: TeacherScheduleWindowRow
): TeacherAttendanceScheduleSlot {
	return {
		code: row.code,
		weekday: row.weekday,
		entryTime: row.entry_time,
		toleranceMinutes: row.tolerance_minutes
	};
}

export function filterTeacherAttendanceSlotsWithinWindowAt<T extends TeacherAttendanceScheduleSlot>(
	slots: T[],
	now: Date
): T[] {
	return slots.filter((slot) => isTeacherAttendanceSlotWithinWindowAt(slot, now));
}

export function describeTeacherAttendanceWindowViolation(
	slot: TeacherAttendanceScheduleSlot
): string {
	const human = slot.entryTime.slice(0, 5);
	return `Fuera del rango permitido. Horario: ${human} (tolerancia ±${slot.toleranceMinutes} min).`;
}
