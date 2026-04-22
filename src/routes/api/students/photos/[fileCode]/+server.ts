import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isUuid } from '$lib/utils/validation';
import {
	ensureVariantBuffer,
	getDriveAbsolutePath,
	getVariantMimeType
} from '$lib/server/services/drive-image.service';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	if (!(await locals.can('students:read'))) {
		throw error(403, 'No tienes permisos para ver fotos de alumnos');
	}

	const { fileCode } = params;
	if (!fileCode || !isUuid(fileCode)) {
		throw error(400, 'Código de foto inválido');
	}

	const file = await locals.db
		.selectFrom('drive_files')
		.select(['code', 'storage_path', 'mime_type', 'name', 'type'])
		.where('code', '=', fileCode)
		.executeTakeFirst();

	if (!file || !file.storage_path || file.type !== 'img') {
		throw error(404, 'Foto no encontrada');
	}

	const mimeType = file.mime_type || 'application/octet-stream';

	const variant = url.searchParams.get('variant') === 'thumb' ? 'thumb' : 'preview';

	try {
		const variantBuffer = await ensureVariantBuffer(file.storage_path, mimeType, variant);
		if (variantBuffer) {
			const body = Uint8Array.from(variantBuffer);
			return new Response(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength), {
				headers: {
					'Content-Type': getVariantMimeType(),
					'Content-Length': variantBuffer.length.toString(),
					'Cache-Control': 'private, max-age=604800, stale-while-revalidate=86400'
				}
			});
		}

		const absolutePath = getDriveAbsolutePath(file.storage_path);
		const metadata = await stat(absolutePath);
		if (!metadata.isFile()) {
			throw new Error('File not found');
		}

		return new Response(
			Readable.toWeb(createReadStream(absolutePath)) as ReadableStream<Uint8Array>,
			{
				headers: {
					'Content-Type': mimeType,
					'Content-Length': metadata.size.toString(),
					'Cache-Control': 'private, max-age=3600',
					'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"`
				}
			}
		);
	} catch {
		throw error(404, 'Foto no encontrada en el almacenamiento');
	}
};
