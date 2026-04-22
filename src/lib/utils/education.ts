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
