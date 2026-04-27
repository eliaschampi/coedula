import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { WORKSPACE } from '$lib/messages/workspace';
import { listWorkspaceBranchOptions } from '$lib/server/user-branch.server';
import { isUuid } from '$lib/utils/validation';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('profile:load');

	if (!locals.user) {
		return {
			title: WORKSPACE.profileTitle,
			branchOptions: [] as { value: string; label: string }[]
		};
	}

	const branches = await listWorkspaceBranchOptions(locals.db, locals.user);
	const branchOptions = branches.map((b) => ({ value: b.code, label: b.name }));

	return {
		title: WORKSPACE.profileTitle,
		branchOptions
	};
};

export const actions: Actions = {
	updateCurrentBranch: async ({ locals, request }) => {
		if (!locals.user) {
			return fail(401, { error: 'No hay sesión activa' });
		}

		const formData = await request.formData();
		const raw = formData.get('current_branch');
		const next = typeof raw === 'string' ? raw.trim() : '';

		if (!isUuid(next)) {
			return fail(400, { error: 'Debes seleccionar una sede válida' });
		}

		const branches = await listWorkspaceBranchOptions(locals.db, locals.user);

		if (branches.length === 0) {
			return fail(400, { error: 'No tienes sedes asignadas para operar' });
		}

		if (!branches.some((b) => b.code === next)) {
			return fail(400, { error: 'No puedes asignar una sede a la que no tienes acceso' });
		}

		await locals.db
			.updateTable('users')
			.set({ current_branch: next, updated_at: new Date() })
			.where('code', '=', locals.user.code)
			.execute();

		redirect(303, '/profile');
	}
};
