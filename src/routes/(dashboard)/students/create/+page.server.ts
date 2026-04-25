import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { hashPassword } from '$lib/auth/password';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import {
	readStudentFormPayload,
	readStudentPhotoFile,
	validateStudentFormPayload
} from '$lib/server/services/student-form.service';
import {
	deleteStudentPhotoByCode,
	saveStudentPhotoFile,
	type SavedStudentPhoto
} from '$lib/server/services/student-photo.service';

export const load: PageServerLoad = async () => {
	return {
		title: 'Registrar alumno'
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!(await locals.can('students:create'))) {
			return fail(403, { error: 'No tienes permisos para crear alumnos' });
		}

		let uploadedPhoto: SavedStudentPhoto | null = null;

		try {
			const formData = await request.formData();
			const payload = readStudentFormPayload(formData);
			const photoFile = readStudentPhotoFile(formData);

			const validationError = validateStudentFormPayload(payload);
			if (validationError) {
				return fail(400, { error: validationError });
			}

			if (photoFile) {
				if (!locals.user?.code) {
					return fail(401, { error: 'No autorizado para guardar la foto del alumno' });
				}

				uploadedPhoto = await saveStudentPhotoFile({
					db: locals.db,
					userCode: locals.user.code,
					file: photoFile,
					studentName: `${payload.firstName} ${payload.lastName}`,
					studentDni: payload.dni
				});
				payload.photoUrl = uploadedPhoto.photoUrl;
			}

			const generatedPassword = EducationRepository.generateStudentAccessPassword();
			const createdStudent = await EducationRepository.createStudent(
				locals.db,
				EducationRepository.normalizeStudentInput({
					firstName: payload.firstName,
					lastName: payload.lastName,
					phone: payload.phone,
					address: payload.address,
					dni: payload.dni,
					birthDate: payload.birthDate,
					observation: payload.observation,
					photoUrl: payload.photoUrl,
					passwordHash: await hashPassword(generatedPassword)
				})
			);

			return {
				success: true,
				type: 'success',
				generatedPassword,
				studentNumber: createdStudent.student_number
			};
		} catch (error) {
			if (uploadedPhoto) {
				await deleteStudentPhotoByCode(locals.db, uploadedPhoto.driveFileCode);
			}

			const dbError = error as { code?: string };
			if (dbError.code === '23505') {
				return fail(400, { error: 'El DNI o el código del alumno ya existe en el sistema' });
			}

			const message = error instanceof Error ? error.message : 'No se pudo crear el alumno';
			return fail(400, { error: message });
		}
	}
};
