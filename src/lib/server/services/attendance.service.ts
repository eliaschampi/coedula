import type { AttendanceState } from '$lib/types/attendance';
import type { EnrollmentTurn } from '$lib/types/education';

type CycleTurn = 'turn_1' | 'turn_2';

interface AttendanceScheduleOption {
	turn: CycleTurn;
	entryTime: string;
	toleranceMinutes: number;
}

export interface AttendanceScheduleConfig {
	turn: EnrollmentTurn;
	turn1AttendanceTime: string | null;
	turn1ToleranceMinutes: number;
	turn2AttendanceTime: string | null;
	turn2ToleranceMinutes: number;
}

export interface AutomaticAttendanceResolution {
	entryTime: string;
	expectedTurn: CycleTurn;
	state: Extract<AttendanceState, 'presente' | 'tarde'>;
}

/**
 * Thrown when the current clock time is not inside the acceptance window
 * for the selected turn (same rule as docente / QR: [entrada ± tolerancia]).
 */
export class AttendanceOutOfWindowError extends Error {
	readonly expectedEntryTime: string;
	readonly toleranceMinutes: number;

	constructor(expectedEntryTime: string, toleranceMinutes: number) {
		const human = expectedEntryTime.slice(0, 5);
		super(`Fuera del horario permitido. Entrada programada: ${human} (±${toleranceMinutes} min).`);
		this.name = 'AttendanceOutOfWindowError';
		this.expectedEntryTime = expectedEntryTime;
		this.toleranceMinutes = toleranceMinutes;
	}
}

const TURNS_BY_ENROLLMENT: Record<EnrollmentTurn, ReadonlySet<CycleTurn>> = {
	turn_1: new Set(['turn_1']),
	turn_2: new Set(['turn_2']),
	both: new Set(['turn_1', 'turn_2'])
};

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

function buildScheduleOptions(config: AttendanceScheduleConfig): AttendanceScheduleOption[] {
	const allowedTurns = TURNS_BY_ENROLLMENT[config.turn];
	const candidates: AttendanceScheduleOption[] = [
		{
			turn: 'turn_1',
			entryTime: config.turn1AttendanceTime ?? '',
			toleranceMinutes: config.turn1ToleranceMinutes
		},
		{
			turn: 'turn_2',
			entryTime: config.turn2AttendanceTime ?? '',
			toleranceMinutes: config.turn2ToleranceMinutes
		}
	];

	return candidates.filter(
		(candidate) => allowedTurns.has(candidate.turn) && candidate.entryTime.length > 0
	);
}

function isWithinAcceptanceWindow(
	option: AttendanceScheduleOption,
	currentMinutes: number
): boolean {
	const expected = parseClockToMinutes(option.entryTime);
	return (
		currentMinutes >= expected - option.toleranceMinutes &&
		currentMinutes <= expected + option.toleranceMinutes
	);
}

function compareByEarlierEntryTime(
	left: AttendanceScheduleOption,
	right: AttendanceScheduleOption
): number {
	return parseClockToMinutes(left.entryTime) - parseClockToMinutes(right.entryTime);
}

function pickClosestOption(
	options: AttendanceScheduleOption[],
	currentMinutes: number
): AttendanceScheduleOption {
	return options.reduce((closest, candidate) => {
		const cDist = Math.abs(currentMinutes - parseClockToMinutes(candidate.entryTime));
		const bDist = Math.abs(currentMinutes - parseClockToMinutes(closest.entryTime));
		if (cDist < bDist) return candidate;
		if (cDist > bDist) return closest;
		return compareByEarlierEntryTime(candidate, closest) < 0 ? candidate : closest;
	});
}

/**
 * Picks a schedule row for this instant: prefer turns whose acceptance window
 * contains `now` (e.g. matrícula "ambos" a las 7:05 → turno 1, no el turno 2 nocturno);
 * if none, the chronologically closest slot is used to evaluate the window check (then fail).
 * Mirrors docente: closest-within-window first, else closest for error messaging.
 */
function findRelevantScheduleOption(
	options: AttendanceScheduleOption[],
	now: Date
): AttendanceScheduleOption {
	const currentMinutes = now.getHours() * 60 + now.getMinutes();
	const eligible = options.filter((o) => isWithinAcceptanceWindow(o, currentMinutes));

	if (eligible.length > 0) {
		return pickClosestOption(eligible, currentMinutes);
	}

	return pickClosestOption(options, currentMinutes);
}

export function resolveAutomaticAttendance(
	config: AttendanceScheduleConfig
): AutomaticAttendanceResolution {
	const options = buildScheduleOptions(config);

	if (options.length === 0) {
		throw new Error('La matrícula activa no tiene un horario de asistencia configurado');
	}

	const now = new Date();
	const currentMinutes = now.getHours() * 60 + now.getMinutes();
	const selected = findRelevantScheduleOption(options, now);

	if (!isWithinAcceptanceWindow(selected, currentMinutes)) {
		throw new AttendanceOutOfWindowError(selected.entryTime, selected.toleranceMinutes);
	}

	const expectedMinutes = parseClockToMinutes(selected.entryTime);
	const state: Extract<AttendanceState, 'presente' | 'tarde'> =
		currentMinutes > expectedMinutes ? 'tarde' : 'presente';

	return {
		entryTime: formatClockWithSeconds(now),
		expectedTurn: selected.turn,
		state
	};
}
