import { error } from '@sveltejs/kit';
import { sql, type Kysely, type SelectQueryBuilder, type Transaction } from 'kysely';
import type { SessionUser } from '$lib/auth/session';
import type { Database } from '$lib/database';
import type { DB } from '$lib/database/types';
import { isValidDriveScope, type DriveScope } from '$lib/utils/drive';

type DatabaseExecutor = Kysely<DB> | Transaction<DB>;

export interface DriveScopeContext {
	scope: DriveScope;
	ownerUserCode: string | null;
}

export interface ScopeAwareFile {
	code: string;
	scope: string;
	user_code: string;
}

export interface DriveSubtreeNode {
	code: string;
	storage_path: string | null;
}

interface ResolveScopeInput {
	scope?: string | null;
}

interface UpdateSubtreeScopeInput {
	rootCode: string;
	sourceScope: DriveScope;
	sourceUserCode: string;
	targetScope: DriveScope;
	targetOwnerUserCode: string | null;
}

export class DriveRepository {
	static async resolveScopeContext(
		user: SessionUser | null,
		input: ResolveScopeInput
	): Promise<DriveScopeContext> {
		const normalizedScope = (input.scope ?? '').trim().toLowerCase();
		if (!isValidDriveScope(normalizedScope)) {
			throw error(400, 'Alcance de Drive inválido');
		}

		if (normalizedScope === 'user_private') {
			if (!user?.code) {
				throw error(401, 'No autorizado');
			}

			return {
				scope: normalizedScope,
				ownerUserCode: user.code
			};
		}

		return {
			scope: normalizedScope,
			ownerUserCode: null
		};
	}

	static async assertFileAccess(
		db: Database,
		user: SessionUser | null,
		fileCode: string
	): Promise<ScopeAwareFile> {
		const file = await db
			.selectFrom('drive_files')
			.select(['code', 'scope', 'user_code'])
			.where('code', '=', fileCode)
			.executeTakeFirst();

		if (!file) {
			throw error(404, 'Archivo no encontrado');
		}

		await this.assertFileRecordAccess(user, file);
		return file;
	}

	static async assertFileRecordAccess(
		user: SessionUser | null,
		file: ScopeAwareFile
	): Promise<void> {
		const scope = this.normalizeScope(file.scope);

		if (scope === 'user_private') {
			if (user?.is_super_admin) {
				return;
			}

			if (!user?.code || user.code !== file.user_code) {
				throw error(403, 'No tienes acceso a este archivo privado');
			}
		}
	}

	static isFileInContext(file: ScopeAwareFile, context: DriveScopeContext): boolean {
		if (!isValidDriveScope(file.scope) || file.scope !== context.scope) {
			return false;
		}

		if (context.scope === 'user_private') {
			return !!context.ownerUserCode && file.user_code === context.ownerUserCode;
		}

		return true;
	}

	static normalizeScope(scope: string): DriveScope {
		if (!isValidDriveScope(scope)) {
			throw error(500, 'Archivo con alcance inválido');
		}

		return scope;
	}

	static applyScopeFilter<O>(
		query: SelectQueryBuilder<DB, 'drive_files', O>,
		context: DriveScopeContext
	): SelectQueryBuilder<DB, 'drive_files', O> {
		let scopedQuery = query.where('scope', '=', context.scope);

		if (context.scope === 'user_private' && context.ownerUserCode) {
			scopedQuery = scopedQuery.where('user_code', '=', context.ownerUserCode);
		}

		return scopedQuery;
	}

	static async listSubtree(db: DatabaseExecutor, rootCode: string): Promise<DriveSubtreeNode[]> {
		const result = await sql<DriveSubtreeNode>`
			SELECT code::text AS code, storage_path
			FROM public.drive_file_subtree(${rootCode}::uuid)
		`.execute(db);

		return result.rows;
	}

	static async listTrashSubtree(
		db: DatabaseExecutor,
		context: DriveScopeContext
	): Promise<DriveSubtreeNode[]> {
		const result = await sql<DriveSubtreeNode>`
			SELECT code::text AS code, storage_path
			FROM public.drive_trash_subtree(${context.scope}, ${context.ownerUserCode}::uuid)
		`.execute(db);

		return result.rows;
	}

	static async isDescendantOf(
		db: DatabaseExecutor,
		ancestorCode: string,
		candidateCode: string
	): Promise<boolean> {
		const result = await sql<{ is_descendant: boolean }>`
			SELECT public.drive_file_is_descendant(
				${ancestorCode}::uuid,
				${candidateCode}::uuid
			) AS is_descendant
		`.execute(db);

		return result.rows[0]?.is_descendant === true;
	}

	static async hasTrashedAncestor(
		db: DatabaseExecutor,
		startCode: string | null,
		context: DriveScopeContext
	): Promise<boolean> {
		if (!startCode) {
			return false;
		}

		const result = await sql<{ has_trashed: boolean }>`
			SELECT public.drive_file_has_trashed_ancestor(
				${startCode}::uuid,
				${context.scope},
				${context.ownerUserCode}::uuid
			) AS has_trashed
		`.execute(db);

		return result.rows[0]?.has_trashed === true;
	}

	static async updateSubtreeTrashState(
		db: DatabaseExecutor,
		rootCode: string,
		deletedAt: Date | null
	): Promise<number> {
		const result = await sql<{ code: string }>`
			UPDATE public.drive_files
			SET deleted_at = ${deletedAt}
			WHERE code IN (
				SELECT code FROM public.drive_file_subtree(${rootCode}::uuid)
			)
			RETURNING code
		`.execute(db);

		return result.rows.length;
	}

	static async updateSubtreeScope(
		db: DatabaseExecutor,
		input: UpdateSubtreeScopeInput
	): Promise<number> {
		const result = await sql<{ code: string }>`
			UPDATE public.drive_files
			SET
				scope = ${input.targetScope},
				user_code = CASE
					WHEN ${input.targetScope} = 'user_private' THEN ${input.targetOwnerUserCode}::uuid
					ELSE user_code
				END
			WHERE code IN (
				SELECT code FROM public.drive_file_subtree(${input.rootCode}::uuid)
			)
				AND scope = ${input.sourceScope}
				AND (${input.sourceScope} <> 'user_private' OR user_code = ${input.sourceUserCode}::uuid)
			RETURNING code
		`.execute(db);

		return result.rows.length;
	}
}
