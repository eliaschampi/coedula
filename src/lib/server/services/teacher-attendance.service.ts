import type { TeacherAttendanceState, TeacherWeekday } from '$lib/types/teacher';

export interface TeacherScheduleSlot {
	code: string;
	weekday: TeacherWeekday;
	entryTime: string;
	toleranceMinutes: number;
}

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

function parseClockToMinutes(value: string): number {
	const [hours, minutes] = value.split(':').map(Number);
	return hours * 60 + minutes;
}

function formatClockWithSeconds(date: Date): string {
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');
	return `${hours}:${minutes}:${seconds}`;
}

function getDistanceToSlot(slot: TeacherScheduleSlot, currentMinutes: number): number {
	return Math.abs(currentMinutes - parseClockToMinutes(slot.entryTime));
}

function compareByEarlierEntryTime(left: TeacherScheduleSlot, right: TeacherScheduleSlot): number {
	return parseClockToMinutes(left.entryTime) - parseClockToMinutes(right.entryTime);
}

function isWithinAcceptanceWindow(slot: TeacherScheduleSlot, currentMinutes: number): boolean {
	const expectedMinutes = parseClockToMinutes(slot.entryTime);
	const lowerBound = expectedMinutes - slot.toleranceMinutes;
	const upperBound = expectedMinutes + slot.toleranceMinutes;

	return currentMinutes >= lowerBound && currentMinutes <= upperBound;
}

/**
 * Picks the slot closest in minutes-of-day to `currentMinutes`. Ties are
 * broken by preferring the earlier slot for stable, predictable results.
 */
function pickClosestSlot(
	slots: TeacherScheduleSlot[],
	currentMinutes: number
): TeacherScheduleSlot {
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
	slots: TeacherScheduleSlot[],
	now: Date
): TeacherScheduleSlot {
	if (slots.length === 0) {
		throw new TeacherScheduleNotFoundError();
	}

	const currentMinutes = now.getHours() * 60 + now.getMinutes();
	const eligible = slots.filter((slot) => isWithinAcceptanceWindow(slot, currentMinutes));

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
	slots: TeacherScheduleSlot[],
	options: { now?: Date; enforceWindow?: boolean } = {}
): TeacherAutomaticAttendance {
	if (slots.length === 0) {
		throw new TeacherScheduleNotFoundError();
	}

	const now = options.now ?? new Date();
	const enforceWindow = options.enforceWindow ?? false;
	const currentMinutes = now.getHours() * 60 + now.getMinutes();
	const slot = findClosestTeacherSchedule(slots, now);

	if (enforceWindow && !isWithinAcceptanceWindow(slot, currentMinutes)) {
		throw new TeacherAttendanceOutOfWindowError(slot.entryTime, slot.toleranceMinutes);
	}

	const expectedMinutes = parseClockToMinutes(slot.entryTime);
	const state: TeacherAttendanceState = currentMinutes > expectedMinutes ? 'tarde' : 'presente';

	return {
		scheduleCode: slot.code,
		expectedEntryTime: slot.entryTime,
		toleranceMinutes: slot.toleranceMinutes,
		entryTime: formatClockWithSeconds(now),
		state
	};
}
