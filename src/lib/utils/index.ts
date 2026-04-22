export { formatDate, formatDateWithYear } from './formatDate';
export {
	CYCLE_MODALITY_OPTIONS,
	ENROLLMENT_STATUS_OPTIONS,
	ENROLLMENT_TURN_OPTIONS,
	GROUP_CODE_OPTIONS,
	formatAcademicDegreeLabel,
	formatDateInputValue,
	formatEducationCurrency,
	formatEducationDate,
	formatEducationDateRange,
	getEducationDateProgress,
	formatEnrollmentStatus,
	formatEnrollmentTurn,
	getEnrollmentTurnColor,
	formatGroupCode
} from './education';
export {
	ATTENDANCE_STATE_OPTIONS,
	formatAttendanceState,
	formatAttendanceTime,
	formatLocalDateValue,
	getAttendanceStateColor,
	isTimedAttendanceState,
	normalizeAttendanceTurnFilter,
	summarizeAttendance
} from './attendance';
export {
	buildStudentPhotoUrl,
	STUDENT_PHOTO_FILE_FIELD,
	syncStudentPhotoFormData
} from './studentPhoto';
export {
	createEmptyStudentFormState,
	createStudentFormState,
	createStudentFormStateFromSource
} from './studentForm';
export type { StudentFormSource, StudentFormState } from './studentForm';
export { readFormCheckbox, readFormField, readFormFieldList } from './formData';
export { getInitials } from './initialName';
export { isUuid, areUuids } from './validation';
