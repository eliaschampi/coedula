import type { DateValue } from './education';

export type TeacherWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type TeacherAttendanceState = 'presente' | 'tarde';

export interface TeacherOverviewItem {
	code: string;
	teacher_number: string;
	first_name: string;
	last_name: string;
	full_name: string;
	phone: string | null;
	created_at: DateValue;
	updated_at: DateValue;
}

export interface TeacherScheduleItem {
	code: string;
	teacher_code: string;
	branch_code: string;
	branch_name: string;
	weekday: TeacherWeekday;
	entry_time: string;
	tolerance_minutes: number;
	created_at: DateValue;
	updated_at: DateValue;
}

export interface TeacherDirectoryItem extends TeacherOverviewItem {
	schedules: TeacherScheduleItem[];
}

export interface TeacherBranchOption {
	code: string;
	name: string;
}

export interface TeacherOption {
	code: string;
	teacher_number: string;
	full_name: string;
	phone: string | null;
}

export interface TeacherAttendanceRow {
	attendance_code: string;
	attendance_date: DateValue;
	attendance_state: TeacherAttendanceState;
	attendance_entry_time: string;
	attendance_observation: string | null;
	attendance_created_at: DateValue;
	attendance_updated_at: DateValue;
	teacher_code: string;
	teacher_number: string;
	teacher_full_name: string;
	teacher_phone: string | null;
	branch_code: string;
	branch_name: string;
	schedule_code: string;
	schedule_weekday: TeacherWeekday;
	schedule_entry_time: string;
	schedule_tolerance_minutes: number;
}

export interface TeacherScanResult {
	status: 'created' | 'already_registered';
	message: string;
	attendance: {
		attendance_code: string;
		attendance_date: string;
		attendance_entry_time: string;
		attendance_state: TeacherAttendanceState;
	};
	teacher: {
		code: string;
		full_name: string;
		teacher_number: string;
		phone: string | null;
	};
	schedule: {
		code: string;
		branch_code: string;
		branch_name: string;
		weekday: TeacherWeekday;
		entry_time: string;
		tolerance_minutes: number;
	};
}
