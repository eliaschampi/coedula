import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveStudentPhotoFile } from '$lib/server/services/student-photo.service';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!(await locals.can('students:create')) && !(await locals.can('students:update'))) {
		throw error(403, 'No tienes permisos para subir fotos de alumnos');
	}

	if (!locals.user) {
		throw error(401, 'No autorizado');
	}

	const formData = await request.formData();
	const file = formData.get('file');

	if (!(file instanceof File)) {
		throw error(400, 'No se recibió ninguna imagen');
	}

	try {
		const savedPhoto = await saveStudentPhotoFile({
			db: locals.db,
			userCode: locals.user.code,
			file
		});

		return json(
			{
				file: {
					code: savedPhoto.driveFileCode
				},
				photoUrl: savedPhoto.photoUrl
			},
			{ status: 201 }
		);
	} catch (caught) {
		const message =
			caught instanceof Error ? caught.message : 'No se pudo registrar la foto del alumno';
		throw error(message === 'La foto ya existe en el almacenamiento' ? 409 : 400, message);
	}
};
