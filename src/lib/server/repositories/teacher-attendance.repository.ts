import { sql } from 'kysely';
import type { Database } from '$lib/database';
import type { TeacherAttendanceRow, TeacherAttendanceState } from '$lib/types/teacher';

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

function normalizeNullableText(value: string | null | undefined): string | null {
	const normalized = value?.trim() ?? '';
	return normalized.length > 0 ? normalized : null;
}

function sqlDate(value: string) {
	return sql<Date>`${value}::date`;
}

export class TeacherAttendanceRepository {
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
}
