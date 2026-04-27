import type { PageServerLoad } from './$types';
import { getWorkspaceBranchUuid } from '$lib/server/user-branch.server';

export const load: PageServerLoad = async ({ locals }) => {
	if (!(await locals.can('teacher_attendance:create'))) {
		return {
			title: 'Escanear asistencia docente',
			selectedBranchCode: null as string | null
		};
	}

	const selectedBranchCode = getWorkspaceBranchUuid(locals.user);

	return {
		title: 'Escanear asistencia docente',
		selectedBranchCode
	};
};
