export interface StudentFormState {
	firstName: string;
	lastName: string;
	phone: string;
	address: string;
	dni: string;
	birthDate: string;
	observation: string;
	photoUrl: string;
	pendingPhotoFile: File | null;
}

export interface StudentFormSource {
	first_name: string;
	last_name: string;
	phone: string | null;
	address: string | null;
	dni: string | null;
	birth_date: string | Date | null;
	observation: string | null;
	photo_url: string | null;
}

export function createEmptyStudentFormState(): StudentFormState {
	return {
		firstName: '',
		lastName: '',
		phone: '',
		address: '',
		dni: '',
		birthDate: '',
		observation: '',
		photoUrl: '',
		pendingPhotoFile: null
	};
}

export function createStudentFormState(
	overrides: Partial<StudentFormState> = {}
): StudentFormState {
	return {
		...createEmptyStudentFormState(),
		...overrides
	};
}

export function createStudentFormStateFromSource(student: StudentFormSource): StudentFormState {
	return createStudentFormState({
		firstName: student.first_name,
		lastName: student.last_name,
		phone: student.phone ?? '',
		address: student.address ?? '',
		dni: student.dni ?? '',
		birthDate: student.birth_date ? String(student.birth_date).slice(0, 10) : '',
		observation: student.observation ?? '',
		photoUrl: student.photo_url ?? ''
	});
}
