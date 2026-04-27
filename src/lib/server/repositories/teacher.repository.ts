import { sql } from 'kysely';
import type { Database } from '$lib/database';
import type {
	TeacherDirectoryItem,
	TeacherOption,
	TeacherOverviewItem,
	TeacherScheduleItem,
	TeacherWeekday
} from '$lib/types/teacher';

interface CreateTeacherInput {
	firstName: string;
	lastName: string;
	phone: string | null;
}

interface UpdateTeacherInput extends CreateTeacherInput {
	teacherCode: string;
}

interface CreateScheduleInput {
	teacherCode: string;
	branchCode: string;
	weekday: TeacherWeekday;
	entryTime: string;
	toleranceMinutes: number;
}

interface UpdateScheduleInput extends CreateScheduleInput {
	scheduleCode: string;
}

function normalizeNullableText(value: string | null | undefined): string | null {
	const normalized = value?.trim() ?? '';
	return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredText(value: string | null | undefined, message: string): string {
	const normalized = value?.trim() ?? '';
	if (!normalized) {
		throw new Error(message);
	}
	return normalized;
}

function buildTeacherSearchPattern(query: string): string {
	return `%${query.trim().replace(/\s+/g, ' ').replace(/[%_]/g, '').toLowerCase()}%`;
}

export class TeacherRepository {
	static async listOverview(db: Database, search?: string | null): Promise<TeacherOverviewItem[]> {
		const normalizedSearch = search?.trim() ?? '';

		const rows = await db
			.selectFrom('teacher_overview as t')
			.select([
				't.code',
				't.teacher_number',
				't.first_name',
				't.last_name',
				't.full_name',
				't.phone',
				't.created_at',
				't.updated_at'
			])
			.$if(Boolean(normalizedSearch), (qb) => {
				const pattern = buildTeacherSearchPattern(normalizedSearch);
				return qb.where((eb) =>
					eb.or([
						eb(eb.fn('lower', ['t.full_name']), 'like', pattern),
						eb(eb.fn('lower', ['t.teacher_number']), 'like', pattern),
						eb(sql<string>`lower(coalesce(t.phone, ''))`, 'like', pattern)
					])
				);
			})
			.orderBy('t.last_name', 'asc')
			.orderBy('t.first_name', 'asc')
			.execute();

		return rows as TeacherOverviewItem[];
	}

	static async listOptions(db: Database): Promise<TeacherOption[]> {
		const rows = await db
			.selectFrom('teacher_overview')
			.select(['code', 'teacher_number', 'full_name', 'phone'])
			.orderBy('last_name', 'asc')
			.orderBy('first_name', 'asc')
			.execute();

		return rows as TeacherOption[];
	}

	static async listDirectory(
		db: Database,
		search?: string | null
	): Promise<TeacherDirectoryItem[]> {
		const teachers = await TeacherRepository.listOverview(db, search);

		if (teachers.length === 0) {
			return [];
		}

		const teacherCodes = teachers.map((teacher) => teacher.code);
		const schedules = await TeacherRepository.listSchedulesByTeacherCodes(db, teacherCodes);

		const schedulesByTeacher = new Map<string, TeacherScheduleItem[]>();
		for (const schedule of schedules) {
			const list = schedulesByTeacher.get(schedule.teacher_code) ?? [];
			list.push(schedule);
			schedulesByTeacher.set(schedule.teacher_code, list);
		}

		return teachers.map((teacher) => ({
			...teacher,
			schedules: schedulesByTeacher.get(teacher.code) ?? []
		}));
	}

	static async findByCode(db: Database, teacherCode: string): Promise<TeacherOverviewItem | null> {
		const row = await db
			.selectFrom('teacher_overview')
			.select([
				'code',
				'teacher_number',
				'first_name',
				'last_name',
				'full_name',
				'phone',
				'created_at',
				'updated_at'
			])
			.where('code', '=', teacherCode)
			.executeTakeFirst();

		return (row as TeacherOverviewItem | undefined) ?? null;
	}

	static async findByTeacherNumber(
		db: Database,
		teacherNumber: string
	): Promise<TeacherOverviewItem | null> {
		const row = await db
			.selectFrom('teacher_overview')
			.select([
				'code',
				'teacher_number',
				'first_name',
				'last_name',
				'full_name',
				'phone',
				'created_at',
				'updated_at'
			])
			.where('teacher_number', '=', teacherNumber)
			.executeTakeFirst();

		return (row as TeacherOverviewItem | undefined) ?? null;
	}

	static async create(db: Database, input: CreateTeacherInput): Promise<{ code: string }> {
		const firstName = normalizeRequiredText(input.firstName, 'Los nombres son obligatorios');
		const lastName = normalizeRequiredText(input.lastName, 'Los apellidos son obligatorios');

		return db
			.insertInto('teachers')
			.values({
				first_name: firstName,
				last_name: lastName,
				phone: normalizeNullableText(input.phone)
			})
			.returning('code')
			.executeTakeFirstOrThrow();
	}

	static async update(db: Database, input: UpdateTeacherInput): Promise<boolean> {
		const firstName = normalizeRequiredText(input.firstName, 'Los nombres son obligatorios');
		const lastName = normalizeRequiredText(input.lastName, 'Los apellidos son obligatorios');

		const result = await db
			.updateTable('teachers')
			.set({
				first_name: firstName,
				last_name: lastName,
				phone: normalizeNullableText(input.phone),
				updated_at: new Date()
			})
			.where('code', '=', input.teacherCode)
			.executeTakeFirst();

		return Number(result.numUpdatedRows ?? 0) > 0;
	}

	static async delete(db: Database, teacherCode: string): Promise<boolean> {
		const result = await db
			.deleteFrom('teachers')
			.where('code', '=', teacherCode)
			.executeTakeFirst();

		return Number(result.numDeletedRows ?? 0) > 0;
	}

	static async listSchedulesByTeacher(
		db: Database,
		teacherCode: string
	): Promise<TeacherScheduleItem[]> {
		return TeacherRepository.listSchedulesByTeacherCodes(db, [teacherCode]);
	}

	static async listSchedulesByTeacherCodes(
		db: Database,
		teacherCodes: string[]
	): Promise<TeacherScheduleItem[]> {
		if (teacherCodes.length === 0) return [];

		const rows = await db
			.selectFrom('teacher_schedules as ts')
			.innerJoin('branches as b', 'b.code', 'ts.branch_code')
			.select([
				'ts.code',
				'ts.teacher_code',
				'ts.branch_code',
				'b.name as branch_name',
				'ts.weekday',
				'ts.entry_time',
				'ts.tolerance_minutes',
				'ts.created_at',
				'ts.updated_at'
			])
			.where('ts.teacher_code', 'in', teacherCodes)
			.orderBy('ts.weekday', 'asc')
			.orderBy('ts.entry_time', 'asc')
			.orderBy('b.name', 'asc')
			.execute();

		return rows as TeacherScheduleItem[];
	}

	static async listSchedulesByBranchAndWeekday(
		db: Database,
		branchCode: string,
		weekday: TeacherWeekday
	): Promise<TeacherScheduleItem[]> {
		const rows = await db
			.selectFrom('teacher_schedules as ts')
			.innerJoin('branches as b', 'b.code', 'ts.branch_code')
			.select([
				'ts.code',
				'ts.teacher_code',
				'ts.branch_code',
				'b.name as branch_name',
				'ts.weekday',
				'ts.entry_time',
				'ts.tolerance_minutes',
				'ts.created_at',
				'ts.updated_at'
			])
			.where('ts.branch_code', '=', branchCode)
			.where('ts.weekday', '=', weekday)
			.orderBy('ts.entry_time', 'asc')
			.execute();

		return rows as TeacherScheduleItem[];
	}

	static async createSchedule(db: Database, input: CreateScheduleInput): Promise<{ code: string }> {
		return db
			.insertInto('teacher_schedules')
			.values({
				teacher_code: input.teacherCode,
				branch_code: input.branchCode,
				weekday: input.weekday,
				entry_time: input.entryTime,
				tolerance_minutes: input.toleranceMinutes
			})
			.returning('code')
			.executeTakeFirstOrThrow();
	}

	static async updateSchedule(db: Database, input: UpdateScheduleInput): Promise<boolean> {
		const result = await db
			.updateTable('teacher_schedules')
			.set({
				branch_code: input.branchCode,
				weekday: input.weekday,
				entry_time: input.entryTime,
				tolerance_minutes: input.toleranceMinutes,
				updated_at: new Date()
			})
			.where('code', '=', input.scheduleCode)
			.where('teacher_code', '=', input.teacherCode)
			.executeTakeFirst();

		return Number(result.numUpdatedRows ?? 0) > 0;
	}

	static async deleteSchedule(db: Database, scheduleCode: string): Promise<boolean> {
		return db.transaction().execute(async (trx) => {
			await trx
				.deleteFrom('teacher_attendances')
				.where('schedule_code', '=', scheduleCode)
				.execute();
			const result = await trx
				.deleteFrom('teacher_schedules')
				.where('code', '=', scheduleCode)
				.executeTakeFirst();

			return Number(result.numDeletedRows ?? 0) > 0;
		});
	}
}
