import type { SelectOption } from '$lib/components';
import type {
	TeacherAttendanceState,
	TeacherScheduleItem,
	TeacherWeekday
} from '$lib/types/teacher';

const TEACHER_WEEKDAY_LABELS: Record<TeacherWeekday, string> = {
	0: 'Domingo',
	1: 'Lunes',
	2: 'Martes',
	3: 'Miércoles',
	4: 'Jueves',
	5: 'Viernes',
	6: 'Sábado'
};

const TEACHER_WEEKDAY_SHORT_LABELS: Record<TeacherWeekday, string> = {
	0: 'Dom',
	1: 'Lun',
	2: 'Mar',
	3: 'Mié',
	4: 'Jue',
	5: 'Vie',
	6: 'Sáb'
};

const VALID_TEACHER_WEEKDAYS = new Set<number>([0, 1, 2, 3, 4, 5, 6]);
const TIME_HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME_HHMMSS_REGEX = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

export const TEACHER_WEEKDAY_OPTIONS: SelectOption[] = (
	[1, 2, 3, 4, 5, 6, 0] as TeacherWeekday[]
).map((value) => ({
	value: String(value),
	label: TEACHER_WEEKDAY_LABELS[value]
}));

export function formatTeacherWeekday(weekday: TeacherWeekday): string {
	return TEACHER_WEEKDAY_LABELS[weekday];
}

export function formatTeacherWeekdayShort(weekday: TeacherWeekday): string {
	return TEACHER_WEEKDAY_SHORT_LABELS[weekday];
}

export function isTeacherWeekday(value: number): value is TeacherWeekday {
	return VALID_TEACHER_WEEKDAYS.has(value);
}

export function getTeacherWeekdayFromDate(value: string | Date): TeacherWeekday {
	const date = value instanceof Date ? value : parseLocalIsoDate(value);
	const day = date.getDay();
	return isTeacherWeekday(day) ? day : 0;
}

export function formatTeacherEntryTime(value: string | null | undefined): string {
	if (!value) return '—';
	return value.slice(0, 5);
}

export function formatTeacherAttendanceState(state: TeacherAttendanceState): string {
	switch (state) {
		case 'tarde':
			return 'Tarde';
		case 'permiso':
			return 'Permiso';
		case 'falta':
			return 'Falta';
		case 'justificado':
			return 'Justificado';
		default:
			return 'Presente';
	}
}

export function getTeacherAttendanceStateColor(
	state: TeacherAttendanceState
): 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' {
	switch (state) {
		case 'tarde':
			return 'warning';
		case 'permiso':
			return 'info';
		case 'falta':
			return 'danger';
		case 'justificado':
			return 'secondary';
		default:
			return 'success';
	}
}

function parseClockToMinutesHHmm(value: string): number {
	const slice = value.trim().slice(0, 5);
	const [hRaw, mRaw] = slice.split(':');
	const h = Number(hRaw);
	const m = Number(mRaw);
	if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
	return h * 60 + m;
}

/** Compares wall-clock HH:mm to schedule entry HH:mm (same day). */
export function deriveTeacherAttendanceAutoState(
	nowHhMm: string,
	scheduleEntryHhMm: string
): 'presente' | 'tarde' {
	return parseClockToMinutesHHmm(nowHhMm) > parseClockToMinutesHHmm(scheduleEntryHhMm)
		? 'tarde'
		: 'presente';
}

export function normalizeTeacherTimeInput(value: string | null | undefined): string | null {
	const normalized = value?.trim() ?? '';
	if (!normalized) return null;

	if (TIME_HHMM_REGEX.test(normalized)) {
		return `${normalized}:00`;
	}

	if (TIME_HHMMSS_REGEX.test(normalized)) {
		return normalized;
	}

	return null;
}

export function parseTeacherToleranceMinutes(value: string | null | undefined): number | null {
	const normalized = value?.trim() ?? '';
	if (!normalized) return null;

	const parsed = Number(normalized);
	if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return null;
	if (parsed < 0 || parsed > 240) return null;

	return parsed;
}

const WEEKDAY_ORDER_MON_FIRST: TeacherWeekday[] = [1, 2, 3, 4, 5, 6, 0];

function compareSchedulesMonFirst(a: TeacherScheduleItem, b: TeacherScheduleItem): number {
	const dayA = WEEKDAY_ORDER_MON_FIRST.indexOf(a.weekday);
	const dayB = WEEKDAY_ORDER_MON_FIRST.indexOf(b.weekday);
	if (dayA !== dayB) return dayA - dayB;

	const timeA = formatTeacherEntryTime(a.entry_time);
	const timeB = formatTeacherEntryTime(b.entry_time);
	if (timeA !== timeB) return timeA.localeCompare(timeB);

	return a.branch_name.localeCompare(b.branch_name, 'es');
}

export interface SummarizeTeacherSchedulesTablePreview {
	maxItems?: number;
}

export interface SummarizeTeacherSchedulesOptions {
	tablePreview?: SummarizeTeacherSchedulesTablePreview;
}

export function summarizeTeacherSchedules(
	schedules: TeacherScheduleItem[],
	options?: SummarizeTeacherSchedulesOptions
): string {
	if (schedules.length === 0) return 'Sin horario';

	if (options?.tablePreview) {
		const maxItems = options.tablePreview.maxItems ?? 3;
		const sorted = [...schedules].sort(compareSchedulesMonFirst);
		const visible = sorted.slice(0, maxItems);
		const parts = visible.map(
			(s) => `${formatTeacherWeekdayShort(s.weekday)} ${formatTeacherEntryTime(s.entry_time)}`
		);
		const more = schedules.length - maxItems;
		const head = parts.join(' · ');
		return more > 0 ? `${head} · +${more} más` : head;
	}

	const grouped = new Map<TeacherWeekday, string[]>();
	for (const schedule of schedules) {
		const list = grouped.get(schedule.weekday) ?? [];
		list.push(formatTeacherEntryTime(schedule.entry_time));
		grouped.set(schedule.weekday, list);
	}

	return WEEKDAY_ORDER_MON_FIRST.filter((weekday) => grouped.has(weekday))
		.map((weekday) => {
			const times = (grouped.get(weekday) ?? []).slice().sort();
			return `${formatTeacherWeekdayShort(weekday)}: ${times.join(', ')}`;
		})
		.join(' · ');
}

function parseLocalIsoDate(value: string): Date {
	const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!match) {
		const fallback = new Date(value);
		return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
	}

	return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
