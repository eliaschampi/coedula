import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
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
				const isChild = await DriveRepository.isDescendantOf(locals.db, fileCode, parentCode);
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

		const hasParentOverride = Object.hasOwn(updates, 'parent_code');
		const parentForRestoreCheck = hasParentOverride
			? typeof updates.parent_code === 'string'
				? updates.parent_code
				: null
			: file.parent_code;

		if (
			body.deleted_at === false &&
			(await DriveRepository.hasTrashedAncestor(
				locals.db,
				parentForRestoreCheck,
				targetScopeContext
			))
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
					const changedRows = await DriveRepository.updateSubtreeScope(trx, {
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
				const updatedRows = await DriveRepository.updateSubtreeTrashState(
					trx,
					fileCode,
					nextDeletedAt
				);
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

	const descendants = await DriveRepository.listSubtree(locals.db, fileCode);

	await locals.db.deleteFrom('drive_files').where('code', '=', fileCode).execute();

	for (const node of descendants) {
		if (!node.storage_path) {
			continue;
		}

		await removeDriveFileWithVariants(node.storage_path);
	}

	return json({ success: true, deletedFiles: descendants.length });
};
