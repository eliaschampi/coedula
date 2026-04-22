import type { Database } from '$lib/database';
import type { PermissionKey } from '$lib/stores/permissions.ts';
import { hasSuperUserAccess, type SuperUserCandidate } from './super-user';

export type PermissionChecker = (permissionKey: PermissionKey) => boolean | Promise<boolean>;

/**
 * Get user permissions from database
 */
export async function getUserPermissions(db: Database, userCode: string): Promise<PermissionKey[]> {
	try {
		const permissions = await db
			.selectFrom('permissions')
			.select(['entity', 'action'])
			.where('user_code', '=', userCode)
			.execute();

		return permissions.map((p: { entity: string; action: string }) => `${p.entity}:${p.action}`);
	} catch (error) {
		console.error('Error fetching user permissions:', error);
		return [];
	}
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
	permissions: PermissionKey[],
	permissionKey: string,
	user?: SuperUserCandidate | null
): boolean {
	if (hasSuperUserAccess(user)) return true;
	return permissions.includes(permissionKey);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
	permissions: PermissionKey[],
	user: SuperUserCandidate | null | undefined,
	...permissionKeys: string[]
): boolean {
	if (hasSuperUserAccess(user)) return true;
	return permissionKeys.some((key) => permissions.includes(key));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
	permissions: PermissionKey[],
	user: SuperUserCandidate | null | undefined,
	...permissionKeys: string[]
): boolean {
	if (hasSuperUserAccess(user)) return true;
	return permissionKeys.every((key) => permissions.includes(key));
}

/**
 * Evaluate multiple permission checks through a generic checker such as locals.can.
 */
export async function checkAllPermissions(
	checkPermission: PermissionChecker,
	...permissionKeys: PermissionKey[]
): Promise<boolean> {
	const results = await Promise.all(
		permissionKeys.map((permissionKey) => Promise.resolve(checkPermission(permissionKey)))
	);

	return results.every(Boolean);
}
