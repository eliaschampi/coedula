import { error } from '@sveltejs/kit';
import type { SelectQueryBuilder } from 'kysely';
import type { SessionUser } from '$lib/auth/session';
import type { Database } from '$lib/database';
import type { DB } from '$lib/database/types';
import { isValidDriveScope, type DriveScope } from '$lib/utils/drive';

export interface DriveScopeContext {
	scope: DriveScope;
	ownerUserCode: string | null;
}

export interface ScopeAwareFile {
	code: string;
	scope: string;
	user_code: string;
}

interface ResolveScopeInput {
	scope?: string | null;
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
}
