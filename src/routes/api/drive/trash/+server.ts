import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from 'kysely';
import { DriveRepository } from '$lib/server/repositories/drive.repository';
import { removeDriveFileWithVariants } from '$lib/server/services/drive-image.service';

/**
 * DELETE /api/drive/trash?scope=<scope>
 * Permanently delete all trashed files from a scope context.
 */
export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('drive:delete'))) {
		throw error(403, 'No tienes permisos para vaciar la papelera');
	}

	const scopeContext = await DriveRepository.resolveScopeContext(locals.user, {
		scope: url.searchParams.get('scope')
	});

	const ownerUserCode = scopeContext.scope === 'user_private' ? scopeContext.ownerUserCode : null;

	const scopedOwnerFilter =
		scopeContext.scope === 'user_private' && ownerUserCode
			? sql`AND user_code = ${ownerUserCode}`
			: sql``;

	const treeRows = await sql<{ code: string; storage_path: string | null }>`
		WITH RECURSIVE trash_roots AS (
			SELECT code, parent_code, storage_path, scope, user_code
			FROM drive_files
			WHERE scope = ${scopeContext.scope}
				AND deleted_at IS NOT NULL
				${scopedOwnerFilter}
		),
		trash_tree AS (
			SELECT code, parent_code, storage_path, scope, user_code
			FROM trash_roots
			UNION ALL
			SELECT f.code, f.parent_code, f.storage_path, f.scope, f.user_code
			FROM drive_files f
			INNER JOIN trash_tree tt ON f.parent_code = tt.code
			WHERE
				f.scope = tt.scope
				AND (tt.scope <> 'user_private' OR f.user_code = tt.user_code)
		)
		SELECT DISTINCT code, storage_path
		FROM trash_tree
	`.execute(locals.db);

	if (treeRows.rows.length === 0) {
		return json({ success: true, deleted: 0 });
	}

	let deleteQuery = locals.db
		.deleteFrom('drive_files')
		.where('scope', '=', scopeContext.scope)
		.where('deleted_at', 'is not', null);

	if (scopeContext.scope === 'user_private' && scopeContext.ownerUserCode) {
		deleteQuery = deleteQuery.where('user_code', '=', scopeContext.ownerUserCode);
	}

	await deleteQuery.execute();

	for (const row of treeRows.rows) {
		if (!row.storage_path) {
			continue;
		}

		await removeDriveFileWithVariants(row.storage_path);
	}

	return json({ success: true, deleted: treeRows.rows.length });
};

/**
 * GET /api/drive/trash?scope=<scope>
 * Returns storage usage (non-trashed files only) for the scope context.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('drive:read'))) {
		throw error(403, 'No tienes permisos para ver el Drive');
	}

	const scopeContext = await DriveRepository.resolveScopeContext(locals.user, {
		scope: url.searchParams.get('scope')
	});

	let usageQuery = locals.db
		.selectFrom('drive_files')
		.select((eb) => eb.fn.coalesce(eb.fn.sum('size'), eb.val(0)).as('total_size'))
		.where('scope', '=', scopeContext.scope)
		.where('deleted_at', 'is', null);

	if (scopeContext.scope === 'user_private' && scopeContext.ownerUserCode) {
		usageQuery = usageQuery.where('user_code', '=', scopeContext.ownerUserCode);
	}

	const result = await usageQuery.executeTakeFirst();
	const totalSize = Number(result?.total_size ?? 0);
	return json({ used: totalSize });
};
