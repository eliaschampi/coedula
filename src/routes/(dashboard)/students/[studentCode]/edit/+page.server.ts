import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isUuid } from '$lib/utils/validation';
import { readFormField } from '$lib/utils/formData';
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

export const load: PageServerLoad = async ({ params, locals, depends }) => {
	depends('students:edit');

	if (!(await locals.can('students:update'))) {
		throw error(403, 'No tienes permisos para editar alumnos');
	}

	const { studentCode } = params;
	if (!studentCode || !isUuid(studentCode)) {
		throw error(400, 'Alumno inválido');
	}

	const student = await EducationRepository.findStudentByCode(locals.db, studentCode);

	if (!student) {
		throw error(404, 'Alumno no encontrado');
	}

	return {
		title: 'Editar alumno',
		student
	};
};

export const actions: Actions = {
	update: async ({ locals, params, request }) => {
		if (!(await locals.can('students:update'))) {
			return fail(403, { error: 'No tienes permisos para actualizar alumnos' });
		}

		const routeStudentCode = (params.studentCode || '').trim();
		if (!routeStudentCode || !isUuid(routeStudentCode)) {
			return fail(400, { error: 'El alumno seleccionado no es válido' });
		}

		let uploadedPhoto: SavedStudentPhoto | null = null;

		try {
			const formData = await request.formData();
			const studentCode = readFormField(formData, 'code');
			const payload = readStudentFormPayload(formData);
			const photoFile = readStudentPhotoFile(formData);

			if (!studentCode || !isUuid(studentCode) || studentCode !== routeStudentCode) {
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
					file: photoFile,
					studentName: `${payload.firstName} ${payload.lastName}`,
					studentDni: payload.dni
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
				photoUrl: payload.photoUrl
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
		} catch (caught) {
			if (uploadedPhoto) {
				await deleteStudentPhotoByCode(locals.db, uploadedPhoto.driveFileCode);
			}

			const dbError = caught as { code?: string };
			if (dbError.code === '23505') {
				return fail(400, { error: 'El DNI o el código del alumno ya existe en el sistema' });
			}

			const message = caught instanceof Error ? caught.message : 'No se pudo actualizar el alumno';
			return fail(400, { error: message });
		}
	}
};
