import { sql } from 'kysely';
import type { Database } from '$lib/database';
import type {
	TeacherAttendanceRow,
	TeacherAttendanceState,
	TeacherBranchOption,
	TeacherScanResult,
	TeacherWeekday
} from '$lib/types/teacher';
import {
	resolveTeacherAutomaticAttendance,
	TeacherScheduleNotFoundError,
	type TeacherScheduleSlot
} from '$lib/server/services/teacher-attendance.service';
import { isTeacherWeekday } from '$lib/utils/teacher';

interface ListTeacherAttendanceFilters {
	branchCode: string;
	attendanceDate: string;
}

interface CreateTeacherAttendanceInput {
	teacherCode: string;
	branchCode: string;
	scheduleCode: string;
	attendanceDate: string;
	state: TeacherAttendanceState;
	entryTime: string;
	observation: string | null;
}

interface UpdateTeacherAttendanceInput {
	attendanceCode: string;
	state: TeacherAttendanceState;
	entryTime: string;
	observation: string | null;
}

interface ScanCandidate {
	teacher_code: string;
	teacher_number: string;
	teacher_full_name: string;
	teacher_phone: string | null;
}

interface ScheduleCandidateRow {
	code: string;
	weekday: TeacherWeekday;
	entry_time: string;
	tolerance_minutes: number;
}

function normalizeNullableText(value: string | null | undefined): string | null {
	const normalized = value?.trim() ?? '';
	return normalized.length > 0 ? normalized : null;
}

function sqlDate(value: string) {
	return sql<Date>`${value}::date`;
}

export class TeacherAttendanceRepository {
	static async listAvailableBranches(db: Database): Promise<TeacherBranchOption[]> {
		const rows = await db
			.selectFrom('branches as b')
			.select(['b.code', 'b.name'])
			.where('b.state', '=', true)
			.orderBy('b.name', 'asc')
			.execute();

		return rows;
	}

	static async listByFilters(
		db: Database,
		filters: ListTeacherAttendanceFilters
	): Promise<TeacherAttendanceRow[]> {
		const rows = await db
			.selectFrom('teacher_attendance_overview as ov')
			.select([
				'ov.attendance_code',
				'ov.attendance_date',
				'ov.attendance_state',
				'ov.attendance_entry_time',
				'ov.attendance_observation',
				'ov.attendance_created_at',
				'ov.attendance_updated_at',
				'ov.teacher_code',
				'ov.teacher_number',
				'ov.teacher_full_name',
				'ov.teacher_phone',
				'ov.branch_code',
				'ov.branch_name',
				'ov.schedule_code',
				'ov.schedule_weekday',
				'ov.schedule_entry_time',
				'ov.schedule_tolerance_minutes'
			])
			.where('ov.branch_code', '=', filters.branchCode)
			.where('ov.attendance_date', '=', sqlDate(filters.attendanceDate))
			.orderBy('ov.attendance_created_at', 'desc')
			.execute();

		return rows as TeacherAttendanceRow[];
	}

	static async findByCode(
		db: Database,
		attendanceCode: string
	): Promise<TeacherAttendanceRow | null> {
		const row = await db
			.selectFrom('teacher_attendance_overview')
			.selectAll()
			.where('attendance_code', '=', attendanceCode)
			.executeTakeFirst();

		return (row as TeacherAttendanceRow | undefined) ?? null;
	}

	static async create(
		db: Database,
		input: CreateTeacherAttendanceInput
	): Promise<{ code: string }> {
		return db
			.insertInto('teacher_attendances')
			.values({
				teacher_code: input.teacherCode,
				branch_code: input.branchCode,
				schedule_code: input.scheduleCode,
				attendance_date: sqlDate(input.attendanceDate),
				state: input.state,
				entry_time: input.entryTime,
				observation: normalizeNullableText(input.observation)
			})
			.returning('code')
			.executeTakeFirstOrThrow();
	}

	static async update(db: Database, input: UpdateTeacherAttendanceInput): Promise<boolean> {
		const result = await db
			.updateTable('teacher_attendances')
			.set({
				state: input.state,
				entry_time: input.entryTime,
				observation: normalizeNullableText(input.observation),
				updated_at: new Date()
			})
			.where('code', '=', input.attendanceCode)
			.executeTakeFirst();

		return Number(result.numUpdatedRows ?? 0) > 0;
	}

	static async delete(db: Database, attendanceCode: string): Promise<boolean> {
		const result = await db
			.deleteFrom('teacher_attendances')
			.where('code', '=', attendanceCode)
			.executeTakeFirst();

		return Number(result.numDeletedRows ?? 0) > 0;
	}

	static async findActiveTeacherSchedule(
		db: Database,
		teacherCode: string,
		branchCode: string,
		weekday: TeacherWeekday
	): Promise<TeacherScheduleSlot[]> {
		const rows = (await db
			.selectFrom('teacher_schedules')
			.select(['code', 'weekday', 'entry_time', 'tolerance_minutes'])
			.where('teacher_code', '=', teacherCode)
			.where('branch_code', '=', branchCode)
			.where('weekday', '=', weekday)
			.orderBy('entry_time', 'asc')
			.execute()) as ScheduleCandidateRow[];

		return rows.map((row) => ({
			code: row.code,
			weekday: row.weekday,
			entryTime: row.entry_time,
			toleranceMinutes: row.tolerance_minutes
		}));
	}

	static async registerByTeacherNumber(
		db: Database,
		teacherNumber: string,
		branchCode: string,
		now: Date
	): Promise<TeacherScanResult> {
		const candidate = (await db
			.selectFrom('teacher_overview')
			.select([
				'code as teacher_code',
				'teacher_number',
				'full_name as teacher_full_name',
				'phone as teacher_phone'
			])
			.where('teacher_number', '=', teacherNumber)
			.executeTakeFirst()) as ScanCandidate | undefined;

		if (!candidate) {
			throw new Error('No encontramos un docente con ese número');
		}

		const weekday = now.getDay();
		if (!isTeacherWeekday(weekday)) {
			throw new TeacherScheduleNotFoundError();
		}

		const slots = await TeacherAttendanceRepository.findActiveTeacherSchedule(
			db,
			candidate.teacher_code,
			branchCode,
			weekday
		);

		if (slots.length === 0) {
			throw new TeacherScheduleNotFoundError();
		}

		const resolution = resolveTeacherAutomaticAttendance(slots, { now, enforceWindow: true });
		const attendanceDate = formatLocalDate(now);

		const existing = await db
			.selectFrom('teacher_attendances')
			.select(['code', 'state', 'entry_time'])
			.where('schedule_code', '=', resolution.scheduleCode)
			.where('attendance_date', '=', sqlDate(attendanceDate))
			.executeTakeFirst();

		const slot = slots.find((option) => option.code === resolution.scheduleCode);
		if (!slot) {
			throw new TeacherScheduleNotFoundError();
		}

		if (existing) {
			return buildScanResult({
				status: 'already_registered',
				message: `La asistencia ya fue registrada como ${existing.state}`,
				attendanceCode: existing.code,
				attendanceDate,
				attendanceEntryTime: existing.entry_time,
				attendanceState: existing.state as TeacherAttendanceState,
				teacher: candidate,
				branchCode,
				slot
			});
		}

		const branchName = await getBranchName(db, branchCode);
		const inserted = await TeacherAttendanceRepository.create(db, {
			teacherCode: candidate.teacher_code,
			branchCode,
			scheduleCode: resolution.scheduleCode,
			attendanceDate,
			state: resolution.state,
			entryTime: resolution.entryTime,
			observation: null
		});

		return buildScanResult({
			status: 'created',
			message:
				resolution.state === 'tarde'
					? 'Asistencia registrada como tarde'
					: 'Asistencia registrada correctamente',
			attendanceCode: inserted.code,
			attendanceDate,
			attendanceEntryTime: resolution.entryTime,
			attendanceState: resolution.state,
			teacher: candidate,
			branchCode,
			branchName,
			slot
		});
	}
}

interface ScanResultArgs {
	status: 'created' | 'already_registered';
	message: string;
	attendanceCode: string;
	attendanceDate: string;
	attendanceEntryTime: string;
	attendanceState: TeacherAttendanceState;
	teacher: ScanCandidate;
	branchCode: string;
	branchName?: string;
	slot: TeacherScheduleSlot;
}

function buildScanResult(args: ScanResultArgs): TeacherScanResult {
	return {
		status: args.status,
		message: args.message,
		attendance: {
			attendance_code: args.attendanceCode,
			attendance_date: args.attendanceDate,
			attendance_entry_time: args.attendanceEntryTime,
			attendance_state: args.attendanceState
		},
		teacher: {
			code: args.teacher.teacher_code,
			full_name: args.teacher.teacher_full_name,
			teacher_number: args.teacher.teacher_number,
			phone: args.teacher.teacher_phone
		},
		schedule: {
			code: args.slot.code,
			branch_code: args.branchCode,
			branch_name: args.branchName ?? '',
			weekday: args.slot.weekday,
			entry_time: args.slot.entryTime,
			tolerance_minutes: args.slot.toleranceMinutes
		}
	};
}

async function getBranchName(db: Database, branchCode: string): Promise<string> {
	const row = await db
		.selectFrom('branches')
		.select(['name'])
		.where('code', '=', branchCode)
		.executeTakeFirst();

	return row?.name ?? '';
}

function formatLocalDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}
