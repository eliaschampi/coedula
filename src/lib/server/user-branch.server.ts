import type { SessionUser } from '$lib/auth/session';
import type { Database } from '$lib/database';
import { BranchAccessRepository } from '$lib/server/repositories/branch-access.repository';
import type { CashboxBranchOption } from '$lib/types/finance';
import { normalizeUuid } from '$lib/utils/validation';

type Userlike = { code: string; is_super_admin: boolean; current_branch: string } | null;

/** `current_branch` del usuario de sesión, validado como UUID, o `null`. */
export function getWorkspaceBranchUuid(
	user: Pick<SessionUser, 'current_branch'> | null | undefined
): string | null {
	return normalizeUuid(user?.current_branch);
}

/**
 * Sedes que el usuario puede elegir (perfil, ciclos, horarios). Los datos de negocio
 * se filtran con `locals.user.current_branch` (NOT NULL en base de datos operativa).
 */
export async function listWorkspaceBranchOptions(
	db: Database,
	user: Userlike
): Promise<CashboxBranchOption[]> {
	if (!user) {
		return [];
	}
	return BranchAccessRepository.listForUser(db, user.code, Boolean(user.is_super_admin));
}

/**
 * Tras quitar a un usuario de una sede: ajusta `current_branch` si dejaba de ser válida.
 * Requiere que el usuario siga teniendo al menos otra sede; si no, falle la acción de sede antes.
 */
export async function reconcileUserCurrentBranch(db: Database, userCode: string): Promise<void> {
	const u = await db
		.selectFrom('users')
		.select(['is_super_admin', 'current_branch'])
		.where('code', '=', userCode)
		.executeTakeFirst();
	if (!u) return;
	const available = await BranchAccessRepository.listForUser(db, userCode, u.is_super_admin);
	const pick = BranchAccessRepository.pickAllowedBranch(u.current_branch, available);
	if (pick === u.current_branch) return;
	if (pick == null) {
		throw new Error(
			'Inconsistencia: el usuario no tiene sedes asignadas; no se puede ajustar current_branch'
		);
	}
	await db
		.updateTable('users')
		.set({ current_branch: pick, updated_at: new Date() })
		.where('code', '=', userCode)
		.execute();
}
