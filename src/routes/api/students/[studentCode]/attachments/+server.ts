import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isUuid } from '$lib/utils/validation';
import { DriveRepository } from '$lib/server/repositories/drive.repository';
import { StudentDriveRepository } from '$lib/server/repositories/student-drive.repository';

interface StudentAttachmentBody {
	file_code?: string;
}

async function assertStudentExists(db: App.Locals['db'], studentCode: string): Promise<void> {
	const exists = await StudentDriveRepository.studentExists(db, studentCode);
	if (!exists) {
		throw error(404, 'Alumno no encontrado');
	}
}

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!(await locals.can('students:read')) || !(await locals.can('drive:read'))) {
		throw error(403, 'No tienes permisos para consultar archivos adjuntos del alumno');
	}

	const studentCode = (params.studentCode || '').trim();
	if (!isUuid(studentCode)) {
		throw error(400, 'Alumno inválido');
	}

	await assertStudentExists(locals.db, studentCode);
	const links = await StudentDriveRepository.listLinks(locals.db, studentCode);

	return json({ links });
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!(await locals.can('students:update')) || !(await locals.can('drive:update'))) {
		throw error(403, 'No tienes permisos para adjuntar archivos a este alumno');
	}

	if (!locals.user?.code) {
		throw error(401, 'No autorizado');
	}

	const studentCode = (params.studentCode || '').trim();
	if (!isUuid(studentCode)) {
		throw error(400, 'Alumno inválido');
	}

	const body = (await request.json()) as StudentAttachmentBody;
	const fileCode = (body.file_code || '').trim();

	if (!isUuid(fileCode)) {
		throw error(400, 'Archivo inválido');
	}

	await assertStudentExists(locals.db, studentCode);

	const file = await locals.db
		.selectFrom('drive_files')
		.select(['code', 'scope', 'user_code', 'deleted_at'])
		.where('code', '=', fileCode)
		.executeTakeFirst();

	if (!file) {
		throw error(404, 'Archivo no encontrado');
	}

	if (file.deleted_at !== null) {
		throw error(400, 'No se puede adjuntar un archivo eliminado');
	}

	if (file.scope !== 'shared') {
		throw error(400, 'Solo se pueden adjuntar archivos del Drive compartido');
	}

	await DriveRepository.assertFileRecordAccess(locals.user, file);
	await StudentDriveRepository.attachFile(locals.db, {
		studentCode,
		fileCode,
		userCode: locals.user.code
	});

	return json({ success: true }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	if (!(await locals.can('students:update')) || !(await locals.can('drive:update'))) {
		throw error(403, 'No tienes permisos para quitar archivos adjuntos de este alumno');
	}

	const studentCode = (params.studentCode || '').trim();
	if (!isUuid(studentCode)) {
		throw error(400, 'Alumno inválido');
	}

	const body = (await request.json()) as StudentAttachmentBody;
	const fileCode = (body.file_code || '').trim();

	if (!isUuid(fileCode)) {
		throw error(400, 'Archivo inválido');
	}

	await assertStudentExists(locals.db, studentCode);

	const deleted = await StudentDriveRepository.unlinkFile(locals.db, {
		studentCode,
		fileCode
	});

	if (!deleted) {
		throw error(404, 'Adjunto no encontrado');
	}

	return json({ success: true });
};
