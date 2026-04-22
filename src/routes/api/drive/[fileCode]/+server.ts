import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from 'kysely';
import { isUuid } from '$lib/utils/validation';
import {
	isValidDriveScope,
	isValidTagHash,
	normalizeDriveName,
	validateDriveName
} from '$lib/utils/drive';
import { DriveRepository, type DriveScopeContext } from '$lib/server/repositories/drive.repository';
import { removeDriveFileWithVariants } from '$lib/server/services/drive-image.service';

interface UpdateFileBody {
	name?: string;
	parent_code?: string | null;
	tag?: string | null;
	scope?: string;
	deleted_at?: boolean; // true = trash, false = restore
}

/**
 * PATCH /api/drive/[fileCode]
 * Supports rename, move, tag update, and trash/restore.
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const { fileCode } = params;
	if (!fileCode || !isUuid(fileCode)) {
		throw error(400, 'Código de archivo inválido');
	}

	let body: UpdateFileBody;
	try {
		body = (await request.json()) as UpdateFileBody;
	} catch {
		throw error(400, 'Cuerpo de solicitud inválido');
	}

	const needsUpdatePermission =
		'name' in body || 'parent_code' in body || 'tag' in body || 'scope' in body;
	const needsDeletePermission = 'deleted_at' in body;

	if (needsUpdatePermission && !(await locals.can('drive:update'))) {
		throw error(403, 'No tienes permisos para editar archivos');
	}

	if (needsDeletePermission && !(await locals.can('drive:delete'))) {
		throw error(403, 'No tienes permisos para mover archivos a papelera');
	}

	if (!needsUpdatePermission && !needsDeletePermission) {
		throw error(400, 'No hay cambios para aplicar');
	}

	const file = await locals.db
		.selectFrom('drive_files')
		.select(['code', 'scope', 'user_code', 'parent_code', 'name', 'type', 'deleted_at'])
		.where('code', '=', fileCode)
		.executeTakeFirst();

	if (!file) {
		throw error(404, 'Archivo no encontrado');
	}

	await DriveRepository.assertFileRecordAccess(locals.user, file);
	const fileScope = DriveRepository.normalizeScope(file.scope);

	const fileScopeContext: DriveScopeContext = {
		scope: fileScope,
		ownerUserCode: fileScope === 'user_private' ? file.user_code : null
	};
	let targetScope = fileScope;
	let targetScopeContext = fileScopeContext;
	const updates: Record<string, unknown> = {};
	let nextDeletedAt: Date | null | undefined;

	if ('scope' in body) {
		if (typeof body.scope !== 'string') {
			throw error(400, 'Alcance de Drive inválido');
		}

		const requestedScope = body.scope.trim().toLowerCase();
		if (!isValidDriveScope(requestedScope)) {
			throw error(400, 'Alcance de Drive inválido');
		}

		targetScope = requestedScope;
		targetScopeContext = await DriveRepository.resolveScopeContext(locals.user, {
			scope: targetScope
		});
	}

	if ('name' in body && typeof body.name === 'string') {
		const normalizedName = normalizeDriveName(body.name);
		const nameError = validateDriveName(normalizedName);
		if (nameError) {
			throw error(400, nameError);
		}
		updates.name = normalizedName;
	}

	if ('parent_code' in body) {
		const parentCode = body.parent_code;

		if (parentCode === null) {
			updates.parent_code = null;
		} else {
			if (typeof parentCode !== 'string' || !isUuid(parentCode)) {
				throw error(400, 'Código de carpeta destino inválido');
			}

			if (parentCode === fileCode) {
				throw error(400, 'No se puede mover una carpeta dentro de sí misma');
			}

			const targetParent = await locals.db
				.selectFrom('drive_files')
				.select(['code', 'scope', 'user_code', 'type', 'deleted_at'])
				.where('code', '=', parentCode)
				.executeTakeFirst();

			if (!targetParent || !DriveRepository.isFileInContext(targetParent, targetScopeContext)) {
				throw error(404, 'Carpeta destino no encontrada');
			}

			if (targetParent.type !== 'dir') {
				throw error(400, 'El destino debe ser una carpeta');
			}

			if (targetParent.deleted_at !== null) {
				throw error(400, 'No se puede mover a una carpeta en papelera');
			}

			if (file.type === 'dir') {
				const isChild = await isDescendant(locals.db, fileCode, parentCode);
				if (isChild) {
					throw error(400, 'No se puede mover una carpeta dentro de su propio árbol');
				}
			}

			updates.parent_code = parentCode;
		}
	} else if (targetScope !== fileScope) {
		// When moving across scopes, default to root unless an explicit parent is provided.
		updates.parent_code = null;
	}

	if ('tag' in body) {
		if (body.tag === null || body.tag === '') {
			updates.tag = null;
		} else if (typeof body.tag === 'string' && isValidTagHash(body.tag)) {
			updates.tag = body.tag.toLowerCase();
		} else {
			throw error(400, 'Etiqueta inválida');
		}
	}

	if ('deleted_at' in body) {
		if (typeof body.deleted_at !== 'boolean') {
			throw error(400, 'Estado de papelera inválido');
		}

		const hasParentOverride = Object.prototype.hasOwnProperty.call(updates, 'parent_code');
		const parentForRestoreCheck = hasParentOverride
			? typeof updates.parent_code === 'string'
				? updates.parent_code
				: null
			: file.parent_code;

		if (
			body.deleted_at === false &&
			(await hasTrashedAncestor(locals.db, parentForRestoreCheck, targetScopeContext))
		) {
			throw error(400, 'No se puede restaurar mientras la carpeta padre esté en papelera');
		}

		// true → trash (set deleted_at = NOW()), false → restore (set deleted_at = NULL)
		nextDeletedAt = body.deleted_at ? new Date() : null;
	}

	if (Object.keys(updates).length === 0 && nextDeletedAt === undefined) {
		throw error(400, 'No hay cambios para aplicar');
	}

	try {
		await locals.db.transaction().execute(async (trx) => {
			if (targetScope !== fileScope) {
				if (file.type === 'dir') {
					const changedRows = await setDirectoryTreeScope(trx, {
						rootCode: fileCode,
						sourceScope: fileScope,
						sourceUserCode: file.user_code,
						targetScope,
						targetOwnerUserCode: targetScopeContext.ownerUserCode
					});

					if (changedRows === 0) {
						throw error(404, 'Archivo no encontrado');
					}
				} else {
					const nonDirScopeUpdates: Record<string, unknown> = { scope: targetScope };
					if (targetScope === 'user_private' && targetScopeContext.ownerUserCode) {
						nonDirScopeUpdates.user_code = targetScopeContext.ownerUserCode;
					}

					const result = await trx
						.updateTable('drive_files')
						.set(nonDirScopeUpdates)
						.where('code', '=', fileCode)
						.executeTakeFirst();

					if (Number(result.numUpdatedRows ?? 0) === 0) {
						throw error(404, 'Archivo no encontrado');
					}
				}
			}

			if (Object.keys(updates).length > 0) {
				const result = await trx
					.updateTable('drive_files')
					.set(updates)
					.where('code', '=', fileCode)
					.executeTakeFirst();

				if (Number(result.numUpdatedRows ?? 0) === 0) {
					throw error(404, 'Archivo no encontrado');
				}
			}

			if (nextDeletedAt === undefined) {
				return;
			}

			if (file.type === 'dir') {
				const updatedRows = await setDirectoryTreeTrashState(trx, fileCode, nextDeletedAt);
				if (updatedRows === 0) {
					throw error(404, 'Archivo no encontrado');
				}
				return;
			}

			const result = await trx
				.updateTable('drive_files')
				.set({ deleted_at: nextDeletedAt })
				.where('code', '=', fileCode)
				.executeTakeFirst();

			if (Number(result.numUpdatedRows ?? 0) === 0) {
				throw error(404, 'Archivo no encontrado');
			}
		});

		return json({ success: true });
	} catch (caught) {
		const dbError = caught as { code?: string };
		if (dbError.code === '23505') {
			throw error(409, 'Ya existe un archivo con ese nombre en la carpeta destino');
		}
		throw caught;
	}
};

/**
 * DELETE /api/drive/[fileCode]
 * Permanent delete. Only files in trash can be permanently deleted.
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!(await locals.can('drive:delete'))) {
		throw error(403, 'No tienes permisos para eliminar archivos');
	}

	const { fileCode } = params;
	if (!fileCode || !isUuid(fileCode)) {
		throw error(400, 'Código de archivo inválido');
	}

	const file = await locals.db
		.selectFrom('drive_files')
		.select(['code', 'scope', 'user_code', 'deleted_at'])
		.where('code', '=', fileCode)
		.executeTakeFirst();

	if (!file) {
		throw error(404, 'Archivo no encontrado');
	}

	await DriveRepository.assertFileRecordAccess(locals.user, file);

	if (file.deleted_at === null) {
		throw error(400, 'Solo se pueden eliminar permanentemente archivos en papelera');
	}

	const descendants = await sql<{ storage_path: string | null }>`
		WITH RECURSIVE drive_tree AS (
			SELECT code, storage_path
			FROM drive_files
			WHERE code = ${fileCode}
			UNION ALL
			SELECT f.code, f.storage_path
			FROM drive_files f
			INNER JOIN drive_tree dt ON f.parent_code = dt.code
		)
		SELECT storage_path FROM drive_tree
	`.execute(locals.db);

	await locals.db.deleteFrom('drive_files').where('code', '=', fileCode).execute();

	for (const row of descendants.rows) {
		if (!row.storage_path) {
			continue;
		}

		await removeDriveFileWithVariants(row.storage_path);
	}

	return json({ success: true, deletedFiles: descendants.rows.length });
};

async function isDescendant(
	db: App.Locals['db'],
	ancestorCode: string,
	targetCode: string
): Promise<boolean> {
	if (ancestorCode === targetCode) {
		return true;
	}

	let currentCode: string | null = targetCode;
	const visited = new Set<string>();

	while (currentCode) {
		if (visited.has(currentCode)) {
			break;
		}

		visited.add(currentCode);

		if (currentCode === ancestorCode) {
			return true;
		}

		const parent = await db
			.selectFrom('drive_files')
			.select(['parent_code'])
			.where('code', '=', currentCode)
			.executeTakeFirst();

		currentCode = parent?.parent_code ?? null;
	}

	return false;
}

async function hasTrashedAncestor(
	db: App.Locals['db'],
	startCode: string | null,
	context: DriveScopeContext
): Promise<boolean> {
	let currentCode: string | null = startCode;
	const visited = new Set<string>();

	while (currentCode) {
		if (visited.has(currentCode)) {
			break;
		}

		visited.add(currentCode);

		const ancestor = await db
			.selectFrom('drive_files')
			.select(['code', 'scope', 'user_code', 'parent_code', 'deleted_at'])
			.where('code', '=', currentCode)
			.executeTakeFirst();

		if (!ancestor || !DriveRepository.isFileInContext(ancestor, context)) {
			return false;
		}

		if (ancestor.deleted_at !== null) {
			return true;
		}

		currentCode = ancestor.parent_code;
	}

	return false;
}

async function setDirectoryTreeTrashState(
	db: App.Locals['db'],
	rootCode: string,
	deletedAt: Date | null
): Promise<number> {
	const updated = await sql<{ code: string }>`
		WITH RECURSIVE drive_tree AS (
			SELECT code, parent_code, scope, user_code
			FROM drive_files
			WHERE code = ${rootCode}
			UNION ALL
			SELECT f.code, f.parent_code, f.scope, f.user_code
			FROM drive_files f
			INNER JOIN drive_tree dt ON f.parent_code = dt.code
			WHERE
				f.scope = dt.scope
				AND (dt.scope <> 'user_private' OR f.user_code = dt.user_code)
		)
		UPDATE drive_files
		SET deleted_at = ${deletedAt}
		WHERE code IN (SELECT code FROM drive_tree)
		RETURNING code
	`.execute(db);

	return updated.rows.length;
}

interface SetDirectoryTreeScopeInput {
	rootCode: string;
	sourceScope: DriveScopeContext['scope'];
	sourceUserCode: string;
	targetScope: DriveScopeContext['scope'];
	targetOwnerUserCode: string | null;
}

async function setDirectoryTreeScope(
	db: App.Locals['db'],
	input: SetDirectoryTreeScopeInput
): Promise<number> {
	const targetScopeValue = input.targetScope;
	const targetOwnerUserCode = input.targetOwnerUserCode;

	const updated = await sql<{ code: string }>`
		WITH RECURSIVE drive_tree AS (
			SELECT code, parent_code, scope, user_code
			FROM drive_files
			WHERE code = ${input.rootCode}
			UNION ALL
			SELECT f.code, f.parent_code, f.scope, f.user_code
			FROM drive_files f
			INNER JOIN drive_tree dt ON f.parent_code = dt.code
			WHERE
				f.scope = dt.scope
				AND (dt.scope <> 'user_private' OR f.user_code = dt.user_code)
		)
		UPDATE drive_files
		SET
			scope = ${targetScopeValue},
			user_code = CASE
				WHEN ${targetScopeValue} = 'user_private' THEN ${targetOwnerUserCode}
				ELSE user_code
			END
		WHERE code IN (SELECT code FROM drive_tree)
			AND scope = ${input.sourceScope}
			AND (${input.sourceScope} <> 'user_private' OR user_code = ${input.sourceUserCode})
		RETURNING code
	`.execute(db);

	return updated.rows.length;
}
