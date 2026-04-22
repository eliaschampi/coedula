import type { SelectOption } from '$lib/components';
import type { EnrollmentStatus, EnrollmentTurn, GroupCode } from '$lib/types/education';

export const CYCLE_MODALITY_OPTIONS: SelectOption[] = [
	{ value: 'regular', label: 'Regular' },
	{ value: 'intensivo', label: 'Intensivo' },
	{ value: 'virtual', label: 'Virtual' },
	{ value: 'semi_presencial', label: 'Semi presencial' }
];

export const ENROLLMENT_TURN_OPTIONS: SelectOption[] = [
	{ value: 'turn_1', label: 'Turno 1' },
	{ value: 'turn_2', label: 'Turno 2' },
	{ value: 'both', label: 'Ambos turnos' }
];

export const ENROLLMENT_STATUS_OPTIONS: SelectOption[] = [
	{ value: 'active', label: 'Activa' },
	{ value: 'finalized', label: 'Finalizada' },
	{ value: 'inactive', label: 'Inactiva' }
];

export const GROUP_CODE_OPTIONS: SelectOption[] = [
	{ value: 'A', label: 'Grupo A' },
	{ value: 'B', label: 'Grupo B' },
	{ value: 'C', label: 'Grupo C' },
	{ value: 'D', label: 'Grupo D' }
];

const DAY_IN_MS = 1000 * 60 * 60 * 24;

function toDateAtStartOfDay(value: string | Date | null | undefined): Date | null {
	if (!value) {
		return null;
	}

	if (value instanceof Date) {
		return new Date(value.getFullYear(), value.getMonth(), value.getDate());
	}

	const normalizedValue = value.trim();
	if (!normalizedValue) {
		return null;
	}

	const directDateMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (directDateMatch) {
		return new Date(
			Number(directDateMatch[1]),
			Number(directDateMatch[2]) - 1,
			Number(directDateMatch[3])
		);
	}

	const parsedDate = new Date(normalizedValue);
	if (Number.isNaN(parsedDate.getTime())) {
		return null;
	}

	return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
}

export function formatAcademicDegreeLabel(degreeName: string | null | undefined): string {
	const normalizedDegreeName = degreeName?.trim() ?? '';
	if (normalizedDegreeName) {
		return normalizedDegreeName;
	}

	return 'Sin grado';
}

export function formatDateInputValue(value: string | Date | null | undefined): string {
	if (!value) {
		return '';
	}

	if (typeof value === 'string') {
		const normalizedValue = value.trim();
		if (!normalizedValue) {
			return '';
		}

		const directDateMatch = normalizedValue.match(/^(\d{4}-\d{2}-\d{2})/);
		if (directDateMatch) {
			return directDateMatch[1];
		}
	}

	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		return '';
	}

	return date.toISOString().slice(0, 10);
}

export function formatEducationCurrency(value: string | number | null | undefined): string {
	const amount = typeof value === 'number' ? value : Number.parseFloat(value ?? '0');
	const safeAmount = Number.isFinite(amount) ? amount : 0;

	return new Intl.NumberFormat('es-PE', {
		style: 'currency',
		currency: 'PEN',
		minimumFractionDigits: 2
	}).format(safeAmount);
}

export function formatEducationDate(value: string | Date | null | undefined): string {
	if (!value) {
		return '—';
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return '—';
	}

	return new Intl.DateTimeFormat('es-PE', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	}).format(date);
}

export function formatEducationDateRange(
	startDate: string | Date | null | undefined,
	endDate: string | Date | null | undefined
): string {
	const start = formatEducationDate(startDate);
	const end = formatEducationDate(endDate);

	if (start === '—' && end === '—') {
		return 'Sin rango';
	}

	return `${start} - ${end}`;
}

export function getEducationDateProgress(
	startDate: string | Date | null | undefined,
	endDate: string | Date | null | undefined
): {
	totalDays: number;
	passedDays: number;
	remainingDays: number;
	daysUntilStart: number;
	percentage: number;
	status: 'upcoming' | 'active' | 'completed';
} {
	const start = toDateAtStartOfDay(startDate);
	const end = toDateAtStartOfDay(endDate);
	const today = toDateAtStartOfDay(new Date());

	if (!start || !end || !today) {
		return {
			totalDays: 0,
			passedDays: 0,
			remainingDays: 0,
			daysUntilStart: 0,
			percentage: 0,
			status: 'upcoming'
		};
	}

	const totalDays = Math.max(Math.round((end.getTime() - start.getTime()) / DAY_IN_MS), 1);

	if (today.getTime() <= start.getTime()) {
		const daysUntilStart = Math.max(Math.ceil((start.getTime() - today.getTime()) / DAY_IN_MS), 0);

		return {
			totalDays,
			passedDays: 0,
			remainingDays: totalDays,
			daysUntilStart,
			percentage: 0,
			status: 'upcoming'
		};
	}

	if (today.getTime() >= end.getTime()) {
		return {
			totalDays,
			passedDays: totalDays,
			remainingDays: 0,
			daysUntilStart: 0,
			percentage: 100,
			status: 'completed'
		};
	}

	const passedDays = Math.min(
		Math.max(Math.floor((today.getTime() - start.getTime()) / DAY_IN_MS), 0),
		totalDays
	);
	const remainingDays = Math.max(totalDays - passedDays, 0);
	const percentage = Number(((passedDays * 100) / totalDays).toFixed(2));

	return {
		totalDays,
		passedDays,
		remainingDays,
		daysUntilStart: 0,
		percentage,
		status: 'active'
	};
}

export function formatEnrollmentTurn(turn: EnrollmentTurn): string {
	if (turn === 'turn_1') return 'Turno 1';
	if (turn === 'turn_2') return 'Turno 2';
	return 'Ambos turnos';
}

export function formatEnrollmentStatus(status: EnrollmentStatus): string {
	if (status === 'active') return 'Activa';
	if (status === 'finalized') return 'Finalizada';
	return 'Inactiva';
}

export function formatGroupCode(groupCode: GroupCode): string {
	return `Grupo ${groupCode}`;
}
