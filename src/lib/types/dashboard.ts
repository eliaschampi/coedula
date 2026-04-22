import type {
	EducationDashboardStatusPoint,
	EducationDashboardSummary,
	EducationRecentEnrollmentItem,
	EducationUpcomingCycleItem
} from './education';

export type DashboardColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

export interface DashboardMetric {
	key: string;
	title: string;
	value: number | string;
	icon: string;
	color: DashboardColor;
	subtitle?: string;
	href?: string;
}

export interface DashboardSeriesPoint {
	key: string;
	label: string;
	value: number;
}

export interface DashboardQuickAction {
	key: string;
	title: string;
	description: string;
	icon: string;
	color: DashboardColor;
	href: string;
	permission: string;
}

export interface DashboardEducationPanel {
	summary: EducationDashboardSummary;
	metrics: DashboardMetric[];
	enrollmentTrend: DashboardSeriesPoint[];
	statusBreakdown: EducationDashboardStatusPoint[];
	recentEnrollments: EducationRecentEnrollmentItem[];
	upcomingCycles: EducationUpcomingCycleItem[];
	quickActions: DashboardQuickAction[];
}

export interface DashboardPanels {
	education: DashboardEducationPanel | null;
}

export interface DashboardStats {
	branches: number;
	cycles: number;
	students: number;
	enrollments: number;
}

export interface DashboardHomeData {
	title: string;
	generatedAt: string;
	canViewDashboard: boolean;
	stats: DashboardStats;
	panels: DashboardPanels;
	quickActions: DashboardQuickAction[];
}
