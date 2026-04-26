import { sql } from 'kysely';
import type { Database } from '$lib/database';
import type {
	AttendanceDailyRow,
	AttendanceOverviewItem,
	AttendanceScanResult,
	AttendanceState
} from '$lib/types/attendance';
import type { EnrollmentTurn, GroupCode } from '$lib/types/education';
import { resolveAutomaticAttendance } from '$lib/server/services/attendance.service';

interface AttendanceUpsertInput {
	attendanceCode?: string;
	enrollmentCode: string;
	attendanceDate: string;
	state: AttendanceState;
	entryTime: string | null;
	observation: string | null;
}

interface AttendanceListFilters {
	attendanceDate: string;
	cycleCode?: string | null;
	cycleDegreeCode?: string | null;
	groupCode?: GroupCode | null;
	turn?: EnrollmentTurn | null;
	search?: string | null;
}

interface ScanCandidate {
	cycle_code: string;
	cycle_title: string;
	degree_name: string;
	enrollment_code: string;
	enrollment_number: string;
	group_code: GroupCode;
	roll_code: string;
	student_code: string;
	student_dni: string | null;
	student_full_name: string;
	student_number: string;
	student_photo_url: string | null;
	turn: EnrollmentTurn;
	turn_1_attendance_time: string | null;
	turn_1_tolerance_minutes: number;
	turn_2_attendance_time: string | null;
	turn_2_tolerance_minutes: number;
}

function toNumber(value: number | string | bigint | null | undefined): number {
	if (typeof value === 'bigint') return Number(value);
	if (typeof value === 'number') return value;
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeNullableText(value: string | null | undefined): string | null {
	const normalized = value?.trim() ?? '';
	return normalized.length > 0 ? normalized : null;
}

function buildStudentSearchPattern(query: string): string {
	return `%${query.trim().replace(/\s+/g, ' ').replace(/[%_]/g, '').toLowerCase()}%`;
}

function sqlDate(value: string) {
	return sql<Date>`${value}::date`;
}

async function ensureEnrollmentExists(db: Database, enrollmentCode: string): Promise<void> {
	const enrollment = await db
		.selectFrom('enrollments')
		.select('code')
		.where('code', '=', enrollmentCode)
		.executeTakeFirst();

	if (!enrollment) {
		throw new Error('La matrícula seleccionada no existe');
	}
}

export class AttendanceRepository {
	static async listDailyByFilters(
		db: Database,
		filters: AttendanceListFilters
	): Promise<AttendanceDailyRow[]> {
		const search = filters.search?.trim() ?? '';
		const searchPattern = search ? buildStudentSearchPattern(search) : '';

		const rows = await db
			.selectFrom('enrollment_overview as eo')
			.innerJoin('students as s', 's.code', 'eo.student_code')
			.leftJoin('attendances as a', (join) =>
				join
					.onRef('a.enrollment_code', '=', 'eo.code')
					.on('a.attendance_date', '=', sqlDate(filters.attendanceDate))
			)
			.select([
				'eo.code as enrollment_code',
				'eo.enrollment_number',
				'eo.student_code',
				'eo.student_number',
				'eo.student_full_name',
				'eo.student_dni',
				'eo.student_phone',
				's.photo_url as student_photo_url',
				'eo.cycle_degree_code',
				'eo.cycle_code',
				'eo.branch_code',
				'eo.branch_name',
				'eo.cycle_title',
				'eo.degree_name',
				'eo.roll_code',
				'eo.turn',
				'eo.group_code',
				'a.code as attendance_code',
				'a.attendance_date',
				sql<AttendanceState | null>`a.state`.as('attendance_state'),
				'a.entry_time as attendance_entry_time',
				'a.observation as attendance_observation',
				'a.created_at as attendance_created_at',
				'a.updated_at as attendance_updated_at'
			])
			.where('eo.is_active', '=', true)
			.where('eo.end_date', '>=', sqlDate(filters.attendanceDate))
			.$if(Boolean(filters.cycleCode), (qb) => qb.where('eo.cycle_code', '=', filters.cycleCode!))
			.$if(Boolean(filters.cycleDegreeCode), (qb) =>
				qb.where('eo.cycle_degree_code', '=', filters.cycleDegreeCode!)
			)
			.$if(Boolean(filters.groupCode), (qb) => qb.where('eo.group_code', '=', filters.groupCode!))
			// Listado por toma: incluye matrícula `both` (ver enrollmentTurnMatchesListFilter).
			.$if(Boolean(filters.turn), (qb) => {
				const t = filters.turn!;
				if (t === 'turn_1' || t === 'turn_2') {
					return t === 'turn_1'
						? qb.where('eo.turn', 'in', ['turn_1', 'both'])
						: qb.where('eo.turn', 'in', ['turn_2', 'both']);
				}
				if (t === 'both') {
					return qb.where('eo.turn', '=', 'both');
				}
				return qb;
			})
			.$if(Boolean(search), (qb) =>
				qb.where((eb) =>
					eb.or([
						sql<boolean>`LOWER(eo.student_full_name) LIKE ${searchPattern}`,
						sql<boolean>`LOWER(eo.student_number) LIKE ${searchPattern}`,
						sql<boolean>`LOWER(COALESCE(eo.student_dni, '')) LIKE ${searchPattern}`,
						sql<boolean>`LOWER(eo.roll_code) LIKE ${searchPattern}`
					])
				)
			)
			.orderBy('eo.roll_code', 'asc')
			.orderBy('eo.student_full_name', 'asc')
			.execute();

		return rows as AttendanceDailyRow[];
	}

	static async listByStudentAndRange(
		db: Database,
		studentCode: string,
		fromDate: string,
		toDate: string,
		turn?: EnrollmentTurn | null
	): Promise<AttendanceOverviewItem[]> {
		const rows = await db
			.selectFrom('attendance_overview')
			.selectAll()
			.where('student_code', '=', studentCode)
			.where('attendance_date', '>=', sqlDate(fromDate))
			.where('attendance_date', '<=', sqlDate(toDate))
			.$if(Boolean(turn), (qb) => {
				const t = turn!;
				if (t === 'turn_1' || t === 'turn_2') {
					return t === 'turn_1'
						? qb.where('turn', 'in', ['turn_1', 'both'])
						: qb.where('turn', 'in', ['turn_2', 'both']);
				}
				if (t === 'both') {
					return qb.where('turn', '=', 'both');
				}
				return qb;
			})
			.orderBy('attendance_date', 'desc')
			.orderBy('attendance_created_at', 'desc')
			.execute();

		return rows as AttendanceOverviewItem[];
	}

	static async createAttendance(
		db: Database,
		input: AttendanceUpsertInput
	): Promise<{ code: string }> {
		await ensureEnrollmentExists(db, input.enrollmentCode);

		return db
			.insertInto('attendances')
			.values({
				enrollment_code: input.enrollmentCode,
				attendance_date: sqlDate(input.attendanceDate),
				state: input.state,
				entry_time: input.entryTime,
				observation: normalizeNullableText(input.observation)
			})
			.returning('code')
			.executeTakeFirstOrThrow();
	}

	static async updateAttendance(db: Database, input: AttendanceUpsertInput): Promise<boolean> {
		if (!input.attendanceCode) {
			throw new Error('El registro de asistencia seleccionado no es válido');
		}

		const result = await db
			.updateTable('attendances')
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

	static async completeMissingForFilters(
		db: Database,
		filters: Omit<AttendanceListFilters, 'search'>
	): Promise<number> {
		return db.transaction().execute(async (trx) => {
			const missingRows = await trx
				.selectFrom('enrollment_overview as eo')
				.leftJoin('attendances as a', (join) =>
					join
						.onRef('a.enrollment_code', '=', 'eo.code')
						.on('a.attendance_date', '=', sqlDate(filters.attendanceDate))
				)
				.select('eo.code as enrollment_code')
				.where('eo.is_active', '=', true)
				.where('eo.end_date', '>=', sqlDate(filters.attendanceDate))
				.where('eo.code', 'is not', null)
				.where('a.code', 'is', null)
				.$if(Boolean(filters.cycleCode), (qb) => qb.where('eo.cycle_code', '=', filters.cycleCode!))
				.$if(Boolean(filters.cycleDegreeCode), (qb) =>
					qb.where('eo.cycle_degree_code', '=', filters.cycleDegreeCode!)
				)
				.$if(Boolean(filters.groupCode), (qb) => qb.where('eo.group_code', '=', filters.groupCode!))
				.$if(Boolean(filters.turn), (qb) => {
					const t = filters.turn!;
					if (t === 'turn_1' || t === 'turn_2') {
						return t === 'turn_1'
							? qb.where('eo.turn', 'in', ['turn_1', 'both'])
							: qb.where('eo.turn', 'in', ['turn_2', 'both']);
					}
					if (t === 'both') {
						return qb.where('eo.turn', '=', 'both');
					}
					return qb;
				})
				.execute();

			if (missingRows.length === 0) {
				return 0;
			}

			const enrollmentCodes = missingRows.flatMap((row) =>
				row.enrollment_code ? [row.enrollment_code] : []
			);

			if (enrollmentCodes.length === 0) {
				return 0;
			}

			await trx
				.insertInto('attendances')
				.values(
					enrollmentCodes.map((enrollmentCode) => ({
						enrollment_code: enrollmentCode,
						attendance_date: sqlDate(filters.attendanceDate),
						state: 'falta' as AttendanceState,
						entry_time: null,
						observation: null
					}))
				)
				.execute();

			return enrollmentCodes.length;
		});
	}

	static async findByEnrollmentAndDate(
		db: Database,
		enrollmentCode: string,
		attendanceDate: string
	): Promise<AttendanceOverviewItem | null> {
		const row = await db
			.selectFrom('attendance_overview')
			.selectAll()
			.where('enrollment_code', '=', enrollmentCode)
			.where('attendance_date', '=', sqlDate(attendanceDate))
			.executeTakeFirst();

		return (row as AttendanceOverviewItem | undefined) ?? null;
	}

	static async registerByStudentDni(
		db: Database,
		dni: string,
		attendanceDate: string
	): Promise<AttendanceScanResult> {
		const candidate = await db
			.selectFrom('enrollment_overview as eo')
			.innerJoin('students as s', 's.code', 'eo.student_code')
			.innerJoin('academic_cycles as ac', 'ac.code', 'eo.cycle_code')
			.select([
				'eo.cycle_code',
				'eo.cycle_title',
				'eo.degree_name',
				'eo.code as enrollment_code',
				'eo.enrollment_number',
				'eo.group_code',
				'eo.roll_code',
				'eo.student_code',
				'eo.student_dni',
				'eo.student_full_name',
				'eo.student_number',
				's.photo_url as student_photo_url',
				'eo.turn',
				'ac.turn_1_attendance_time',
				'ac.turn_1_tolerance_minutes',
				'ac.turn_2_attendance_time',
				'ac.turn_2_tolerance_minutes',
				sql<number>`
					CASE
						WHEN CURRENT_DATE BETWEEN ac.start_date::date AND ac.end_date::date THEN 0
						WHEN ac.is_active = TRUE THEN 1
						ELSE 2
					END
				`.as('priority')
			])
			.where('eo.is_active', '=', true)
			.where('eo.end_date', '>=', sqlDate(attendanceDate))
			.where('s.dni', '=', dni)
			.orderBy('priority', 'asc')
			.orderBy('ac.end_date', 'desc')
			.orderBy('eo.created_at', 'desc')
			.limit(1)
			.executeTakeFirst();

		const activeEnrollment = candidate as (ScanCandidate & { priority: number }) | undefined;

		if (!activeEnrollment) {
			throw new Error('No encontramos una matrícula activa para ese DNI');
		}

		const existingAttendance = await AttendanceRepository.findByEnrollmentAndDate(
			db,
			activeEnrollment.enrollment_code,
			attendanceDate
		);

		if (existingAttendance) {
			return {
				status: 'already_registered',
				message: `La asistencia ya fue registrada como ${existingAttendance.attendance_state}`,
				attendance: {
					attendance_code: existingAttendance.attendance_code,
					attendance_date: attendanceDate,
					attendance_entry_time: existingAttendance.attendance_entry_time,
					attendance_state: existingAttendance.attendance_state
				},
				student: {
					code: activeEnrollment.student_code,
					full_name: activeEnrollment.student_full_name,
					student_number: activeEnrollment.student_number,
					dni: activeEnrollment.student_dni,
					photo_url: activeEnrollment.student_photo_url
				},
				enrollment: {
					code: activeEnrollment.enrollment_code,
					enrollment_number: activeEnrollment.enrollment_number,
					cycle_title: activeEnrollment.cycle_title,
					degree_name: activeEnrollment.degree_name,
					group_code: activeEnrollment.group_code,
					turn: activeEnrollment.turn
				}
			};
		}

		const automaticResolution = resolveAutomaticAttendance({
			turn: activeEnrollment.turn,
			turn1AttendanceTime: activeEnrollment.turn_1_attendance_time,
			turn1ToleranceMinutes: toNumber(activeEnrollment.turn_1_tolerance_minutes),
			turn2AttendanceTime: activeEnrollment.turn_2_attendance_time,
			turn2ToleranceMinutes: toNumber(activeEnrollment.turn_2_tolerance_minutes)
		});

		const inserted = await AttendanceRepository.createAttendance(db, {
			enrollmentCode: activeEnrollment.enrollment_code,
			attendanceDate,
			state: automaticResolution.state,
			entryTime: automaticResolution.entryTime,
			observation: null
		});

		return {
			status: 'created',
			message:
				automaticResolution.state === 'tarde'
					? 'Asistencia registrada como tarde'
					: 'Asistencia registrada correctamente',
			attendance: {
				attendance_code: inserted.code,
				attendance_date: attendanceDate,
				attendance_entry_time: automaticResolution.entryTime,
				attendance_state: automaticResolution.state
			},
			student: {
				code: activeEnrollment.student_code,
				full_name: activeEnrollment.student_full_name,
				student_number: activeEnrollment.student_number,
				dni: activeEnrollment.student_dni,
				photo_url: activeEnrollment.student_photo_url
			},
			enrollment: {
				code: activeEnrollment.enrollment_code,
				enrollment_number: activeEnrollment.enrollment_number,
				cycle_title: activeEnrollment.cycle_title,
				degree_name: activeEnrollment.degree_name,
				group_code: activeEnrollment.group_code,
				turn: activeEnrollment.turn
			}
		};
	}
}
