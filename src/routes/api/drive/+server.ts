import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isUuid } from '$lib/utils/validation';
import { DriveRepository } from '$lib/server/repositories/drive.repository';
import { isValidTagHash, normalizeDriveName, validateDriveName } from '$lib/utils/drive';

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

interface CreateDirectoryBody {
	name?: string;
	scope?: string;
	parent_code?: string | null;
}

/**
 * GET /api/drive — List files
 * Query params: scope, parent (UUID|null), trashed, search, tag, view
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('drive:read'))) {
		throw error(403, 'No tienes permisos para ver el Drive');
	}

	const scope = url.searchParams.get('scope');
	const parentCode = url.searchParams.get('parent');
	const trashed = url.searchParams.get('trashed') === 'true';
	const foldersOnly = url.searchParams.get('folders') === 'true';
	const excludeCode = url.searchParams.get('exclude')?.trim() || '';
	const search = url.searchParams.get('search')?.trim();
	const tag = url.searchParams.get('tag')?.trim();
	const view = url.searchParams.get('view');

	const scopeContext = await DriveRepository.resolveScopeContext(locals.user, { scope });

	let query = DriveRepository.applyScopeFilter(
		locals.db.selectFrom('drive_files').select(DRIVE_COLUMNS),
		scopeContext
	);

	if (foldersOnly) {
		if (excludeCode && !isUuid(excludeCode)) {
			throw error(400, 'Código de archivo excluido inválido');
		}

		let foldersQuery = query.where('type', '=', 'dir').where('deleted_at', 'is', null);
		if (excludeCode) {
			foldersQuery = foldersQuery.where('code', '!=', excludeCode);
		}

		const files = await foldersQuery.orderBy('name', 'asc').execute();
		return json({ files });
	}

	if (view === 'recent') {
		query = query
			.where('deleted_at', 'is', null)
			.where('type', '!=', 'dir')
			.orderBy('updated_at', 'desc')
			.limit(50);
	} else if (view === 'heavy') {
		query = query
			.where('deleted_at', 'is', null)
			.where('type', '!=', 'dir')
			.orderBy('size', 'desc')
			.limit(50);
	} else if (trashed) {
		query = query.where('deleted_at', 'is not', null).orderBy('deleted_at', 'desc');
	} else if (search) {
		query = query
			.where('deleted_at', 'is', null)
			.where('name', 'ilike', `%${search}%`)
			.orderBy('type', 'asc')
			.orderBy('name', 'asc')
			.limit(100);
	} else if (tag) {
		if (!isValidTagHash(tag)) {
			throw error(400, 'Etiqueta inválida');
		}

		query = query
			.where('deleted_at', 'is', null)
			.where('tag', '=', tag.toLowerCase())
			.orderBy('type', 'asc')
			.orderBy('name', 'asc');
	} else {
		if (parentCode && parentCode !== 'null') {
			if (!isUuid(parentCode)) {
				throw error(400, 'Código de carpeta inválido');
			}

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

			query = query.where('parent_code', '=', parentCode);
		} else {
			query = query.where('parent_code', 'is', null);
		}

		query = query.where('deleted_at', 'is', null).orderBy('type', 'asc').orderBy('name', 'asc');
	}

	const files = await query.execute();
	return json({ files });
};

/**
 * POST /api/drive — Create directory
 * Body: { name, scope, parent_code? }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!(await locals.can('drive:create'))) {
		throw error(403, 'No tienes permisos para crear en el Drive');
	}

	if (!locals.user) {
		throw error(401, 'No autorizado');
	}

	const body = (await request.json()) as CreateDirectoryBody;
	const normalizedName = normalizeDriveName(body.name ?? '');
	const nameError = validateDriveName(normalizedName);

	if (nameError) {
		throw error(400, nameError);
	}

	const scopeContext = await DriveRepository.resolveScopeContext(locals.user, {
		scope: body.scope
	});

	const parentCode = body.parent_code && body.parent_code !== 'null' ? body.parent_code : null;

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

	try {
		const directory = await locals.db
			.insertInto('drive_files')
			.values({
				name: normalizedName,
				type: 'dir',
				scope: scopeContext.scope,
				user_code: locals.user.code,
				parent_code: parentCode,
				size: 0
			})
			.returning(DRIVE_COLUMNS)
			.executeTakeFirstOrThrow();

		return json({ file: directory }, { status: 201 });
	} catch (caught) {
		const dbError = caught as { code?: string };
		if (dbError.code === '23505') {
			throw error(409, 'Ya existe una carpeta o archivo con ese nombre en esta ubicación');
		}
		throw error(500, 'No se pudo crear la carpeta');
	}
};
