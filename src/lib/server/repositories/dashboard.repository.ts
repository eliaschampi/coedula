import type { Database } from '$lib/database';
import { EducationRepository } from './education.repository';
import type {
	DashboardHomeData,
	DashboardMetric,
	DashboardQuickAction
} from '$lib/types/dashboard';

export type DashboardPermissionChecker = (permissionKey: string) => boolean | Promise<boolean>;

interface DashboardLoadOptions {
	branchCode?: string | null;
	rangeDays?: number | string | null;
}

const DASHBOARD_TITLE = 'Dashboard';

const QUICK_ACTIONS: readonly DashboardQuickAction[] = [
	{
		key: 'cycles:create',
		permission: 'cycles:create',
		title: 'Nuevo ciclo',
		description: 'Configurar un nuevo periodo académico',
		icon: 'bookOpen',
		color: 'primary',
		href: '/cycles'
	},
	{
		key: 'students:create',
		permission: 'students:create',
		title: 'Nuevo alumno',
		description: 'Registrar un nuevo estudiante',
		icon: 'userPlus',
		color: 'success',
		href: '/students'
	},
	{
		key: 'enrollments:create',
		permission: 'enrollments:create',
		title: 'Nueva matrícula',
		description: 'Matricular alumno en un ciclo y grado',
		icon: 'userCheck',
		color: 'info',
		href: '/enrollments'
	},
	{
		key: 'branches:create',
		permission: 'branches:create',
		title: 'Nueva sede',
		description: 'Registrar una nueva sede educativa',
		icon: 'building',
		color: 'secondary',
		href: '/branches'
	},
	{
		key: 'users:create',
		permission: 'users:create',
		title: 'Nuevo usuario',
		description: 'Crear cuenta para administración interna',
		icon: 'users',
		color: 'warning',
		href: '/users'
	}
];

async function hasPermission(can: DashboardPermissionChecker, key: string): Promise<boolean> {
	return Boolean(await Promise.resolve(can(key)));
}

async function loadPermissionMap(
	can: DashboardPermissionChecker,
	keys: readonly string[]
): Promise<Record<string, boolean>> {
	const entries = await Promise.all(
		keys.map(async (key) => [key, await hasPermission(can, key)] as const)
	);
	return Object.fromEntries(entries);
}

function buildEducationMetrics(summary: {
	activeCycles: number;
	activeStudents: number;
	activeEnrollments: number;
	branches: number;
}): DashboardMetric[] {
	return [
		{
			key: 'cycles',
			title: 'Ciclos activos',
			value: summary.activeCycles,
			icon: 'bookOpen',
			color: 'primary',
			subtitle: 'Periodos disponibles',
			href: '/cycles'
		},
		{
			key: 'students',
			title: 'Alumnos activos',
			value: summary.activeStudents,
			icon: 'users',
			color: 'success',
			subtitle: 'Padrón vigente',
			href: '/students'
		},
		{
			key: 'enrollments',
			title: 'Matrículas activas',
			value: summary.activeEnrollments,
			icon: 'userCheck',
			color: 'info',
			subtitle: 'Asignaciones en curso',
			href: '/enrollments'
		},
		{
			key: 'branches',
			title: 'Sedes',
			value: summary.branches,
			icon: 'building',
			color: 'secondary',
			subtitle: 'Operativas en la red',
			href: '/branches'
		}
	];
}

function filterQuickActions(
	permissions: Record<string, boolean>,
	filter?: (action: DashboardQuickAction) => boolean
): DashboardQuickAction[] {
	return QUICK_ACTIONS.filter((action) => permissions[action.permission]).filter((action) =>
		filter ? filter(action) : true
	);
}

export class DashboardRepository {
	static async loadHome(
		db: Database,
		can: DashboardPermissionChecker,
		_options: DashboardLoadOptions = {}
	): Promise<DashboardHomeData> {
		const permissionKeys = [
			'dashboard:read',
			'users:create',
			'branches:create',
			'cycles:read',
			'cycles:create',
			'students:read',
			'students:create',
			'enrollments:read',
			'enrollments:create'
		] as const;

		const permissions = await loadPermissionMap(can, permissionKeys);
		const canReadEducation =
			permissions['dashboard:read'] ||
			permissions['cycles:read'] ||
			permissions['students:read'] ||
			permissions['enrollments:read'];

		const quickActions = filterQuickActions(permissions);
		const canViewDashboard =
			permissions['dashboard:read'] ||
			Object.values(permissions).some(Boolean) ||
			quickActions.length > 0;

		if (!canReadEducation) {
			return {
				title: DASHBOARD_TITLE,
				generatedAt: new Date().toISOString(),
				canViewDashboard,
				stats: {
					branches: 0,
					cycles: 0,
					students: 0,
					enrollments: 0
				},
				panels: { education: null },
				quickActions
			};
		}

		const [summary, enrollmentTrend, statusBreakdown, recentEnrollments, upcomingCycles] =
			await Promise.all([
				EducationRepository.loadDashboardSummary(db),
				EducationRepository.loadEnrollmentTrend(db),
				EducationRepository.loadEnrollmentStatusSeries(db),
				EducationRepository.loadRecentEnrollments(db),
				EducationRepository.loadUpcomingCycles(db)
			]);

		return {
			title: DASHBOARD_TITLE,
			generatedAt: new Date().toISOString(),
			canViewDashboard,
			stats: {
				branches: summary.branches,
				cycles: summary.activeCycles,
				students: summary.activeStudents,
				enrollments: summary.activeEnrollments
			},
			panels: {
				education: {
					summary,
					metrics: buildEducationMetrics(summary),
					enrollmentTrend,
					statusBreakdown,
					recentEnrollments,
					upcomingCycles,
					quickActions: filterQuickActions(permissions, (action) =>
						['cycles:create', 'students:create', 'enrollments:create'].includes(action.permission)
					)
				}
			},
			quickActions
		};
	}
}
