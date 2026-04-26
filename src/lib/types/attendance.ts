import type { DateValue, EnrollmentTurn, GroupCode } from './education';

export type AttendanceState = 'presente' | 'falta' | 'tarde' | 'justificado' | 'permiso';

export interface AttendanceOverviewItem {
	attendance_code: string;
	attendance_created_at: DateValue;
	attendance_date: DateValue;
	attendance_entry_time: string | null;
	attendance_observation: string | null;
	attendance_state: AttendanceState;
	attendance_updated_at: DateValue;
	branch_code: string;
	branch_name: string;
	cycle_code: string;
	cycle_degree_code: string;
	cycle_title: string;
	degree_code: string;
	degree_name: string;
	enrollment_code: string;
	enrollment_number: string;
	group_code: GroupCode;
	modality: string;
	roll_code: string;
	student_code: string;
	student_dni: string | null;
	student_full_name: string;
	student_number: string;
	student_phone: string | null;
	student_photo_url: string | null;
	turn: EnrollmentTurn;
}

export interface AttendanceDailyRow {
	attendance_code: string | null;
	attendance_created_at: DateValue | null;
	attendance_date: DateValue | null;
	attendance_entry_time: string | null;
	attendance_observation: string | null;
	attendance_state: AttendanceState | null;
	attendance_updated_at: DateValue | null;
	branch_code: string;
	branch_name: string;
	cycle_code: string;
	cycle_degree_code: string;
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
	student_phone: string | null;
	student_photo_url: string | null;
	turn: EnrollmentTurn;
}

export interface AttendanceScanResult {
	status: 'created' | 'already_registered';
	message: string;
	attendance: {
		attendance_code: string;
		attendance_date: string;
		attendance_entry_time: string | null;
		attendance_state: AttendanceState;
	};
	student: {
		code: string;
		full_name: string;
		student_number: string;
		dni: string | null;
		photo_url: string | null;
	};
	enrollment: {
		code: string;
		enrollment_number: string;
		cycle_title: string;
		degree_name: string;
		group_code: GroupCode;
		turn: EnrollmentTurn;
	};
}
