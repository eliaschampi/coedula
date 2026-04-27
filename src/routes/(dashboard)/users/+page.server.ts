import { sql } from 'kysely';
import { fail } from '@sveltejs/kit';
import { hashPassword } from '$lib/auth/password';
import type { Database } from '$lib/database';
import { BranchAccessRepository } from '$lib/server/repositories/branch-access.repository';
import { readFormField } from '$lib/utils/formData';
import { isUuid } from '$lib/utils/validation';
import type { Actions, PageServerLoad } from './$types';

let cachedSuperUserColumn: 'is_super_user' | 'is_super_admin' | null | undefined;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

async function resolveSuperUserColumn(
	db: Database
): Promise<'is_super_user' | 'is_super_admin' | null> {
	if (cachedSuperUserColumn !== undefined) {
		return cachedSuperUserColumn;
	}

	const result = await sql<{ column_name: string }>`
		select column_name
		from information_schema.columns
		where table_schema = 'public'
			and table_name = 'users'
			and column_name in ('is_super_user', 'is_super_admin')
	`.execute(db);

	const columnNames = result.rows.map((row) => row.column_name);
	if (columnNames.includes('is_super_user')) {
		cachedSuperUserColumn = 'is_super_user';
		return cachedSuperUserColumn;
	}

	if (columnNames.includes('is_super_admin')) {
		cachedSuperUserColumn = 'is_super_admin';
		return cachedSuperUserColumn;
	}

	cachedSuperUserColumn = null;
	return cachedSuperUserColumn;
}

function buildSuperUserSelect(superUserColumn: 'is_super_user' | 'is_super_admin' | null) {
	return superUserColumn
		? sql<boolean>`coalesce(${sql.ref(`users.${superUserColumn}`)}, false)`
		: sql<boolean>`false`;
}

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('users:load');

	if (!(await locals.can('users:read'))) {
		return { title: 'Usuarios', users: [], canCreateWithBranch: false };
	}

	const superUserColumn = await resolveSuperUserColumn(locals.db);
	const superUserSelect = buildSuperUserSelect(superUserColumn).as('is_super_user');

	try {
		const users = await locals.db
			.selectFrom('users')
			.select([
				'code',
				'name',
				'last_name',
				'email',
				'photo_url',
				superUserSelect,
				'last_login',
				'created_at'
			])
			.orderBy('created_at', 'desc')
			.execute();

		const initialBranch = await locals.db
			.selectFrom('branches as b')
			.select('b.name')
			.where('b.state', '=', true)
			.orderBy('b.name', 'asc')
			.executeTakeFirst();

		return {
			title: 'Usuarios',
			users,
			canCreateWithBranch: Boolean(initialBranch)
		};
	} catch {
		return { title: 'Usuarios', users: [], canCreateWithBranch: false };
	}
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!(await locals.can('users:create'))) {
			return fail(403, { error: 'No tienes permisos para crear usuarios' });
		}

		const formData = await request.formData();
		const name = readFormField(formData, 'name');
		const last_name = readFormField(formData, 'last_name');
		const email = readFormField(formData, 'email').toLowerCase();
		const password = readFormField(formData, 'password');
		const photo_url = readFormField(formData, 'photo_url') || 'avatar.svg';

		if (!name || !last_name) {
			return fail(400, { error: 'Nombre y apellidos son obligatorios' });
		}

		if (!EMAIL_REGEX.test(email)) {
			return fail(400, { error: 'Correo electrónico inválido' });
		}

		if (!STRONG_PASSWORD_REGEX.test(password)) {
			return fail(400, {
				error: 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número'
			});
		}

		try {
			const firstBranch = await BranchAccessRepository.getFirstActiveBranch(locals.db);
			if (!firstBranch) {
				return fail(400, {
					error:
						'Crea y activa al menos una sede antes de registrar usuarios. La sede asigna automáticamente su sede de trabajo.'
				});
			}

			const existingUser = await locals.db
				.selectFrom('users')
				.select('code')
				.where('email', '=', email)
				.executeTakeFirst();

			if (existingUser) {
				return fail(400, { error: 'Ya existe un usuario con ese correo electrónico' });
			}

			const password_hash = await hashPassword(password);

			await locals.db.transaction().execute(async (trx) => {
				const row = await trx
					.insertInto('users')
					.values({
						name,
						last_name,
						email,
						password_hash,
						photo_url,
						current_branch: firstBranch.code
					})
					.returning('code')
					.executeTakeFirstOrThrow();
				await BranchAccessRepository.appendUserToMembers(trx, firstBranch.code, row.code);
			});

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error creando usuario';
			return fail(400, { error: message });
		}
	},

	update: async ({ locals, request }) => {
		const formData = await request.formData();
		const userId = readFormField(formData, 'user_id');
		const name = readFormField(formData, 'name');
		const last_name = readFormField(formData, 'last_name');
		const email = readFormField(formData, 'email').toLowerCase();
		const photo_url = readFormField(formData, 'photo_url') || 'avatar.svg';

		const isSelf = locals.user?.code === userId;
		if (!isSelf && !(await locals.can('users:update'))) {
			return fail(403, { error: 'No tienes permisos para actualizar usuarios' });
		}

		if (!userId) {
			return fail(400, { error: 'Usuario inválido' });
		}

		if (!isUuid(userId)) {
			return fail(400, { error: 'Identificador de usuario inválido' });
		}

		if (!name || !last_name) {
			return fail(400, { error: 'Nombre y apellidos son obligatorios' });
		}

		if (!EMAIL_REGEX.test(email)) {
			return fail(400, { error: 'Correo electrónico inválido' });
		}

		try {
			const userExists = await locals.db
				.selectFrom('users')
				.select('code')
				.where('code', '=', userId)
				.executeTakeFirst();

			if (!userExists) {
				return fail(404, { error: 'Usuario no encontrado' });
			}

			const emailInUse = await locals.db
				.selectFrom('users')
				.select('code')
				.where('email', '=', email)
				.where('code', '!=', userId)
				.executeTakeFirst();

			if (emailInUse) {
				return fail(400, { error: 'Ya existe un usuario con ese correo electrónico' });
			}

			await locals.db
				.updateTable('users')
				.set({
					name,
					last_name,
					email,
					photo_url,
					updated_at: new Date()
				})
				.where('code', '=', userId)
				.execute();

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error actualizando usuario';
			return fail(400, { error: message });
		}
	},

	updatePassword: async ({ locals, request }) => {
		const formData = await request.formData();
		const userId = readFormField(formData, 'user_id');
		const password = readFormField(formData, 'password');
		const confirmPassword = readFormField(formData, 'confirm_password');

		const isSelf = locals.user?.code === userId;
		if (!isSelf && !(await locals.can('users:update'))) {
			return fail(403, { error: 'No tienes permisos para actualizar contraseñas' });
		}

		if (!userId) {
			return fail(400, { error: 'Usuario inválido' });
		}

		if (!isUuid(userId)) {
			return fail(400, { error: 'Identificador de usuario inválido' });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Las contraseñas no coinciden' });
		}

		if (!STRONG_PASSWORD_REGEX.test(password)) {
			return fail(400, {
				error: 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número'
			});
		}

		try {
			const userExists = await locals.db
				.selectFrom('users')
				.select('code')
				.where('code', '=', userId)
				.executeTakeFirst();

			if (!userExists) {
				return fail(404, { error: 'Usuario no encontrado' });
			}

			const password_hash = await hashPassword(password);

			await locals.db
				.updateTable('users')
				.set({
					password_hash,
					updated_at: new Date()
				})
				.where('code', '=', userId)
				.execute();

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error actualizando contraseña';
			return fail(400, { error: message });
		}
	},

	delete: async ({ locals, request }) => {
		if (!(await locals.can('users:delete'))) {
			return fail(403, { error: 'No tienes permisos para eliminar usuarios' });
		}

		const formData = await request.formData();
		const userId = readFormField(formData, 'user_id');

		if (!userId) {
			return fail(400, { error: 'Usuario inválido' });
		}

		if (!isUuid(userId)) {
			return fail(400, { error: 'Identificador de usuario inválido' });
		}

		if (locals.user?.code === userId) {
			return fail(400, { error: 'No puedes eliminar tu propio usuario' });
		}

		try {
			const superUserColumn = await resolveSuperUserColumn(locals.db);
			const targetUser = await locals.db
				.selectFrom('users')
				.select(['code', buildSuperUserSelect(superUserColumn).as('is_super_user')])
				.where('code', '=', userId)
				.executeTakeFirst();

			if (!targetUser) {
				return fail(404, { error: 'Usuario no encontrado' });
			}

			if (targetUser.is_super_user === true) {
				return fail(400, { error: 'No se puede eliminar un super usuario' });
			}

			await locals.db.transaction().execute(async (trx) => {
				await trx.deleteFrom('permissions').where('user_code', '=', userId).execute();
				await trx.deleteFrom('users').where('code', '=', userId).execute();
			});

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error eliminando usuario';
			return fail(400, { error: message });
		}
	}
};
