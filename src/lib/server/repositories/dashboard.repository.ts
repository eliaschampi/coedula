import { sql } from 'kysely';
import type { Database } from '$lib/database';
import type { GroupCode } from '$lib/types/education';
import type {
	DashboardCourseOption,
	DashboardCycleOption,
	DashboardDegreeOption,
	DashboardGroupOption,
	DashboardHomeData,
	DashboardRecentStudentItem,
	DashboardSeriesPoint,
	DashboardStudentRankingItem
} from '$lib/types/dashboard';
import { BranchAccessRepository } from '$lib/server/repositories/branch-access.repository';
import { normalizeUuid } from '$lib/utils/validation';

export type DashboardPermissionChecker = (permissionKey: string) => boolean | Promise<boolean>;

interface DashboardLoadOptions {
	userCode?: string | null;
	isSuperAdmin?: boolean;
	branchCode?: string | null;
	cycleCode?: string | null;
	cycleDegreeCode?: string | null;
	groupCode?: string | null;
	courseCode?: string | null;
}

interface NumericSeriesRow {
	key: string;
	label: string;
	value: number | string | bigint | null;
}

interface RecentStudentRow {
	code: string;
	student_number: string;
	full_name: string;
	cycle_title: string;
	degree_name: string;
	group_code: string;
	created_at: Date | string;
}

interface RankingRow {
	student_code: string;
	roll_code: string;
	student_full_name: string;
	average_score: number | string | bigint | null;
	total_evaluations: number | string | bigint | null;
}

const DASHBOARD_TITLE = 'Dashboard';
const GENERAL_COURSE_VALUE = 'general';
const GROUP_OPTIONS: readonly DashboardGroupOption[] = [
	{ value: 'A', label: 'Grupo A' },
	{ value: 'B', label: 'Grupo B' },
	{ value: 'C', label: 'Grupo C' },
	{ value: 'D', label: 'Grupo D' }
];
const VALID_GROUP_CODES = new Set<GroupCode>(GROUP_OPTIONS.map((option) => option.value));

function toNumber(value: number | string | bigint | null | undefined): number {
	if (typeof value === 'bigint') return Number(value);
	if (typeof value === 'number') return value;
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeGroup(value: string | null | undefined): GroupCode | null {
	const normalized = value?.trim().toUpperCase() ?? '';
	return VALID_GROUP_CODES.has(normalized as GroupCode) ? (normalized as GroupCode) : null;
}

function isString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function mapSeries(rows: NumericSeriesRow[]): DashboardSeriesPoint[] {
	return rows.map((row) => ({
		key: row.key,
		label: row.label,
		value: toNumber(row.value)
	}));
}

function emptyDashboard(canViewDashboard = false): DashboardHomeData {
	return {
		title: DASHBOARD_TITLE,
		generatedAt: new Date().toISOString(),
		canViewDashboard,
		cycles: [],
		degrees: [],
		groups: [...GROUP_OPTIONS],
		courses: [{ value: GENERAL_COURSE_VALUE, label: 'General' }],
		selection: {
			branchCode: null,
			cycleCode: null,
			cycleDegreeCode: null,
			groupCode: null,
			courseCode: GENERAL_COURSE_VALUE
		},
		enrollmentsByCycle: [],
		recentStudents: [],
		studentRanking: [],
		performanceTrend: []
	};
}

async function hasPermission(can: DashboardPermissionChecker, key: string): Promise<boolean> {
	return Boolean(await Promise.resolve(can(key)));
}

async function listCycles(
	db: Database,
	branchCode: string | null
): Promise<DashboardCycleOption[]> {
	if (!branchCode) {
		return [];
	}

	const rows = await db
		.selectFrom('cycle_overview')
		.select(['code', 'branch_code', 'title', 'modality', 'start_date', 'end_date'])
		.where('branch_code', '=', branchCode)
		.orderBy('start_date', 'desc')
		.orderBy('title', 'asc')
		.execute();

	return rows.flatMap((row) => {
		if (
			!isString(row.code) ||
			!isString(row.branch_code) ||
			!isString(row.title) ||
			!isString(row.modality)
		) {
			return [];
		}

		return [
			{
				code: row.code,
				branch_code: row.branch_code,
				title: row.title,
				modality: row.modality,
				start_date: row.start_date,
				end_date: row.end_date
			}
		];
	});
}

async function listDegrees(
	db: Database,
	cycleCode: string | null
): Promise<DashboardDegreeOption[]> {
	if (!cycleCode) {
		return [];
	}

	const rows = await db
		.selectFrom('cycle_degree_overview')
		.select([
			'code',
			'cycle_code',
			'degree_code',
			'degree_name',
			'degree_short_name',
			'degree_sort_order',
			'label'
		])
		.where('cycle_code', '=', cycleCode)
		.orderBy('degree_sort_order', 'asc')
		.orderBy('degree_name', 'asc')
		.execute();

	return rows
		.filter(
			(row): row is DashboardDegreeOption =>
				isString(row.code) &&
				isString(row.cycle_code) &&
				isString(row.degree_code) &&
				isString(row.degree_name)
		)
		.map((row) => ({
			code: row.code,
			cycle_code: row.cycle_code,
			degree_code: row.degree_code,
			degree_name: row.degree_name,
			degree_short_name: row.degree_short_name,
			degree_sort_order: toNumber(row.degree_sort_order),
			label: row.label || row.degree_name
		}));
}

async function listGroups(
	db: Database,
	cycleDegreeCode: string | null
): Promise<DashboardGroupOption[]> {
	if (!cycleDegreeCode) {
		return [...GROUP_OPTIONS];
	}

	const result = await sql<{ group_code: string }>`
		WITH available_groups AS (
			SELECT e.group_code
			FROM public.enrollments e
			WHERE e.cycle_degree_code = ${cycleDegreeCode}::uuid
			UNION
			SELECT ev.group_code
			FROM public.evals ev
			WHERE ev.cycle_degree_code = ${cycleDegreeCode}::uuid
		)
		SELECT group_code
		FROM available_groups
		ORDER BY group_code ASC
	`.execute(db);

	const groupCodes = result.rows
		.map((row) => normalizeGroup(row.group_code))
		.filter((value): value is GroupCode => Boolean(value));
	const options = GROUP_OPTIONS.filter((option) => groupCodes.includes(option.value));

	return options.length > 0 ? options : [...GROUP_OPTIONS];
}

async function listCourses(
	db: Database,
	cycleDegreeCode: string | null,
	groupCode: GroupCode | null
): Promise<DashboardCourseOption[]> {
	if (!cycleDegreeCode || !groupCode) {
		return [{ value: GENERAL_COURSE_VALUE, label: 'General' }];
	}

	const result = await sql<{ value: string; label: string }>`
		SELECT DISTINCT
			c.code::text AS value,
			c.name AS label
		FROM public.evals ev
		INNER JOIN public.eval_sections es ON es.eval_code = ev.code
		INNER JOIN public.courses c ON c.code = es.course_code
		WHERE ev.cycle_degree_code = ${cycleDegreeCode}::uuid
			AND ev.group_code = ${groupCode}
		ORDER BY c.name ASC
	`.execute(db);

	return [{ value: GENERAL_COURSE_VALUE, label: 'General' }, ...result.rows];
}

async function loadEnrollmentsByCycle(
	db: Database,
	branchCode: string | null
): Promise<DashboardSeriesPoint[]> {
	if (!branchCode) {
		return [];
	}

	const result = await sql<NumericSeriesRow>`
		SELECT
			cycle_code::text AS key,
			cycle_title AS label,
			enrollment_count AS value
		FROM public.dashboard_enrollments_by_cycle
		WHERE branch_code = ${branchCode}::uuid
		ORDER BY start_date ASC, cycle_title ASC
	`.execute(db);

	return mapSeries(result.rows);
}

async function loadRecentStudents(
	db: Database,
	branchCode: string | null,
	limit = 10
): Promise<DashboardRecentStudentItem[]> {
	if (!branchCode) {
		return [];
	}

	const result = await sql<RecentStudentRow>`
		WITH branch_students AS (
			SELECT
				student_code::text AS code,
				student_number,
				full_name,
				cycle_title,
				degree_name,
				group_code,
				created_at
			FROM public.dashboard_recent_branch_students
			WHERE branch_code = ${branchCode}::uuid
		)
		SELECT *
		FROM branch_students
		ORDER BY created_at DESC
		LIMIT ${limit}
	`.execute(db);

	return result.rows.flatMap((row) => {
		const groupCode = normalizeGroup(row.group_code);

		if (!groupCode) {
			return [];
		}

		return [
			{
				...row,
				group_code: groupCode
			} satisfies DashboardRecentStudentItem
		];
	});
}

async function loadStudentRanking(
	db: Database,
	cycleDegreeCode: string | null,
	groupCode: GroupCode | null,
	limit = 10
): Promise<DashboardStudentRankingItem[]> {
	if (!cycleDegreeCode || !groupCode) {
		return [];
	}

	const result = await sql<RankingRow>`
		SELECT
			student_code::text AS student_code,
			roll_code,
			student_full_name,
			average_score,
			total_evaluations
		FROM public.dashboard_student_score_ranking
		WHERE cycle_degree_code = ${cycleDegreeCode}::uuid
			AND group_code = ${groupCode}
		ORDER BY average_score DESC NULLS LAST, student_full_name ASC
		LIMIT ${limit}
	`.execute(db);

	return result.rows.map((row) => ({
		student_code: row.student_code,
		roll_code: row.roll_code,
		student_full_name: row.student_full_name,
		average_score: toNumber(row.average_score),
		total_evaluations: toNumber(row.total_evaluations)
	}));
}

async function loadGeneralPerformanceTrend(
	db: Database,
	cycleDegreeCode: string,
	groupCode: GroupCode
): Promise<DashboardSeriesPoint[]> {
	const result = await sql<NumericSeriesRow>`
		SELECT
			eval_code::text AS key,
			eval_name AS label,
			average_score AS value
		FROM public.dashboard_general_performance_trend
		WHERE cycle_degree_code = ${cycleDegreeCode}::uuid
			AND group_code = ${groupCode}
		ORDER BY eval_date ASC, created_at ASC
	`.execute(db);

	return mapSeries(result.rows);
}

async function loadCoursePerformanceTrend(
	db: Database,
	cycleDegreeCode: string,
	groupCode: GroupCode,
	courseCode: string
): Promise<DashboardSeriesPoint[]> {
	const result = await sql<NumericSeriesRow>`
		SELECT
			eval_code::text AS key,
			eval_name AS label,
			average_score AS value
		FROM public.dashboard_course_performance_trend
		WHERE cycle_degree_code = ${cycleDegreeCode}::uuid
			AND group_code = ${groupCode}
			AND course_code = ${courseCode}::uuid
		ORDER BY eval_date ASC, created_at ASC
	`.execute(db);

	return mapSeries(result.rows);
}

async function loadPerformanceTrend(
	db: Database,
	cycleDegreeCode: string | null,
	groupCode: GroupCode | null,
	courseCode: string
): Promise<DashboardSeriesPoint[]> {
	if (!cycleDegreeCode || !groupCode) {
		return [];
	}

	if (courseCode === GENERAL_COURSE_VALUE) {
		return loadGeneralPerformanceTrend(db, cycleDegreeCode, groupCode);
	}

	return loadCoursePerformanceTrend(db, cycleDegreeCode, groupCode, courseCode);
}

export class DashboardRepository {
	static async loadHome(
		db: Database,
		can: DashboardPermissionChecker,
		options: DashboardLoadOptions = {}
	): Promise<DashboardHomeData> {
		const canReadDashboard = await hasPermission(can, 'dashboard:read');

		if (!canReadDashboard) {
			return emptyDashboard(false);
		}

		const branches = await BranchAccessRepository.listForUser(
			db,
			options.userCode,
			Boolean(options.isSuperAdmin)
		);
		const selectedBranchCode = BranchAccessRepository.pickAllowedBranch(
			options.branchCode,
			branches
		);
		const cycles = await listCycles(db, selectedBranchCode);
		const selectedCycleCode = BranchAccessRepository.pickAllowedBranch(options.cycleCode, cycles);
		const degrees = await listDegrees(db, selectedCycleCode);
		const selectedCycleDegreeCode = BranchAccessRepository.pickAllowedBranch(
			options.cycleDegreeCode,
			degrees
		);
		const groups = await listGroups(db, selectedCycleDegreeCode);
		const requestedGroup = normalizeGroup(options.groupCode);
		const selectedGroupCode =
			groups.find((option) => option.value === requestedGroup)?.value ?? groups[0]?.value ?? null;
		const courses = await listCourses(db, selectedCycleDegreeCode, selectedGroupCode);
		const requestedCourseCode =
			options.courseCode === GENERAL_COURSE_VALUE
				? GENERAL_COURSE_VALUE
				: normalizeUuid(options.courseCode);
		const selectedCourseCode =
			courses.find((option) => option.value === requestedCourseCode)?.value ?? GENERAL_COURSE_VALUE;

		const [enrollmentsByCycle, recentStudents, studentRanking, performanceTrend] =
			await Promise.all([
				loadEnrollmentsByCycle(db, selectedBranchCode),
				loadRecentStudents(db, selectedBranchCode),
				loadStudentRanking(db, selectedCycleDegreeCode, selectedGroupCode),
				loadPerformanceTrend(db, selectedCycleDegreeCode, selectedGroupCode, selectedCourseCode)
			]);

		return {
			title: DASHBOARD_TITLE,
			generatedAt: new Date().toISOString(),
			canViewDashboard: true,
			cycles,
			degrees,
			groups,
			courses,
			selection: {
				branchCode: selectedBranchCode,
				cycleCode: selectedCycleCode,
				cycleDegreeCode: selectedCycleDegreeCode,
				groupCode: selectedGroupCode,
				courseCode: selectedCourseCode
			},
			enrollmentsByCycle,
			recentStudents,
			studentRanking,
			performanceTrend
		};
	}
}
