import { promises as fs } from 'fs';
import { dirname, extname, join, resolve, sep } from 'path';
import sharp from 'sharp';
import { DRIVE_IMAGE_COMPRESSION_THRESHOLD_BYTES, type DriveImageVariant } from '$lib/utils/drive';

type ServeVariant = Exclude<DriveImageVariant, 'original'>;

interface OptimizeUploadInput {
	buffer: Buffer;
	mimeType: string;
}

interface OptimizeUploadResult {
	buffer: Buffer;
	mimeType: string;
	optimized: boolean;
}

const PRIVATE_STORAGE_ROOT = process.env.DRIVE_STORAGE_ROOT?.trim()
	? resolve(process.env.DRIVE_STORAGE_ROOT.trim())
	: join(process.cwd(), '.data', 'drive');
const VARIANT_MIME_TYPE = 'image/webp';
const OPTIMIZABLE_UPLOAD_MIME_TYPES: ReadonlySet<string> = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/avif'
]);
const VARIANT_SUPPORTED_MIME_TYPES: ReadonlySet<string> = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/avif'
]);
const MAX_UPLOAD_DIMENSION = 2560;
const PREVIEW_VARIANT_DIMENSION = 1600;
const THUMB_VARIANT_DIMENSION = 480;
const PREVIEW_VARIANT_QUALITY = 84;
const THUMB_VARIANT_QUALITY = 72;
const MIN_REDUCTION_RATIO = 0.94;

function createPipeline(buffer: Buffer): sharp.Sharp {
	return sharp(buffer, { failOn: 'none', sequentialRead: true }).rotate();
}

function canOptimizeUploadImage(mimeType: string, size: number): boolean {
	return (
		OPTIMIZABLE_UPLOAD_MIME_TYPES.has(mimeType) && size > DRIVE_IMAGE_COMPRESSION_THRESHOLD_BYTES
	);
}

function supportsVariants(mimeType: string): boolean {
	return VARIANT_SUPPORTED_MIME_TYPES.has(mimeType);
}

function normalizeStoragePath(storagePath: string): string {
	const normalized = storagePath.replace(/\\/g, '/').replace(/^\/+/, '').trim();
	if (!normalized) {
		throw new Error('Storage path is required');
	}

	const segments = normalized.split('/');
	if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
		throw new Error('Invalid storage path');
	}

	return normalized;
}

function resolvePathInsideRoot(rootPath: string, storagePath: string): string {
	const absoluteRoot = resolve(rootPath);
	const absoluteTarget = resolve(absoluteRoot, storagePath);
	if (absoluteTarget !== absoluteRoot && !absoluteTarget.startsWith(`${absoluteRoot}${sep}`)) {
		throw new Error('Storage path escapes root');
	}
	return absoluteTarget;
}

function getPrivateAbsolutePath(storagePath: string): string {
	return resolvePathInsideRoot(PRIVATE_STORAGE_ROOT, storagePath);
}

function shouldResize(metadata: sharp.Metadata, maxDimension: number): boolean {
	return (
		typeof metadata.width === 'number' &&
		typeof metadata.height === 'number' &&
		(metadata.width > maxDimension || metadata.height > maxDimension)
	);
}

async function encodeUploadImage(
	buffer: Buffer,
	mimeType: string
): Promise<{ buffer: Buffer; resized: boolean }> {
	const probe = createPipeline(buffer);
	const metadata = await probe.metadata();
	const resized = shouldResize(metadata, MAX_UPLOAD_DIMENSION);

	let pipeline = createPipeline(buffer);
	if (resized) {
		pipeline = pipeline.resize({
			width: MAX_UPLOAD_DIMENSION,
			height: MAX_UPLOAD_DIMENSION,
			fit: 'inside',
			withoutEnlargement: true
		});
	}

	switch (mimeType) {
		case 'image/jpeg':
			return {
				buffer: await pipeline
					.jpeg({
						quality: 84,
						mozjpeg: true,
						progressive: true,
						chromaSubsampling: '4:4:4'
					})
					.toBuffer(),
				resized
			};
		case 'image/png':
			return {
				buffer: await pipeline
					.png({
						compressionLevel: 9,
						effort: 8
					})
					.toBuffer(),
				resized
			};
		case 'image/webp':
			return {
				buffer: await pipeline
					.webp({
						quality: 84,
						effort: 5
					})
					.toBuffer(),
				resized
			};
		case 'image/avif':
			return {
				buffer: await pipeline
					.avif({
						quality: 52,
						effort: 5
					})
					.toBuffer(),
				resized
			};
		default:
			return { buffer, resized: false };
	}
}

async function buildVariantBuffer(sourceBuffer: Buffer, variant: ServeVariant): Promise<Buffer> {
	const pipeline = createPipeline(sourceBuffer);

	if (variant === 'preview') {
		return pipeline
			.resize({
				width: PREVIEW_VARIANT_DIMENSION,
				height: PREVIEW_VARIANT_DIMENSION,
				fit: 'inside',
				withoutEnlargement: true
			})
			.webp({
				quality: PREVIEW_VARIANT_QUALITY,
				effort: 4
			})
			.toBuffer();
	}

	return pipeline
		.resize({
			width: THUMB_VARIANT_DIMENSION,
			height: THUMB_VARIANT_DIMENSION,
			fit: 'inside',
			withoutEnlargement: true
		})
		.webp({
			quality: THUMB_VARIANT_QUALITY,
			effort: 4
		})
		.toBuffer();
}

export function isVariantSupportedMimeType(mimeType: string | null | undefined): boolean {
	return typeof mimeType === 'string' && supportsVariants(mimeType);
}

export function getDriveAbsolutePath(storagePath: string): string {
	return getPrivateAbsolutePath(normalizeStoragePath(storagePath));
}

export function getDriveImageVariantStoragePath(
	storagePath: string,
	variant: ServeVariant
): string {
	const normalizedStoragePath = normalizeStoragePath(storagePath);
	const extension = extname(normalizedStoragePath);
	const basePath = extension
		? normalizedStoragePath.slice(0, -extension.length)
		: normalizedStoragePath;
	return `${basePath}.${variant}.webp`;
}

export function getDriveImageVariantAbsolutePath(
	storagePath: string,
	variant: ServeVariant
): string {
	return getDriveAbsolutePath(getDriveImageVariantStoragePath(storagePath, variant));
}

export async function readDriveFileBuffer(storagePath: string): Promise<Buffer> {
	const normalizedStoragePath = normalizeStoragePath(storagePath);
	try {
		return await fs.readFile(getPrivateAbsolutePath(normalizedStoragePath));
	} catch {
		throw new Error('File not found');
	}
}

export async function optimizeUploadImage(
	input: OptimizeUploadInput
): Promise<OptimizeUploadResult> {
	if (!canOptimizeUploadImage(input.mimeType, input.buffer.length)) {
		return {
			buffer: input.buffer,
			mimeType: input.mimeType,
			optimized: false
		};
	}

	try {
		const encoded = await encodeUploadImage(input.buffer, input.mimeType);
		const reduction = encoded.buffer.length / input.buffer.length;
		const keepOptimized = encoded.resized || reduction <= MIN_REDUCTION_RATIO;

		if (!keepOptimized) {
			return {
				buffer: input.buffer,
				mimeType: input.mimeType,
				optimized: false
			};
		}

		return {
			buffer: encoded.buffer,
			mimeType: input.mimeType,
			optimized: true
		};
	} catch {
		return {
			buffer: input.buffer,
			mimeType: input.mimeType,
			optimized: false
		};
	}
}

export async function writeImageVariants(
	sourceBuffer: Buffer,
	sourceStoragePath: string,
	mimeType: string
): Promise<void> {
	if (!supportsVariants(mimeType)) {
		return;
	}

	const thumbAbsolutePath = getDriveImageVariantAbsolutePath(sourceStoragePath, 'thumb');
	const previewAbsolutePath = getDriveImageVariantAbsolutePath(sourceStoragePath, 'preview');
	const [thumbBuffer, previewBuffer] = await Promise.all([
		buildVariantBuffer(sourceBuffer, 'thumb'),
		buildVariantBuffer(sourceBuffer, 'preview')
	]);

	await Promise.all([
		fs.mkdir(dirname(thumbAbsolutePath), { recursive: true }),
		fs.mkdir(dirname(previewAbsolutePath), { recursive: true })
	]);

	await Promise.all([
		fs.writeFile(thumbAbsolutePath, thumbBuffer),
		fs.writeFile(previewAbsolutePath, previewBuffer)
	]);
}

export async function ensureVariantBuffer(
	sourceStoragePath: string,
	mimeType: string,
	variant: ServeVariant
): Promise<Buffer | null> {
	if (!supportsVariants(mimeType)) {
		return null;
	}

	const normalizedSourceStoragePath = normalizeStoragePath(sourceStoragePath);
	const variantStoragePath = getDriveImageVariantStoragePath(normalizedSourceStoragePath, variant);
	const variantAbsolutePath = getDriveAbsolutePath(variantStoragePath);
	try {
		return await fs.readFile(variantAbsolutePath);
	} catch {
		// Generate lazily if the variant does not exist yet.
	}

	try {
		const sourceBuffer = await readDriveFileBuffer(normalizedSourceStoragePath);
		const variantBuffer = await buildVariantBuffer(sourceBuffer, variant);
		await fs.mkdir(dirname(variantAbsolutePath), { recursive: true });
		await fs.writeFile(variantAbsolutePath, variantBuffer);
		return variantBuffer;
	} catch {
		return null;
	}
}

export function getVariantMimeType(): string {
	return VARIANT_MIME_TYPE;
}

export async function removeDriveFileWithVariants(storagePath: string): Promise<void> {
	const normalizedStoragePath = normalizeStoragePath(storagePath);
	const variantThumbStoragePath = getDriveImageVariantStoragePath(normalizedStoragePath, 'thumb');
	const variantPreviewStoragePath = getDriveImageVariantStoragePath(
		normalizedStoragePath,
		'preview'
	);
	const targets = [
		getDriveAbsolutePath(normalizedStoragePath),
		getDriveAbsolutePath(variantThumbStoragePath),
		getDriveAbsolutePath(variantPreviewStoragePath)
	];

	await Promise.all(
		targets.map(async (targetPath) => {
			try {
				await fs.unlink(targetPath);
			} catch (caught) {
				const ioError = caught as NodeJS.ErrnoException;
				if (ioError.code === 'ENOENT') {
					return;
				}

				throw caught;
			}
		})
	);
}
