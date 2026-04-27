import type { DateValue, GroupCode } from './education';

export type DashboardColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

export interface DashboardSeriesPoint {
	key: string;
	label: string;
	value: number;
}

export interface DashboardBranchOption {
	code: string;
	name: string;
}

export interface DashboardCycleOption {
	code: string;
	branch_code: string;
	title: string;
	modality: string;
	start_date: DateValue;
	end_date: DateValue;
}

export interface DashboardDegreeOption {
	code: string;
	cycle_code: string;
	degree_code: string;
	degree_name: string;
	degree_short_name: string | null;
	degree_sort_order: number;
	label: string;
}

export interface DashboardGroupOption {
	value: GroupCode;
	label: string;
}

export interface DashboardCourseOption {
	value: string;
	label: string;
}

export interface DashboardRecentStudentItem {
	code: string;
	student_number: string;
	full_name: string;
	cycle_title: string;
	degree_name: string;
	group_code: GroupCode;
	created_at: DateValue;
}

export interface DashboardStudentRankingItem {
	student_code: string;
	roll_code: string;
	student_full_name: string;
	average_score: number;
	total_evaluations: number;
}

export interface DashboardSelection {
	branchCode: string | null;
	cycleCode: string | null;
	cycleDegreeCode: string | null;
	groupCode: GroupCode | null;
	courseCode: string;
}

export interface DashboardHomeData {
	title: string;
	generatedAt: string;
	canViewDashboard: boolean;
	cycles: DashboardCycleOption[];
	degrees: DashboardDegreeOption[];
	groups: DashboardGroupOption[];
	courses: DashboardCourseOption[];
	selection: DashboardSelection;
	enrollmentsByCycle: DashboardSeriesPoint[];
	recentStudents: DashboardRecentStudentItem[];
	studentRanking: DashboardStudentRankingItem[];
	performanceTrend: DashboardSeriesPoint[];
}
