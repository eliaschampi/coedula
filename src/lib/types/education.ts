import type { DriveFileType } from '$lib/utils/drive';

export type DateValue = string | Date | null;

export type EnrollmentTurn = 'turn_1' | 'turn_2' | 'both';
export type EnrollmentStatus = 'active' | 'finalized' | 'inactive';
export type GroupCode = 'A' | 'B' | 'C' | 'D';

export interface AcademicDegreeCatalogItem {
	code: string;
	degree_name: string;
	degree_short_name: string | null;
	degree_sort_order: number;
	label: string;
}

export interface AcademicCycleOverview {
	code: string;
	branch_code: string;
	branch_name: string;
	title: string;
	modality: string;
	start_date: DateValue;
	end_date: DateValue;
	base_cost: string | number;
	turn_1_attendance_time: string | null;
	turn_1_tolerance_minutes: number;
	turn_2_attendance_time: string | null;
	turn_2_tolerance_minutes: number;
	is_active: boolean;
	notes: string | null;
	degree_count: number;
	degrees_summary: string;
	enrollment_count: number;
	active_enrollment_count: number;
	created_at: DateValue;
	updated_at: DateValue;
}

export interface CycleDegreeOption {
	code: string;
	cycle_code: string;
	degree_code: string;
	branch_code: string;
	branch_name: string;
	cycle_title: string;
	modality: string;
	start_date: DateValue;
	end_date: DateValue;
	base_cost: string | number;
	cycle_is_active: boolean;
	degree_name: string;
	degree_short_name: string | null;
	degree_sort_order: number;
	label: string;
	created_at: DateValue;
	updated_at: DateValue;
}

export interface StudentOverview {
	code: string;
	student_number: string;
	first_name: string;
	last_name: string;
	full_name: string;
	phone: string | null;
	address: string | null;
	dni: string | null;
	birth_date: DateValue;
	observation: string | null;
	photo_url: string | null;
	is_active: boolean;
	created_at: DateValue;
	updated_at: DateValue;
	enrollments_count: number;
	current_enrollment_number: string | null;
	current_enrollment_status: EnrollmentStatus | null;
	current_cycle_title: string | null;
	current_degree_name: string | null;
	current_branch_name: string | null;
}

export interface StudentOption {
	code: string;
	student_number: string;
	full_name: string;
	dni: string | null;
	photo_url: string | null;
	current_cycle_title: string | null;
	current_degree_name: string | null;
	current_group_code?: GroupCode | null;
	label: string;
}

export interface CycleOption {
	code: string;
	title: string;
	branch_name: string;
	modality: string;
	start_date: DateValue;
	end_date: DateValue;
	label: string;
}

export interface EnrollmentOverview {
	code: string;
	enrollment_number: string;
	student_code: string;
	student_number: string;
	first_name: string;
	last_name: string;
	student_full_name: string;
	student_phone: string | null;
	student_dni: string | null;
	cycle_degree_code: string;
	cycle_code: string;
	branch_code: string;
	branch_name: string;
	cycle_title: string;
	modality: string;
	start_date: DateValue;
	end_date: DateValue;
	degree_code: string;
	degree_name: string;
	roll_code: string;
	pay_cost: string | number;
	turn: EnrollmentTurn;
	status: EnrollmentStatus;
	group_code: GroupCode;
	observation: string | null;
	finalized_at: DateValue;
	created_at: DateValue;
	updated_at: DateValue;
}

export interface StudentDirectorySummary {
	activeStudents: number;
	studentsWithEnrollments: number;
	totalEnrollments: number;
}

export interface StudentDriveLink {
	link_code: string;
	file_code: string;
	file_name: string;
	file_type: DriveFileType;
	file_size: string | number;
	mime_type: string | null;
	linked_at: string;
	file_created_at: string;
	file_updated_at: string;
}

export interface EducationDashboardSummary {
	activeCycles: number;
	activeStudents: number;
	activeEnrollments: number;
	branches: number;
}

export interface EducationDashboardTrendPoint {
	key: string;
	label: string;
	value: number;
}

export interface EducationDashboardStatusPoint {
	key: EnrollmentStatus;
	label: string;
	value: number;
	color: string;
}

export interface EducationRecentEnrollmentItem {
	code: string;
	enrollment_number: string;
	student_full_name: string;
	student_number: string;
	cycle_title: string;
	degree_name: string;
	group_code: GroupCode;
	turn: EnrollmentTurn;
	status: EnrollmentStatus;
	pay_cost: number;
	created_at: DateValue;
}

export interface EducationUpcomingCycleItem {
	code: string;
	title: string;
	branch_name: string;
	modality: string;
	start_date: DateValue;
	end_date: DateValue;
	active_enrollment_count: number;
	degree_count: number;
}
