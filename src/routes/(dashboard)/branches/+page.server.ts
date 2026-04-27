import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { readFormCheckbox, readFormField, readFormFieldList } from '$lib/utils/formData';
import { areUuids, isUuid } from '$lib/utils/validation';
import { BranchAccessRepository } from '$lib/server/repositories/branch-access.repository';
import { reconcileUserCurrentBranch } from '$lib/server/user-branch.server';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('branches:load');

	if (!(await locals.can('branches:read'))) {
		return { branches: [], users: [], title: 'Sedes' };
	}

	try {
		const branches = await locals.db
			.selectFrom('branches')
			.selectAll()
			.orderBy('created_at', 'desc')
			.execute();

		const users = await locals.db
			.selectFrom('users')
			.select(['code', 'name', 'last_name', 'email'])
			.execute();

		return { branches, users, title: 'Sedes' };
	} catch {
		return { branches: [], users: [], title: 'Sedes' };
	}
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!(await locals.can('branches:create'))) {
			return fail(403, { error: 'No tienes permisos para crear sedes' });
		}

		const formData = await request.formData();
		const name = readFormField(formData, 'name');
		const state = readFormCheckbox(formData, 'state');
		const selectedUsers = readFormFieldList(formData, 'selectedUsers');

		if (!name) {
			return fail(400, { error: 'El nombre es obligatorio' });
		}

		if (selectedUsers.length === 0) {
			return fail(400, { error: 'Debe seleccionar al menos un usuario' });
		}

		if (!areUuids(selectedUsers)) {
			return fail(400, { error: 'Lista de usuarios inválida' });
		}

		try {
			await locals.db
				.insertInto('branches')
				.values({ name, state, users: selectedUsers })
				.execute();
			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error creando sede';
			return fail(400, { error: message });
		}
	},

	update: async ({ locals, request }) => {
		if (!(await locals.can('branches:update'))) {
			return fail(403, { error: 'No tienes permisos para actualizar sedes' });
		}

		const formData = await request.formData();
		const branchCode = readFormField(formData, 'code');
		const name = readFormField(formData, 'name');
		const state = readFormCheckbox(formData, 'state');
		const selectedUsers = readFormFieldList(formData, 'selectedUsers');

		if (!branchCode) {
			return fail(400, { error: 'Sede inválida' });
		}

		if (!isUuid(branchCode)) {
			return fail(400, { error: 'Identificador de sede inválido' });
		}

		if (!name) {
			return fail(400, { error: 'El nombre es obligatorio' });
		}

		if (selectedUsers.length === 0) {
			return fail(400, { error: 'Debe seleccionar al menos un usuario' });
		}

		if (!areUuids(selectedUsers)) {
			return fail(400, { error: 'Lista de usuarios inválida' });
		}

		try {
			const before = await locals.db
				.selectFrom('branches')
				.select('users')
				.where('code', '=', branchCode)
				.executeTakeFirst();
			const beforeUsers = before?.users?.length ? [...before.users] : [];
			const afterSet = new Set(selectedUsers);
			const removedFromThisBranch = beforeUsers.filter((code) => !afterSet.has(code));

			for (const userCode of removedFromThisBranch) {
				const other = await BranchAccessRepository.countOtherActiveMemberships(
					locals.db,
					userCode,
					branchCode
				);
				if (other < 1) {
					return fail(400, {
						error:
							'No se puede quitar a un usuario de su única sede. Asigna otra sede a ese usuario antes, o quítalo del sistema.'
					});
				}
			}

			const result = await locals.db
				.updateTable('branches')
				.set({ name, state, users: selectedUsers })
				.where('code', '=', branchCode)
				.executeTakeFirst();

			if (Number(result.numUpdatedRows ?? 0) === 0) {
				return fail(404, { error: 'Sede no encontrada' });
			}

			for (const userCode of removedFromThisBranch) {
				await reconcileUserCurrentBranch(locals.db, userCode);
			}

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error actualizando sede';
			return fail(400, { error: message });
		}
	},

	delete: async ({ locals, request }) => {
		if (!(await locals.can('branches:delete'))) {
			return fail(403, { error: 'No tienes permisos para eliminar sedes' });
		}

		const formData = await request.formData();
		const branchCode = readFormField(formData, 'code');
		if (!branchCode) {
			return fail(400, { error: 'Sede inválida' });
		}

		if (!isUuid(branchCode)) {
			return fail(400, { error: 'Identificador de sede inválido' });
		}

		try {
			const result = await locals.db
				.deleteFrom('branches')
				.where('code', '=', branchCode)
				.executeTakeFirst();

			if (Number(result.numDeletedRows ?? 0) === 0) {
				return fail(404, { error: 'Sede no encontrada' });
			}

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error eliminando sede';
			return fail(400, { error: message });
		}
	}
};
