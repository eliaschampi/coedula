import { randomUUID } from 'crypto';
import { dirname } from 'path';
import { promises as fs } from 'fs';
import { sql } from 'kysely';
import type { Database } from '$lib/database';
import { isUuid } from '$lib/utils/validation';
import {
	detectFileType,
	getSafeDriveExtension,
	isAllowedMimeType,
	MAX_FILE_SIZE,
	normalizeDriveName,
	validateDriveName
} from '$lib/utils/drive';
import {
	getDriveAbsolutePath,
	optimizeUploadImage,
	removeDriveFileWithVariants,
	writeImageVariants
} from '$lib/server/services/drive-image.service';

const STUDENT_PHOTO_ROOT_FOLDER_NAME = 'Alumnos';
const STUDENT_PHOTO_FALLBACK_FOLDER_NAME = 'General';
const STUDENT_PHOTO_COLUMNS = ['code', 'storage_path', 'type'] as const;

export interface SavedStudentPhoto {
	driveFileCode: string;
	photoUrl: string;
	storagePath: string;
}

function buildStudentPhotoCycleFolderName(cycle: { code: string; title: string } | null): string {
	if (!cycle?.code || !cycle.title) {
		return STUDENT_PHOTO_FALLBACK_FOLDER_NAME;
	}

	return normalizeDriveName(`${cycle.title}-${cycle.code.slice(0, 8)}`);
}

async function resolveStudentPhotoCycleFolderName(db: Database): Promise<string> {
	const today = new Date();

	const currentCycle = await db
		.selectFrom('academic_cycles')
		.select(['code', 'title'])
		.where('is_active', '=', true)
		.where('start_date', '<=', today)
		.where('end_date', '>=', today)
		.orderBy('start_date', 'desc')
		.executeTakeFirst();

	if (currentCycle) {
		return buildStudentPhotoCycleFolderName(currentCycle);
	}

	const nextCycle = await db
		.selectFrom('academic_cycles')
		.select(['code', 'title'])
		.where('is_active', '=', true)
		.where('start_date', '>', today)
		.orderBy('start_date', 'asc')
		.executeTakeFirst();

	if (nextCycle) {
		return buildStudentPhotoCycleFolderName(nextCycle);
	}

	const latestActiveCycle = await db
		.selectFrom('academic_cycles')
		.select(['code', 'title'])
		.where('is_active', '=', true)
		.orderBy('start_date', 'desc')
		.executeTakeFirst();

	return buildStudentPhotoCycleFolderName(latestActiveCycle ?? null);
}

async function findDirectoryCode(
	db: Database,
	name: string,
	parentCode: string | null
): Promise<string | null> {
	let query = db
		.selectFrom('drive_files')
		.select('code')
		.where('scope', '=', 'shared')
		.where('type', '=', 'dir')
		.where('deleted_at', 'is', null)
		.where(sql<boolean>`LOWER(name) = LOWER(${name})`);

	query =
		parentCode === null
			? query.where('parent_code', 'is', null)
			: query.where('parent_code', '=', parentCode);

	const directory = await query.executeTakeFirst();

	return directory?.code ?? null;
}

async function ensureSharedDirectory(
	db: Database,
	userCode: string,
	name: string,
	parentCode: string | null
): Promise<string> {
	const existingCode = await findDirectoryCode(db, name, parentCode);
	if (existingCode) {
		return existingCode;
	}

	try {
		const createdDirectory = await db
			.insertInto('drive_files')
			.values({
				scope: 'shared',
				user_code: userCode,
				parent_code: parentCode,
				name,
				type: 'dir',
				size: 0
			})
			.returning('code')
			.executeTakeFirstOrThrow();

		return createdDirectory.code;
	} catch (caught) {
		const dbError = caught as { code?: string };
		if (dbError.code === '23505') {
			const retriedCode = await findDirectoryCode(db, name, parentCode);
			if (retriedCode) {
				return retriedCode;
			}
		}

		throw new Error('No se pudo preparar la carpeta de fotos del alumno', { cause: caught });
	}
}

function extractStudentPhotoCode(photoUrl: string | null | undefined): string | null {
	const match = photoUrl?.trim().match(/^\/api\/students\/photos\/([0-9a-f-]+)(?:\?.*)?$/i);
	const fileCode = match?.[1] ?? null;

	return fileCode && isUuid(fileCode) ? fileCode : null;
}

function buildStudentPhotoDriveName(input: { studentDni?: string; extension: string }): string {
	const safeDni = normalizeDriveName(input.studentDni?.trim() || 'sin-dni') || 'sin-dni';

	return `${safeDni}${input.extension}`;
}

export async function saveStudentPhotoFile(input: {
	db: Database;
	userCode: string;
	file: File;
	studentName?: string;
	studentDni?: string;
}): Promise<SavedStudentPhoto> {
	const { db, file, studentDni, userCode } = input;

	if (file.size === 0) {
		throw new Error('La imagen está vacía');
	}

	if (file.size > MAX_FILE_SIZE) {
		throw new Error('La imagen excede el tamaño máximo permitido');
	}

	const mimeType = file.type || 'application/octet-stream';
	if (!isAllowedMimeType(mimeType) || detectFileType(mimeType) !== 'img') {
		throw new Error('Solo se permiten imágenes válidas');
	}

	const rootFolderCode = await ensureSharedDirectory(
		db,
		userCode,
		STUDENT_PHOTO_ROOT_FOLDER_NAME,
		null
	);
	const cycleFolderName = await resolveStudentPhotoCycleFolderName(db);
	const cycleFolderCode = await ensureSharedDirectory(
		db,
		userCode,
		cycleFolderName,
		rootFolderCode
	);

	const originalBuffer = Buffer.from(await file.arrayBuffer());
	const optimizedUpload = await optimizeUploadImage({
		buffer: originalBuffer,
		mimeType
	});

	const fileId = randomUUID();
	const extension = getSafeDriveExtension(file.name);
	const storagePath = `blob/student-photos/${cycleFolderCode}/${fileId}${extension}`;
	const fullPath = getDriveAbsolutePath(storagePath);
	const finalName = buildStudentPhotoDriveName({
		studentDni,
		extension
	});
	const nameError = validateDriveName(finalName);

	if (nameError) {
		throw new Error(nameError);
	}

	await fs.mkdir(dirname(fullPath), { recursive: true });
	await fs.writeFile(fullPath, optimizedUpload.buffer);

	try {
		await writeImageVariants(optimizedUpload.buffer, storagePath, optimizedUpload.mimeType);
	} catch {
		// The original image remains usable even if a variant fails.
	}

	try {
		const driveFile = await db
			.insertInto('drive_files')
			.values({
				name: finalName,
				type: 'img',
				size: optimizedUpload.buffer.length,
				storage_path: storagePath,
				mime_type: optimizedUpload.mimeType,
				scope: 'shared',
				user_code: userCode,
				parent_code: cycleFolderCode
			})
			.returning(['code'])
			.executeTakeFirstOrThrow();

		return {
			driveFileCode: driveFile.code,
			photoUrl: `/api/students/photos/${driveFile.code}`,
			storagePath
		};
	} catch (caught) {
		try {
			await removeDriveFileWithVariants(storagePath);
		} catch {
			// Keep the DB error as the request failure.
		}

		const dbError = caught as { code?: string };
		if (dbError.code === '23505') {
			throw new Error('La foto ya existe en el almacenamiento', { cause: caught });
		}

		throw new Error('No se pudo registrar la foto del alumno', { cause: caught });
	}
}

export async function deleteStudentPhotoByCode(
	db: Database,
	fileCode: string | null | undefined
): Promise<void> {
	if (!fileCode || !isUuid(fileCode)) {
		return;
	}

	const file = await db
		.selectFrom('drive_files')
		.select(STUDENT_PHOTO_COLUMNS)
		.where('code', '=', fileCode)
		.executeTakeFirst();

	if (!file || file.type !== 'img') {
		return;
	}

	await db.deleteFrom('drive_files').where('code', '=', file.code).execute();

	if (!file.storage_path) {
		return;
	}

	try {
		await removeDriveFileWithVariants(file.storage_path);
	} catch {
		// Storage cleanup is best-effort after the DB reference is removed.
	}
}

export async function deleteStudentPhotoByUrl(
	db: Database,
	photoUrl: string | null | undefined
): Promise<void> {
	await deleteStudentPhotoByCode(db, extractStudentPhotoCode(photoUrl));
}
