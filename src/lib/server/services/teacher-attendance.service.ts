import type { TeacherAttendanceState } from '$lib/types/teacher';
import {
	isTeacherAttendanceSlotWithinWindowAtMinutes,
	teacherEntryMinutesOfDay,
	type TeacherAttendanceScheduleSlot
} from '$lib/utils/teacherAttendanceWindow';

export type { TeacherAttendanceScheduleSlot as TeacherScheduleSlot } from '$lib/utils/teacherAttendanceWindow';

export interface TeacherAutomaticAttendance {
	scheduleCode: string;
	expectedEntryTime: string;
	toleranceMinutes: number;
	entryTime: string;
	state: TeacherAttendanceState;
}

export class TeacherScheduleNotFoundError extends Error {
	constructor(message = 'El docente no tiene horarios configurados para hoy en esta sede') {
		super(message);
		this.name = 'TeacherScheduleNotFoundError';
	}
}

export class TeacherAttendanceOutOfWindowError extends Error {
	readonly closestEntryTime: string;
	readonly toleranceMinutes: number;

	constructor(closestEntryTime: string, toleranceMinutes: number) {
		const human = closestEntryTime.slice(0, 5);
		super(
			`Fuera del rango permitido. Horario más cercano: ${human} (tolerancia ${toleranceMinutes} min).`
		);
		this.name = 'TeacherAttendanceOutOfWindowError';
		this.closestEntryTime = closestEntryTime;
		this.toleranceMinutes = toleranceMinutes;
	}
}

function formatClockWithSeconds(date: Date): string {
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');
	return `${hours}:${minutes}:${seconds}`;
}

function getDistanceToSlot(slot: TeacherAttendanceScheduleSlot, currentMinutes: number): number {
	return Math.abs(currentMinutes - teacherEntryMinutesOfDay(slot.entryTime));
}

function compareByEarlierEntryTime(
	left: TeacherAttendanceScheduleSlot,
	right: TeacherAttendanceScheduleSlot
): number {
	return teacherEntryMinutesOfDay(left.entryTime) - teacherEntryMinutesOfDay(right.entryTime);
}

/**
 * Picks the slot closest in minutes-of-day to `currentMinutes`. Ties are
 * broken by preferring the earlier slot for stable, predictable results.
 */
function pickClosestSlot(
	slots: TeacherAttendanceScheduleSlot[],
	currentMinutes: number
): TeacherAttendanceScheduleSlot {
	return slots.reduce((closest, candidate) => {
		const closestDistance = getDistanceToSlot(closest, currentMinutes);
		const candidateDistance = getDistanceToSlot(candidate, currentMinutes);

		if (candidateDistance < closestDistance) return candidate;
		if (candidateDistance > closestDistance) return closest;

		return compareByEarlierEntryTime(candidate, closest) < 0 ? candidate : closest;
	});
}

/**
 * Resolves the schedule slot whose acceptance window contains `now`, falling
 * back to the chronologically closest slot when none qualify.
 *
 * The acceptance window is `[entry_time - tolerance, entry_time + tolerance]`.
 */
export function findClosestTeacherSchedule(
	slots: TeacherAttendanceScheduleSlot[],
	now: Date
): TeacherAttendanceScheduleSlot {
	if (slots.length === 0) {
		throw new TeacherScheduleNotFoundError();
	}

	const currentMinutes = now.getHours() * 60 + now.getMinutes();
	const eligible = slots.filter((slot) =>
		isTeacherAttendanceSlotWithinWindowAtMinutes(slot, currentMinutes)
	);

	if (eligible.length > 0) {
		return pickClosestSlot(eligible, currentMinutes);
	}

	return pickClosestSlot(slots, currentMinutes);
}

/**
 * Resolves the automatic attendance against the closest matching schedule.
 *
 * @throws {TeacherScheduleNotFoundError} when there are no slots for today.
 * @throws {TeacherAttendanceOutOfWindowError} when `enforceWindow` is true and
 *  no slot's acceptance window contains `now`.
 */
export function resolveTeacherAutomaticAttendance(
	slots: TeacherAttendanceScheduleSlot[],
	options: { now?: Date; enforceWindow?: boolean } = {}
): TeacherAutomaticAttendance {
	if (slots.length === 0) {
		throw new TeacherScheduleNotFoundError();
	}

	const now = options.now ?? new Date();
	const enforceWindow = options.enforceWindow ?? false;
	const currentMinutes = now.getHours() * 60 + now.getMinutes();
	const slot = findClosestTeacherSchedule(slots, now);

	if (enforceWindow && !isTeacherAttendanceSlotWithinWindowAtMinutes(slot, currentMinutes)) {
		throw new TeacherAttendanceOutOfWindowError(slot.entryTime, slot.toleranceMinutes);
	}

	const expectedMinutes = teacherEntryMinutesOfDay(slot.entryTime);
	const state: TeacherAttendanceState = currentMinutes > expectedMinutes ? 'tarde' : 'presente';

	return {
		scheduleCode: slot.code,
		expectedEntryTime: slot.entryTime,
		toleranceMinutes: slot.toleranceMinutes,
		entryTime: formatClockWithSeconds(now),
		state
	};
}
