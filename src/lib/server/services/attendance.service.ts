import type { AttendanceState } from '$lib/types/attendance';
import type { EnrollmentTurn } from '$lib/types/education';

interface AttendanceScheduleOption {
	turn: 'turn_1' | 'turn_2';
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
	expectedTurn: 'turn_1' | 'turn_2';
	state: Extract<AttendanceState, 'presente' | 'tarde'>;
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

function buildScheduleOptions(config: AttendanceScheduleConfig): AttendanceScheduleOption[] {
	const options: AttendanceScheduleOption[] = [];

	if (config.turn === 'turn_1' && config.turn1AttendanceTime) {
		options.push({
			turn: 'turn_1',
			entryTime: config.turn1AttendanceTime,
			toleranceMinutes: config.turn1ToleranceMinutes
		});
	}

	if (config.turn === 'turn_2' && config.turn2AttendanceTime) {
		options.push({
			turn: 'turn_2',
			entryTime: config.turn2AttendanceTime,
			toleranceMinutes: config.turn2ToleranceMinutes
		});
	}

	return options;
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
	const selectedOption = [...options].sort((left, right) => {
		return (
			Math.abs(currentMinutes - parseClockToMinutes(left.entryTime)) -
			Math.abs(currentMinutes - parseClockToMinutes(right.entryTime))
		);
	})[0];

	const expectedMinutes = parseClockToMinutes(selectedOption.entryTime);
	const lateFromMinutes = expectedMinutes + selectedOption.toleranceMinutes;
	const state: Extract<AttendanceState, 'presente' | 'tarde'> =
		currentMinutes > lateFromMinutes ? 'tarde' : 'presente';

	return {
		entryTime: formatClockWithSeconds(now),
		expectedTurn: selectedOption.turn,
		state
	};
}
