import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	detectFileType,
	getSafeDriveExtension,
	isAllowedMimeType,
	MAX_FILE_SIZE,
	normalizeDriveName,
	validateDriveName
} from '$lib/utils/drive';
import { isUuid } from '$lib/utils/validation';
import { DriveRepository } from '$lib/server/repositories/drive.repository';
import {
	getDriveAbsolutePath,
	optimizeUploadImage,
	removeDriveFileWithVariants,
	writeImageVariants
} from '$lib/server/services/drive-image.service';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { dirname } from 'path';

const DRIVE_COLUMNS = [
	'code',
	'scope',
	'name',
	'type',
	'size',
	'tag',
	'mime_type',
	'parent_code',
	'user_code',
	'deleted_at',
	'created_at',
	'updated_at'
] as const;

/**
 * POST /api/drive/upload — File upload
 * multipart/form-data:
 *  - file: File
 *  - scope: shared | user_private
 *  - parent_code?: UUID
 *  - name?: string
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!(await locals.can('drive:create'))) {
		throw error(403, 'No tienes permisos para subir archivos');
	}

	if (!locals.user) {
		throw error(401, 'No autorizado');
	}

	const formData = await request.formData();
	const file = formData.get('file') as File | null;
	const scope = (formData.get('scope') as string | null)?.trim() ?? '';
	const parentCodeRaw = (formData.get('parent_code') as string | null)?.trim() ?? '';
	const customNameRaw = (formData.get('name') as string | null)?.trim() ?? '';

	if (!file || !(file instanceof File)) {
		throw error(400, 'No se recibió ningún archivo');
	}

	if (file.size > MAX_FILE_SIZE) {
		throw error(400, `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024}MB`);
	}

	if (file.size === 0) {
		throw error(400, 'El archivo está vacío');
	}

	const scopeContext = await DriveRepository.resolveScopeContext(locals.user, { scope });

	const mimeType = file.type || 'application/octet-stream';
	if (!isAllowedMimeType(mimeType)) {
		throw error(400, 'Tipo de archivo no permitido');
	}

	const parentCode = parentCodeRaw && parentCodeRaw !== 'null' ? parentCodeRaw : null;
	if (parentCode && !isUuid(parentCode)) {
		throw error(400, 'Código de carpeta padre inválido');
	}

	if (parentCode) {
		const parent = await DriveRepository.applyScopeFilter(
			locals.db.selectFrom('drive_files').select(['code']),
			scopeContext
		)
			.where('code', '=', parentCode)
			.where('type', '=', 'dir')
			.where('deleted_at', 'is', null)
			.executeTakeFirst();

		if (!parent) {
			throw error(404, 'Carpeta padre no encontrada');
		}
	}

	const finalName = normalizeDriveName(customNameRaw || file.name);
	const nameError = validateDriveName(finalName);
	if (nameError) {
		throw error(400, nameError);
	}

	const fileType = detectFileType(mimeType);
	const ext = getSafeDriveExtension(file.name);
	const fileId = randomUUID();
	const storagePath = `blob/${fileId}${ext}`;
	const fullPath = getDriveAbsolutePath(storagePath);

	const originalBuffer = Buffer.from(await file.arrayBuffer());
	const optimizedUpload =
		fileType === 'img'
			? await optimizeUploadImage({
					buffer: originalBuffer,
					mimeType
				})
			: {
					buffer: originalBuffer,
					mimeType,
					optimized: false
				};

	await fs.mkdir(dirname(fullPath), { recursive: true });
	await fs.writeFile(fullPath, optimizedUpload.buffer);

	if (fileType === 'img') {
		try {
			await writeImageVariants(optimizedUpload.buffer, storagePath, optimizedUpload.mimeType);
		} catch {
			// Upload stays valid even if a derived variant cannot be generated.
		}
	}

	try {
		const driveFile = await locals.db
			.insertInto('drive_files')
			.values({
				name: finalName,
				type: fileType,
				size: optimizedUpload.buffer.length,
				storage_path: storagePath,
				mime_type: optimizedUpload.mimeType,
				scope: scopeContext.scope,
				user_code: locals.user.code,
				parent_code: parentCode
			})
			.returning(DRIVE_COLUMNS)
			.executeTakeFirstOrThrow();

		return json({ file: driveFile }, { status: 201 });
	} catch (caught) {
		try {
			await removeDriveFileWithVariants(storagePath);
		} catch {
			// If cleanup fails, request still fails with DB message.
		}

		const dbError = caught as { code?: string };
		if (dbError.code === '23505') {
			throw error(409, 'Ya existe un archivo con ese nombre en esta carpeta');
		}

		throw error(500, 'No se pudo registrar el archivo');
	}
};
