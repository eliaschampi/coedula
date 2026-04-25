import { readFormField } from '$lib/utils/formData';
import { STUDENT_PHOTO_FILE_FIELD } from '$lib/utils/studentPhoto';

const DNI_REGEX = /^\d{8}$/;
const STUDENT_PHOTO_URL_REGEX = /^\/api\/students\/photos\/[0-9a-f-]+(?:\?.*)?$/i;

export interface StudentFormPayload {
	firstName: string;
	lastName: string;
	phone: string;
	address: string;
	dni: string;
	birthDate: string;
	observation: string;
	photoUrl: string;
}

function isValidDateInput(value: string): boolean {
	if (!value) return false;
	const date = new Date(`${value}T00:00:00`);
	return !Number.isNaN(date.getTime());
}

function isValidStudentPhotoUrl(value: string): boolean {
	if (!value) {
		return true;
	}

	return STUDENT_PHOTO_URL_REGEX.test(value);
}

export function readStudentFormPayload(formData: FormData): StudentFormPayload {
	return {
		firstName: readFormField(formData, 'first_name'),
		lastName: readFormField(formData, 'last_name'),
		phone: readFormField(formData, 'phone'),
		address: readFormField(formData, 'address'),
		dni: readFormField(formData, 'dni'),
		birthDate: readFormField(formData, 'birth_date'),
		observation: readFormField(formData, 'observation'),
		photoUrl: readFormField(formData, 'photo_url')
	};
}

export function validateStudentFormPayload(payload: StudentFormPayload): string | null {
	if (!payload.firstName || !payload.lastName) {
		return 'Nombre y apellidos son obligatorios';
	}

	if (payload.dni && !DNI_REGEX.test(payload.dni)) {
		return 'El DNI debe tener exactamente 8 dígitos';
	}

	if (payload.birthDate && !isValidDateInput(payload.birthDate)) {
		return 'La fecha de nacimiento no es válida';
	}

	if (!isValidStudentPhotoUrl(payload.photoUrl)) {
		return 'La foto del alumno no es válida';
	}

	return null;
}

export function readStudentPhotoFile(formData: FormData): File | null {
	const photoFile = formData.get(STUDENT_PHOTO_FILE_FIELD);

	if (!(photoFile instanceof File) || photoFile.size === 0) {
		return null;
	}

	return photoFile;
}
