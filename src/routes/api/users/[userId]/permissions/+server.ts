import { json, error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PERMISSION_DEFINITIONS } from '$lib/permissions/definitions';
import { isUuid } from '$lib/utils/validation';

const ALLOWED_PERMISSION_KEYS = new Set(PERMISSION_DEFINITIONS.map((permission) => permission.key));

interface PermissionInput {
	entity?: unknown;
	action?: unknown;
	user_action?: unknown;
}

function normalizePermissionsInput(value: unknown): { entity: string; action: string }[] {
	if (!Array.isArray(value)) {
		throw error(400, 'Formato de permisos inválido');
	}

	const normalized = value.map((item) => {
		const permission = item as PermissionInput;
		const entity = typeof permission.entity === 'string' ? permission.entity.trim() : '';
		const actionCandidate =
			typeof permission.user_action === 'string'
				? permission.user_action
				: typeof permission.action === 'string'
					? permission.action
					: '';
		const action = actionCandidate.trim();

		if (!entity || !action) {
			throw error(400, 'Cada permiso debe incluir entity y action');
		}

		const key = `${entity}:${action}`;
		if (!ALLOWED_PERMISSION_KEYS.has(key)) {
			throw error(400, `Permiso inválido: ${key}`);
		}

		return { entity, action };
	});

	const unique = new Map<string, { entity: string; action: string }>();
	for (const permission of normalized) {
		unique.set(`${permission.entity}:${permission.action}`, permission);
	}

	return [...unique.values()];
}

// GET - Fetch user permissions
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session?.user) {
		throw error(401, 'No autorizado');
	}

	const { userId } = params;
	if (!isUuid(userId)) {
		throw error(400, 'userId inválido');
	}

	if (!(await locals.can('users:manage_permissions'))) {
		throw error(403, 'Permiso requerido: users:manage_permissions');
	}

	try {
		// Fetch permissions for the user
		const permissions = await locals.db
			.selectFrom('permissions')
			.select(['code', 'user_code', 'entity', 'action'])
			.where('user_code', '=', userId)
			.orderBy('entity', 'asc')
			.orderBy('action', 'asc')
			.execute();

		return json({ permissions });
	} catch (err) {
		if (isHttpError(err)) {
			throw err;
		}
		console.error('Error fetching permissions:', err);
		throw error(500, 'Error al obtener permisos');
	}
};

// POST - Update user permissions
export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session?.user) {
		throw error(401, 'No autorizado');
	}

	const { userId } = params;
	if (!isUuid(userId)) {
		throw error(400, 'userId inválido');
	}

	if (!(await locals.can('users:manage_permissions'))) {
		throw error(403, 'Permiso requerido: users:manage_permissions');
	}

	try {
		const payload = (await request.json()) as { permissions?: unknown };
		const normalizedPermissions = normalizePermissionsInput(payload.permissions ?? []);

		await locals.db.transaction().execute(async (trx) => {
			await trx.deleteFrom('permissions').where('user_code', '=', userId).execute();

			if (normalizedPermissions.length > 0) {
				await trx
					.insertInto('permissions')
					.values(
						normalizedPermissions.map((permission) => ({
							user_code: userId,
							entity: permission.entity,
							action: permission.action
						}))
					)
					.execute();
			}
		});

		return json({
			success: true,
			count: normalizedPermissions.length
		});
	} catch (err) {
		if (isHttpError(err)) {
			throw err;
		}
		console.error('Error updating permissions:', err);
		throw error(500, 'Error al actualizar permisos');
	}
};
