export interface SuperUserCandidate {
	is_super_user?: unknown;
	is_super_admin?: unknown;
}

/**
 * Returns true when the user has super-user access.
 * Supports both legacy and current flag names for compatibility.
 */
export function hasSuperUserAccess(user: SuperUserCandidate | null | undefined): boolean {
	if (!user) return false;
	return user.is_super_user === true || user.is_super_admin === true;
}
