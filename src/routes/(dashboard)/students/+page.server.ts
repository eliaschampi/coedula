import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { readFormField } from '$lib/utils/formData';
import { isUuid } from '$lib/utils/validation';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import {
	readStudentFormPayload,
	readStudentPhotoFile,
	validateStudentFormPayload
} from '$lib/server/services/student-form.service';
import {
	deleteStudentPhotoByCode,
	deleteStudentPhotoByUrl,
	saveStudentPhotoFile,
	type SavedStudentPhoto
} from '$lib/server/services/student-photo.service';

export const load: PageServerLoad = async ({ locals, depends, url }) => {
	depends('students:load');

	const searchQuery = (url.searchParams.get('search') ?? '').trim();

	if (!(await locals.can('students:read'))) {
		return {
			title: 'Alumnos',
			searchQuery,
			students: [],
			summary: {
				activeStudents: 0,
				studentsWithEnrollments: 0,
				totalEnrollments: 0
			}
		};
	}

	const [summary, students] = await Promise.all([
		EducationRepository.getStudentDirectorySummary(locals.db),
		EducationRepository.searchStudents(locals.db, searchQuery)
	]);

	return {
		title: 'Alumnos',
		searchQuery,
		summary,
		students
	};
};

export const actions: Actions = {
	update: async ({ locals, request }) => {
		if (!(await locals.can('students:update'))) {
			return fail(403, { error: 'No tienes permisos para actualizar alumnos' });
		}

		let uploadedPhoto: SavedStudentPhoto | null = null;

		try {
			const formData = await request.formData();
			const studentCode = readFormField(formData, 'code');
			const payload = readStudentFormPayload(formData);
			const photoFile = readStudentPhotoFile(formData);

			if (!studentCode || !isUuid(studentCode)) {
				return fail(400, { error: 'El alumno seleccionado no es válido' });
			}

			const validationError = validateStudentFormPayload(payload);
			if (validationError) {
				return fail(400, { error: validationError });
			}

			const existingStudent = await locals.db
				.selectFrom('students')
				.select(['code', 'photo_url'])
				.where('code', '=', studentCode)
				.executeTakeFirst();

			if (!existingStudent) {
				return fail(404, { error: 'El alumno no fue encontrado' });
			}

			if (photoFile) {
				if (!locals.user?.code) {
					return fail(401, { error: 'No autorizado para guardar la foto del alumno' });
				}

				uploadedPhoto = await saveStudentPhotoFile({
					db: locals.db,
					userCode: locals.user.code,
					file: photoFile
				});
				payload.photoUrl = uploadedPhoto.photoUrl;
			}

			const normalizedInput = EducationRepository.normalizeStudentInput({
				studentCode,
				firstName: payload.firstName,
				lastName: payload.lastName,
				phone: payload.phone,
				address: payload.address,
				dni: payload.dni,
				birthDate: payload.birthDate,
				observation: payload.observation,
				photoUrl: payload.photoUrl,
				isActive: payload.isActive
			});
			const updated = await EducationRepository.updateStudent(locals.db, normalizedInput);

			if (!updated) {
				if (uploadedPhoto) {
					await deleteStudentPhotoByCode(locals.db, uploadedPhoto.driveFileCode);
				}

				return fail(404, { error: 'El alumno no fue encontrado' });
			}

			if (existingStudent.photo_url && existingStudent.photo_url !== normalizedInput.photoUrl) {
				await deleteStudentPhotoByUrl(locals.db, existingStudent.photo_url);
			}

			return { success: true, type: 'success' };
		} catch (error) {
			if (uploadedPhoto) {
				await deleteStudentPhotoByCode(locals.db, uploadedPhoto.driveFileCode);
			}

			const dbError = error as { code?: string };
			if (dbError.code === '23505') {
				return fail(400, { error: 'El DNI o el código del alumno ya existe en el sistema' });
			}

			const message = error instanceof Error ? error.message : 'No se pudo actualizar el alumno';
			return fail(400, { error: message });
		}
	},

	delete: async ({ locals, request }) => {
		if (!(await locals.can('students:delete'))) {
			return fail(403, { error: 'No tienes permisos para eliminar alumnos' });
		}

		const formData = await request.formData();
		const studentCode = readFormField(formData, 'code');

		if (!studentCode || !isUuid(studentCode)) {
			return fail(400, { error: 'El alumno seleccionado no es válido' });
		}

		try {
			const deleted = await EducationRepository.deleteStudent(locals.db, studentCode);

			if (!deleted) {
				return fail(404, { error: 'El alumno no fue encontrado' });
			}

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'No se pudo eliminar el alumno';
			return fail(400, { error: message });
		}
	}
};
