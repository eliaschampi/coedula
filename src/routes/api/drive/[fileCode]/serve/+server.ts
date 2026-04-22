import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';
import { isUuid } from '$lib/utils/validation';
import { isValidDriveImageVariant, type DriveImageVariant } from '$lib/utils/drive';
import { DriveRepository } from '$lib/server/repositories/drive.repository';
import {
	ensureVariantBuffer,
	getDriveAbsolutePath,
	getVariantMimeType
} from '$lib/server/services/drive-image.service';

/**
 * GET /api/drive/[fileCode]/serve
 * Serves drive files for previews and downloads.
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	if (!(await locals.can('drive:read'))) {
		throw error(403, 'No tienes permisos para ver archivos');
	}

	const { fileCode } = params;
	if (!fileCode || !isUuid(fileCode)) {
		throw error(400, 'Código de archivo inválido');
	}

	const file = await locals.db
		.selectFrom('drive_files')
		.select(['code', 'scope', 'user_code', 'storage_path', 'mime_type', 'name', 'type'])
		.where('code', '=', fileCode)
		.executeTakeFirst();

	if (!file || !file.storage_path) {
		throw error(404, 'Archivo no encontrado');
	}

	await DriveRepository.assertFileRecordAccess(locals.user, file);

	if (file.type === 'dir') {
		throw error(400, 'No se puede servir un directorio');
	}

	const download = url.searchParams.get('download') === 'true';
	const requestedVariantRaw = (url.searchParams.get('variant') || '').trim().toLowerCase();
	const requestedVariant: DriveImageVariant | null = isValidDriveImageVariant(requestedVariantRaw)
		? requestedVariantRaw
		: null;
	const effectiveVariant: DriveImageVariant =
		!download && file.type === 'img' ? (requestedVariant ?? 'preview') : 'original';

	try {
		let responseBody: BodyInit;
		let contentLength = 0;
		let contentType = file.mime_type || 'application/octet-stream';
		let cacheControl = 'private, max-age=3600';

		if (file.type === 'img' && effectiveVariant !== 'original' && file.mime_type) {
			const variantBuffer = await ensureVariantBuffer(
				file.storage_path,
				file.mime_type,
				effectiveVariant
			);

			if (variantBuffer) {
				const variantBody = Uint8Array.from(variantBuffer);
				responseBody = variantBody.buffer.slice(
					variantBody.byteOffset,
					variantBody.byteOffset + variantBody.byteLength
				);
				contentLength = variantBuffer.length;
				contentType = getVariantMimeType();
				cacheControl = 'private, max-age=604800, stale-while-revalidate=86400';
			} else {
				const absolutePath = getDriveAbsolutePath(file.storage_path);
				const metadata = await stat(absolutePath);
				if (!metadata.isFile()) {
					throw new Error('File not found');
				}

				responseBody = Readable.toWeb(createReadStream(absolutePath)) as ReadableStream<Uint8Array>;
				contentLength = metadata.size;
			}
		} else {
			const absolutePath = getDriveAbsolutePath(file.storage_path);
			const metadata = await stat(absolutePath);
			if (!metadata.isFile()) {
				throw new Error('File not found');
			}

			responseBody = Readable.toWeb(createReadStream(absolutePath)) as ReadableStream<Uint8Array>;
			contentLength = metadata.size;
		}

		const safeName = encodeURIComponent(file.name);

		return new Response(responseBody, {
			headers: {
				'Content-Type': contentType,
				'Content-Length': contentLength.toString(),
				'Cache-Control': cacheControl,
				'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${safeName}"`
			}
		});
	} catch {
		throw error(404, 'Archivo no encontrado en el almacenamiento');
	}
};
