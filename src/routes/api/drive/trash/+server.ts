import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
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

	const trashedNodes = await DriveRepository.listTrashSubtree(locals.db, scopeContext);

	if (trashedNodes.length === 0) {
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

	for (const node of trashedNodes) {
		if (!node.storage_path) {
			continue;
		}

		await removeDriveFileWithVariants(node.storage_path);
	}

	return json({ success: true, deleted: trashedNodes.length });
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
