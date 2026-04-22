import { randomInt } from 'crypto';
import { sql, type Kysely, type Transaction } from 'kysely';
import type { DB, Database } from '$lib/database';
import type {
	AcademicCycleOverview,
	AcademicDegreeCatalogItem,
	CycleDegreeOption,
	CycleOption,
	EducationDashboardStatusPoint,
	EducationDashboardSummary,
	EducationDashboardTrendPoint,
	EducationRecentEnrollmentItem,
	EducationUpcomingCycleItem,
	EnrollmentOverview,
	EnrollmentStatus,
	EnrollmentTurn,
	GroupCode,
	StudentDirectorySummary,
	StudentOption,
	StudentOverview
} from '$lib/types/education';

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat('es-PE', {
	day: '2-digit',
	month: 'short'
});

interface CycleUpsertInput {
	cycleCode?: string;
	branchCode: string;
	title: string;
	modality: string;
	startDate: string | Date;
	endDate: string | Date;
	baseCost: number;
	turn1AttendanceTime: string | null;
	turn1ToleranceMinutes: number;
	turn2AttendanceTime: string | null;
	turn2ToleranceMinutes: number;
	isActive: boolean;
	notes: string | null;
	degreeCodes: string[];
}

interface StudentUpsertInput {
	studentCode?: string;
	firstName: string;
	lastName: string;
	phone: string | null;
	address: string | null;
	dni: string | null;
	birthDate: string | null;
	observation: string | null;
	photoUrl: string | null;
	passwordHash?: string;
	isActive: boolean;
}

interface EnrollmentUpsertInput {
	enrollmentCode?: string;
	studentCode: string;
	cycleDegreeCode: string;
	rollCode?: string | null;
	payCost: number | null;
	turn: EnrollmentTurn;
	status: EnrollmentStatus;
	groupCode: GroupCode;
	observation: string | null;
}

type DatabaseExecutor = Kysely<DB> | Transaction<DB>;

interface TrendRow {
	day_key: string;
	total_count: number | string;
}

const CANONICAL_DEGREE_NAMES = ['Unico', '1ro', '2do', '3ro', '4to', '5to', '6to'] as const;

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

function dedupe(values: string[]): string[] {
	return Array.from(new Set(values));
}

function buildStudentSearchPattern(query: string): string {
	return `%${query.trim().replace(/\s+/g, ' ').replace(/[%_]/g, '').toLowerCase()}%`;
}

function extractYear(value: string | Date): number {
	return new Date(value).getUTCFullYear();
}

function formatRollCode(sequence: number): string {
	return String(sequence).padStart(4, '0');
}

function generateStudentPassword(length = 10): string {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
	return Array.from({ length }, () => alphabet[randomInt(0, alphabet.length)]).join('');
}

async function ensureBranchExists(db: Database, branchCode: string): Promise<void> {
	const branch = await db
		.selectFrom('branches')
		.select('code')
		.where('code', '=', branchCode)
		.executeTakeFirst();

	if (!branch) {
		throw new Error('La sede seleccionada no existe');
	}
}

async function assertDegreeCodes(db: Database, degreeCodes: string[]): Promise<string[]> {
	const uniqueCodes = dedupe(degreeCodes);

	if (uniqueCodes.length === 0) {
		throw new Error('Debe seleccionar al menos un grado');
	}

	const records = await db
		.selectFrom('academic_degrees as ad')
		.select('ad.code')
		.where('ad.code', 'in', uniqueCodes)
		.where('ad.name', 'in', [...CANONICAL_DEGREE_NAMES])
		.where('ad.is_active', '=', true)
		.execute();

	if (records.length !== uniqueCodes.length) {
		throw new Error('La lista de grados contiene registros inválidos');
	}

	return uniqueCodes;
}

async function ensureStudentExists(db: Database, studentCode: string): Promise<void> {
	const student = await db
		.selectFrom('students')
		.select('code')
		.where('code', '=', studentCode)
		.executeTakeFirst();

	if (!student) {
		throw new Error('El alumno seleccionado no existe');
	}
}

async function getCycleDegreeOption(
	db: Database,
	cycleDegreeCode: string
): Promise<CycleDegreeOption | null> {
	const option = await db
		.selectFrom('cycle_degree_overview')
		.selectAll()
		.where('code', '=', cycleDegreeCode)
		.executeTakeFirst();

	return (option as CycleDegreeOption | undefined) ?? null;
}

async function lockEnrollmentRollSequence(
	db: DatabaseExecutor,
	cycleDegreeCode: string,
	groupCode: GroupCode,
	year: number
): Promise<void> {
	const lockKey = `enrollment-roll:${cycleDegreeCode}:${groupCode}:${year}`;
	await sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`.execute(db);
}

async function generateEnrollmentRollCode(
	db: DatabaseExecutor,
	cycleDegreeCode: string,
	groupCode: GroupCode,
	year: number
): Promise<string> {
	const row = await db
		.selectFrom('enrollments')
		.select(sql<number>`COALESCE(MAX(roll_code::integer), 0)`.as('last_roll_code'))
		.where('cycle_degree_code', '=', cycleDegreeCode)
		.where('group_code', '=', groupCode)
		.where(sql<boolean>`EXTRACT(YEAR FROM created_at) = ${year}`)
		.executeTakeFirst();

	return formatRollCode(toNumber(row?.last_roll_code) + 1);
}

export class EducationRepository {
	static generateStudentAccessPassword(): string {
		return generateStudentPassword();
	}

	static async listDegreeCatalog(db: Database): Promise<AcademicDegreeCatalogItem[]> {
		const result = await sql<AcademicDegreeCatalogItem>`
			WITH canonical_degrees AS (
				SELECT DISTINCT ON (ad.name)
					ad.code,
					ad.name AS degree_name,
					ad.short_name AS degree_short_name,
					ad.sort_order AS degree_sort_order,
					ad.name AS label
				FROM public.academic_degrees ad
				WHERE ad.is_active = TRUE
				  AND ad.name IN ('Unico', '1ro', '2do', '3ro', '4to', '5to', '6to')
				ORDER BY
					ad.name ASC,
					ad.sort_order ASC,
					ad.created_at ASC,
					ad.code ASC
			)
			SELECT code, degree_name, degree_short_name, degree_sort_order, label
			FROM canonical_degrees
			ORDER BY degree_sort_order ASC, degree_name ASC
		`.execute(db);

		return result.rows;
	}

	static async listCycles(db: Database): Promise<AcademicCycleOverview[]> {
		const rows = await db
			.selectFrom('cycle_overview')
			.selectAll()
			.orderBy('start_date', 'desc')
			.orderBy('title', 'asc')
			.execute();

		return rows as AcademicCycleOverview[];
	}

	static async createCycle(db: Database, input: CycleUpsertInput): Promise<void> {
		await ensureBranchExists(db, input.branchCode);
		const degreeCodes = await assertDegreeCodes(db, input.degreeCodes);

		await db.transaction().execute(async (trx) => {
			const insertedCycle = await trx
				.insertInto('academic_cycles')
				.values({
					branch_code: input.branchCode,
					title: input.title,
					modality: input.modality,
					start_date: input.startDate,
					end_date: input.endDate,
					base_cost: input.baseCost,
					turn_1_attendance_time: input.turn1AttendanceTime,
					turn_1_tolerance_minutes: input.turn1ToleranceMinutes,
					turn_2_attendance_time: input.turn2AttendanceTime,
					turn_2_tolerance_minutes: input.turn2ToleranceMinutes,
					is_active: input.isActive,
					notes: input.notes
				})
				.returning('code')
				.executeTakeFirst();

			if (!insertedCycle) {
				throw new Error('No se pudo crear el ciclo');
			}

			await trx
				.insertInto('cycle_degrees')
				.values(
					degreeCodes.map((degreeCode) => ({
						cycle_code: insertedCycle.code,
						degree_code: degreeCode
					}))
				)
				.execute();
		});
	}

	static async updateCycle(db: Database, input: CycleUpsertInput): Promise<void> {
		if (!input.cycleCode) {
			throw new Error('Ciclo inválido');
		}

		await ensureBranchExists(db, input.branchCode);
		const nextDegreeCodes = await assertDegreeCodes(db, input.degreeCodes);

		await db.transaction().execute(async (trx) => {
			const existingCycle = await trx
				.selectFrom('academic_cycles')
				.select('code')
				.where('code', '=', input.cycleCode!)
				.executeTakeFirst();

			if (!existingCycle) {
				throw new Error('El ciclo no existe');
			}

			await trx
				.updateTable('academic_cycles')
				.set({
					branch_code: input.branchCode,
					title: input.title,
					modality: input.modality,
					start_date: input.startDate,
					end_date: input.endDate,
					base_cost: input.baseCost,
					turn_1_attendance_time: input.turn1AttendanceTime,
					turn_1_tolerance_minutes: input.turn1ToleranceMinutes,
					turn_2_attendance_time: input.turn2AttendanceTime,
					turn_2_tolerance_minutes: input.turn2ToleranceMinutes,
					is_active: input.isActive,
					notes: input.notes,
					updated_at: new Date()
				})
				.where('code', '=', input.cycleCode!)
				.execute();

			const currentLinks = await trx
				.selectFrom('cycle_degrees')
				.select(['code', 'degree_code'])
				.where('cycle_code', '=', input.cycleCode!)
				.execute();

			const currentDegreeCodes = new Set(currentLinks.map((link) => link.degree_code));
			const nextDegreeCodeSet = new Set(nextDegreeCodes);
			const cycleDegreeCodesToRemove = currentLinks
				.filter((link) => !nextDegreeCodeSet.has(link.degree_code))
				.map((link) => link.code);
			const degreeCodesToAdd = nextDegreeCodes.filter(
				(degreeCode) => !currentDegreeCodes.has(degreeCode)
			);

			if (cycleDegreeCodesToRemove.length > 0) {
				const linkedEnrollments = await trx
					.selectFrom('enrollments')
					.select((eb) => eb.fn.countAll().as('total'))
					.where('cycle_degree_code', 'in', cycleDegreeCodesToRemove)
					.executeTakeFirst();

				if (toNumber(linkedEnrollments?.total) > 0) {
					throw new Error(
						'No se pueden quitar grados que ya tienen matrículas asociadas en este ciclo'
					);
				}

				await trx
					.deleteFrom('cycle_degrees')
					.where('code', 'in', cycleDegreeCodesToRemove)
					.execute();
			}

			if (degreeCodesToAdd.length > 0) {
				await trx
					.insertInto('cycle_degrees')
					.values(
						degreeCodesToAdd.map((degreeCode) => ({
							cycle_code: input.cycleCode!,
							degree_code: degreeCode
						}))
					)
					.execute();
			}
		});
	}

	static async deleteCycle(db: Database, cycleCode: string): Promise<boolean> {
		const linkedEnrollments = await db
			.selectFrom('enrollments as e')
			.innerJoin('cycle_degrees as cd', 'cd.code', 'e.cycle_degree_code')
			.select((eb) => eb.fn.countAll().as('total'))
			.where('cd.cycle_code', '=', cycleCode)
			.executeTakeFirst();

		if (toNumber(linkedEnrollments?.total) > 0) {
			throw new Error('No se puede eliminar un ciclo con matrículas registradas');
		}

		const result = await db
			.deleteFrom('academic_cycles')
			.where('code', '=', cycleCode)
			.executeTakeFirst();

		return Number(result.numDeletedRows ?? 0) > 0;
	}

	static async listStudents(db: Database): Promise<StudentOverview[]> {
		const rows = await db
			.selectFrom('student_overview')
			.selectAll()
			.orderBy('last_name', 'asc')
			.orderBy('first_name', 'asc')
			.execute();

		return rows as StudentOverview[];
	}

	static async searchStudents(db: Database, query: string, limit = 24): Promise<StudentOverview[]> {
		const normalizedQuery = query.trim();
		if (normalizedQuery.length < 2) {
			return [];
		}

		const searchPattern = buildStudentSearchPattern(normalizedQuery);
		const rows = await db
			.selectFrom('student_overview')
			.selectAll()
			.where((eb) =>
				eb.or([
					sql<boolean>`LOWER(full_name) LIKE ${searchPattern}`,
					sql<boolean>`LOWER(student_number) LIKE ${searchPattern}`,
					sql<boolean>`LOWER(COALESCE(dni, '')) LIKE ${searchPattern}`,
					sql<boolean>`LOWER(COALESCE(phone, '')) LIKE ${searchPattern}`
				])
			)
			.orderBy('updated_at', 'desc')
			.orderBy('last_name', 'asc')
			.orderBy('first_name', 'asc')
			.limit(limit)
			.execute();

		return rows as StudentOverview[];
	}

	static async getStudentDirectorySummary(db: Database): Promise<StudentDirectorySummary> {
		const [activeStudents, studentsWithEnrollments, totalEnrollments] = await Promise.all([
			db
				.selectFrom('students')
				.select((eb) => eb.fn.countAll().as('total'))
				.where('is_active', '=', true)
				.executeTakeFirst(),
			db
				.selectFrom('student_overview')
				.select((eb) => eb.fn.countAll().as('total'))
				.where('enrollments_count', '>', 0)
				.executeTakeFirst(),
			db
				.selectFrom('enrollments')
				.select((eb) => eb.fn.countAll().as('total'))
				.executeTakeFirst()
		]);

		return {
			activeStudents: toNumber(activeStudents?.total),
			studentsWithEnrollments: toNumber(studentsWithEnrollments?.total),
			totalEnrollments: toNumber(totalEnrollments?.total)
		};
	}

	static async createStudent(
		db: Database,
		input: StudentUpsertInput
	): Promise<{ code: string; student_number: string }> {
		if (!input.passwordHash) {
			throw new Error('La contraseña del alumno es obligatoria');
		}

		return db
			.insertInto('students')
			.values({
				first_name: input.firstName,
				last_name: input.lastName,
				phone: input.phone,
				address: input.address,
				dni: input.dni,
				birth_date: input.birthDate,
				observation: input.observation,
				photo_url: input.photoUrl,
				password_hash: input.passwordHash,
				is_active: input.isActive
			})
			.returning(['code', 'student_number'])
			.executeTakeFirstOrThrow();
	}

	static async updateStudent(db: Database, input: StudentUpsertInput): Promise<boolean> {
		if (!input.studentCode) {
			throw new Error('Alumno inválido');
		}

		const updatePayload: {
			first_name: string;
			last_name: string;
			phone: string | null;
			address: string | null;
			dni: string | null;
			birth_date: string | null;
			observation: string | null;
			photo_url: string | null;
			is_active: boolean;
			updated_at: Date;
			password_hash?: string;
		} = {
			first_name: input.firstName,
			last_name: input.lastName,
			phone: input.phone,
			address: input.address,
			dni: input.dni,
			birth_date: input.birthDate,
			observation: input.observation,
			photo_url: input.photoUrl,
			is_active: input.isActive,
			updated_at: new Date()
		};

		if (input.passwordHash) {
			updatePayload.password_hash = input.passwordHash;
		}

		const result = await db
			.updateTable('students')
			.set(updatePayload)
			.where('code', '=', input.studentCode)
			.executeTakeFirst();

		return Number(result.numUpdatedRows ?? 0) > 0;
	}

	static async findStudentByCode(
		db: Database,
		studentCode: string
	): Promise<StudentOverview | null> {
		const row = await db
			.selectFrom('student_overview')
			.selectAll()
			.where('code', '=', studentCode)
			.executeTakeFirst();

		return (row as StudentOverview | undefined) ?? null;
	}

	static async listStudentEnrollmentHistory(
		db: Database,
		studentCode: string
	): Promise<EnrollmentOverview[]> {
		const rows = await db
			.selectFrom('enrollment_overview')
			.selectAll()
			.where('student_code', '=', studentCode)
			.orderBy(
				sql<number>`
				CASE status
					WHEN 'active' THEN 0
					WHEN 'inactive' THEN 1
					ELSE 2
				END
			`
			)
			.orderBy('created_at', 'desc')
			.execute();

		return rows as EnrollmentOverview[];
	}

	static async deleteStudent(db: Database, studentCode: string): Promise<boolean> {
		const linkedEnrollments = await db
			.selectFrom('enrollments')
			.select((eb) => eb.fn.countAll().as('total'))
			.where('student_code', '=', studentCode)
			.executeTakeFirst();

		if (toNumber(linkedEnrollments?.total) > 0) {
			throw new Error('No se puede eliminar un alumno con matrículas históricas');
		}

		const result = await db
			.deleteFrom('students')
			.where('code', '=', studentCode)
			.executeTakeFirst();

		return Number(result.numDeletedRows ?? 0) > 0;
	}

	static async listStudentOptions(db: Database): Promise<StudentOption[]> {
		const rows = await db
			.selectFrom('student_overview')
			.select([
				'code',
				'student_number',
				'full_name',
				'dni',
				'photo_url',
				'current_cycle_title',
				'current_degree_name',
				sql<string>`student_number || ' · ' || full_name`.as('label')
			])
			.where('is_active', '=', true)
			.orderBy('last_name', 'asc')
			.orderBy('first_name', 'asc')
			.execute();

		return rows as StudentOption[];
	}

	static async listCycleOptions(db: Database): Promise<CycleOption[]> {
		const rows = await db
			.selectFrom('cycle_overview')
			.select([
				'code',
				'title',
				'branch_name',
				'modality',
				'start_date',
				'end_date',
				sql<string>`title || ' · ' || branch_name || ' · ' || modality`.as('label')
			])
			.orderBy('start_date', 'desc')
			.orderBy('title', 'asc')
			.execute();

		return rows as CycleOption[];
	}

	static async listCycleDegreeOptions(
		db: Database,
		cycleCode?: string | null
	): Promise<CycleDegreeOption[]> {
		const rows = await db
			.selectFrom('cycle_degree_overview')
			.selectAll()
			.$if(Boolean(cycleCode), (qb) => qb.where('cycle_code', '=', cycleCode!))
			.orderBy('start_date', 'desc')
			.orderBy('degree_sort_order', 'asc')
			.orderBy('degree_name', 'asc')
			.execute();

		return rows as CycleDegreeOption[];
	}

	static async listEnrollments(db: Database): Promise<EnrollmentOverview[]> {
		const rows = await db
			.selectFrom('enrollment_overview')
			.selectAll()
			.orderBy('created_at', 'desc')
			.execute();

		return rows as EnrollmentOverview[];
	}

	static async listEnrollmentsByFilters(
		db: Database,
		filters: {
			cycleCode?: string | null;
			cycleDegreeCode?: string | null;
			groupCode?: GroupCode | null;
			search?: string | null;
		}
	): Promise<EnrollmentOverview[]> {
		const search = filters.search?.trim() ?? '';
		const searchPattern = search ? buildStudentSearchPattern(search) : '';

		const rows = await db
			.selectFrom('enrollment_overview')
			.selectAll()
			.$if(Boolean(filters.cycleCode), (qb) => qb.where('cycle_code', '=', filters.cycleCode!))
			.$if(Boolean(filters.cycleDegreeCode), (qb) =>
				qb.where('cycle_degree_code', '=', filters.cycleDegreeCode!)
			)
			.$if(Boolean(filters.groupCode), (qb) => qb.where('group_code', '=', filters.groupCode!))
			.$if(Boolean(search), (qb) =>
				qb.where((eb) =>
					eb.or([
						sql<boolean>`LOWER(student_full_name) LIKE ${searchPattern}`,
						sql<boolean>`LOWER(student_number) LIKE ${searchPattern}`,
						sql<boolean>`LOWER(COALESCE(student_dni, '')) LIKE ${searchPattern}`,
						sql<boolean>`LOWER(enrollment_number) LIKE ${searchPattern}`
					])
				)
			)
			.orderBy('roll_code', 'asc')
			.orderBy('student_full_name', 'asc')
			.execute();

		return rows as EnrollmentOverview[];
	}

	static async createEnrollment(
		db: Database,
		input: EnrollmentUpsertInput
	): Promise<{ code: string; enrollment_number: string; roll_code: string }> {
		await ensureStudentExists(db, input.studentCode);
		const cycleDegree = await getCycleDegreeOption(db, input.cycleDegreeCode);

		if (!cycleDegree) {
			throw new Error('La combinación de ciclo y grado seleccionada no existe');
		}

		const payCost = input.payCost != null ? input.payCost : toNumber(cycleDegree.base_cost);
		const year = extractYear(cycleDegree.start_date ?? new Date());

		return db.transaction().execute(async (trx) => {
			await lockEnrollmentRollSequence(trx, input.cycleDegreeCode, input.groupCode, year);
			const rollCode =
				input.rollCode?.trim() ||
				(await generateEnrollmentRollCode(trx, input.cycleDegreeCode, input.groupCode, year));

			return trx
				.insertInto('enrollments')
				.values({
					student_code: input.studentCode,
					cycle_degree_code: input.cycleDegreeCode,
					roll_code: rollCode,
					pay_cost: payCost,
					turn: input.turn,
					status: input.status,
					group_code: input.groupCode,
					observation: input.observation,
					finalized_at: input.status === 'finalized' ? new Date() : null
				})
				.returning(['code', 'enrollment_number', 'roll_code'])
				.executeTakeFirstOrThrow();
		});
	}

	static async updateEnrollment(db: Database, input: EnrollmentUpsertInput): Promise<boolean> {
		if (!input.enrollmentCode) {
			throw new Error('Matrícula inválida');
		}

		await ensureStudentExists(db, input.studentCode);
		const cycleDegree = await getCycleDegreeOption(db, input.cycleDegreeCode);

		if (!cycleDegree) {
			throw new Error('La combinación de ciclo y grado seleccionada no existe');
		}

		const payCost = input.payCost != null ? input.payCost : toNumber(cycleDegree.base_cost);

		const result = await db
			.updateTable('enrollments')
			.set({
				student_code: input.studentCode,
				cycle_degree_code: input.cycleDegreeCode,
				pay_cost: payCost,
				turn: input.turn,
				status: input.status,
				group_code: input.groupCode,
				observation: input.observation,
				finalized_at: input.status === 'finalized' ? new Date() : null,
				updated_at: new Date()
			})
			.where('code', '=', input.enrollmentCode)
			.executeTakeFirst();

		return Number(result.numUpdatedRows ?? 0) > 0;
	}

	static async deleteEnrollment(db: Database, enrollmentCode: string): Promise<boolean> {
		const result = await db
			.deleteFrom('enrollments')
			.where('code', '=', enrollmentCode)
			.executeTakeFirst();

		return Number(result.numDeletedRows ?? 0) > 0;
	}

	static async loadDashboardSummary(db: Database): Promise<EducationDashboardSummary> {
		const [branches, activeCycles, activeStudents, activeEnrollments] = await Promise.all([
			db
				.selectFrom('branches')
				.select((eb) => eb.fn.countAll().as('total'))
				.executeTakeFirst(),
			db
				.selectFrom('academic_cycles')
				.select((eb) => eb.fn.countAll().as('total'))
				.where('is_active', '=', true)
				.executeTakeFirst(),
			db
				.selectFrom('students')
				.select((eb) => eb.fn.countAll().as('total'))
				.where('is_active', '=', true)
				.executeTakeFirst(),
			db
				.selectFrom('enrollments')
				.select((eb) => eb.fn.countAll().as('total'))
				.where('status', '=', 'active')
				.executeTakeFirst()
		]);

		return {
			branches: toNumber(branches?.total),
			activeCycles: toNumber(activeCycles?.total),
			activeStudents: toNumber(activeStudents?.total),
			activeEnrollments: toNumber(activeEnrollments?.total)
		};
	}

	static async loadEnrollmentTrend(
		db: Database,
		rangeDays = 30
	): Promise<EducationDashboardTrendPoint[]> {
		const result = await sql<TrendRow>`
			WITH date_series AS (
				SELECT (CURRENT_DATE - (${rangeDays}::integer - 1 - offs))::date AS day_date
				FROM generate_series(0, ${rangeDays}::integer - 1) AS gs(offs)
			),
			enrollment_agg AS (
				SELECT
					e.created_at::date AS created_date,
					COUNT(*)::integer AS total_count
				FROM public.enrollments e
				WHERE e.created_at::date >= CURRENT_DATE - (${rangeDays}::integer - 1)
				GROUP BY e.created_at::date
			)
			SELECT
				TO_CHAR(ds.day_date, 'YYYY-MM-DD') AS day_key,
				COALESCE(ea.total_count, 0) AS total_count
			FROM date_series ds
			LEFT JOIN enrollment_agg ea ON ea.created_date = ds.day_date
			ORDER BY ds.day_date ASC
		`.execute(db);

		return result.rows.map((row) => ({
			key: row.day_key,
			label: DAY_LABEL_FORMATTER.format(new Date(`${row.day_key}T12:00:00Z`)),
			value: toNumber(row.total_count)
		}));
	}

	static async loadEnrollmentStatusSeries(db: Database): Promise<EducationDashboardStatusPoint[]> {
		const rows = await db
			.selectFrom('enrollments')
			.select(['status', sql<number>`count(*)`.as('total')])
			.groupBy('status')
			.execute();

		const statusMap = new Map<EnrollmentStatus, number>();
		rows.forEach((row) => {
			statusMap.set(row.status as EnrollmentStatus, toNumber(row.total));
		});

		return [
			{
				key: 'active',
				label: 'Activas',
				value: statusMap.get('active') ?? 0,
				color: 'var(--lumi-color-success)'
			},
			{
				key: 'finalized',
				label: 'Finalizadas',
				value: statusMap.get('finalized') ?? 0,
				color: 'var(--lumi-color-info)'
			},
			{
				key: 'inactive',
				label: 'Inactivas',
				value: statusMap.get('inactive') ?? 0,
				color: 'var(--lumi-color-warning)'
			}
		];
	}

	static async loadRecentEnrollments(
		db: Database,
		limit = 8
	): Promise<EducationRecentEnrollmentItem[]> {
		const rows = await db
			.selectFrom('enrollment_overview')
			.select([
				'code',
				'enrollment_number',
				'student_full_name',
				'student_number',
				'cycle_title',
				'degree_name',
				'group_code',
				'turn',
				'status',
				'created_at',
				'pay_cost'
			])
			.orderBy('created_at', 'desc')
			.limit(limit)
			.execute();

		return rows.map((row) => ({
			...(row as Omit<EducationRecentEnrollmentItem, 'pay_cost'>),
			pay_cost: toNumber(row.pay_cost)
		}));
	}

	static async loadUpcomingCycles(db: Database, limit = 5): Promise<EducationUpcomingCycleItem[]> {
		const rows = await db
			.selectFrom('cycle_overview')
			.select([
				'code',
				'title',
				'branch_name',
				'modality',
				'start_date',
				'end_date',
				'active_enrollment_count',
				'degree_count'
			])
			.where(sql<boolean>`end_date >= CURRENT_DATE`)
			.orderBy('start_date', 'asc')
			.limit(limit)
			.execute();

		return rows as EducationUpcomingCycleItem[];
	}

	static normalizeCycleInput(input: CycleUpsertInput): CycleUpsertInput {
		return {
			...input,
			title: input.title.trim(),
			modality: input.modality.trim(),
			notes: normalizeNullableText(input.notes),
			turn1AttendanceTime: normalizeNullableText(input.turn1AttendanceTime),
			turn2AttendanceTime: normalizeNullableText(input.turn2AttendanceTime),
			degreeCodes: dedupe(input.degreeCodes)
		};
	}

	static normalizeStudentInput(input: StudentUpsertInput): StudentUpsertInput {
		return {
			...input,
			firstName: input.firstName.trim(),
			lastName: input.lastName.trim(),
			phone: normalizeNullableText(input.phone),
			address: normalizeNullableText(input.address),
			dni: normalizeNullableText(input.dni),
			birthDate: normalizeNullableText(input.birthDate),
			observation: normalizeNullableText(input.observation),
			photoUrl: normalizeNullableText(input.photoUrl)
		};
	}

	static normalizeEnrollmentInput(input: EnrollmentUpsertInput): EnrollmentUpsertInput {
		return {
			...input,
			rollCode: input.rollCode?.trim() || null,
			observation: normalizeNullableText(input.observation)
		};
	}
}
