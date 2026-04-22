export const STUDENT_PHOTO_FILE_FIELD = 'photo_file';

export function buildStudentPhotoUrl(
	photoUrl: string | null | undefined,
	variant: 'preview' | 'thumb' = 'preview'
): string {
	const normalizedPhotoUrl = photoUrl?.trim() ?? '';
	if (!normalizedPhotoUrl) {
		return '';
	}

	const separator = normalizedPhotoUrl.includes('?') ? '&' : '?';
	return `${normalizedPhotoUrl}${separator}variant=${variant}`;
}

export function syncStudentPhotoFormData(formData: FormData, pendingPhotoFile: File | null): void {
	if (pendingPhotoFile) {
		formData.set(STUDENT_PHOTO_FILE_FIELD, pendingPhotoFile, pendingPhotoFile.name);
		return;
	}

	formData.delete(STUDENT_PHOTO_FILE_FIELD);
}
