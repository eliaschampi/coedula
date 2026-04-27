import { sql, type Kysely } from 'kysely';
import type { DB, Database } from '$lib/database';
import type { CashboxBranchOption } from '$lib/types/finance';
import { normalizeUuid } from '$lib/utils/validation';

/**
 * Sede y visibilidad por usuario: regla de negocio transversal (no solo caja).
 */
export class BranchAccessRepository {
	static pickAllowedBranch(
		requested: string | null | undefined,
		options: ReadonlyArray<{ code: string }>
	): string | null {
		const normalized = normalizeUuid(requested);
		return options.find((o) => o.code === normalized)?.code ?? options[0]?.code ?? null;
	}

	/** Sedes activas a las que el usuario tiene acceso (o todas si es super). */
	static async listForUser(
		db: Kysely<DB> | Database,
		userCode: string | null | undefined,
		isSuperAdmin: boolean
	): Promise<CashboxBranchOption[]> {
		if (!isSuperAdmin && !normalizeUuid(userCode)) {
			return [];
		}

		let query = db
			.selectFrom('branches as b')
			.select(['b.code', 'b.name'])
			.where('b.state', '=', true);

		if (!isSuperAdmin) {
			query = query.where(sql<boolean>`${userCode}::uuid = ANY(${sql.ref('b.users')})`);
		}

		return query.orderBy('b.name', 'asc').execute();
	}

	/** Primera sede activa (por nombre) — requisito para altas que fijan sede inicial. */
	static async getFirstActiveBranch(
		db: Kysely<DB> | Database
	): Promise<CashboxBranchOption | null> {
		return db
			.selectFrom('branches as b')
			.select(['b.code', 'b.name'])
			.where('b.state', '=', true)
			.orderBy('b.name', 'asc')
			.executeTakeFirst() as Promise<CashboxBranchOption | null>;
	}

	/** Añade el usuario al arreglo `users` de la sede (idempotente a nivel de array). */
	static async appendUserToMembers(
		db: Kysely<DB> | Database,
		branchCode: string,
		userCode: string
	): Promise<void> {
		await db
			.updateTable('branches')
			.set({ users: sql`array_append(${sql.ref('users')}, ${userCode}::uuid)` })
			.where('code', '=', branchCode)
			.execute();
	}

	/** Cuenta sedes activas (distintas de `exceptBranchCode`) en las que participa el usuario. */
	static async countOtherActiveMemberships(
		db: Kysely<DB> | Database,
		userCode: string,
		exceptBranchCode: string
	): Promise<number> {
		const row = await db
			.selectFrom('branches')
			.select((eb) => eb.fn.count<number>('code').as('c'))
			.where('code', '!=', exceptBranchCode)
			.where('state', '=', true)
			.where(sql<boolean>`${userCode}::uuid = ANY(${sql.ref('users')})`)
			.executeTakeFirst();
		return Number(row?.c ?? 0);
	}
}
