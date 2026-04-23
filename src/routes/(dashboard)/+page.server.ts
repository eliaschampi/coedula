import type { PageServerLoad } from './$types';
import { DashboardRepository } from '$lib/server/repositories/dashboard.repository';

export const load: PageServerLoad = async ({ locals, depends, url }) => {
	depends('dashboard:load');

	return DashboardRepository.loadHome(locals.db, locals.can, {
		userCode: locals.user?.code,
		isSuperAdmin: Boolean(locals.user?.is_super_admin),
		branchCode: url.searchParams.get('branch_code'),
		cycleCode: url.searchParams.get('cycle_code'),
		cycleDegreeCode: url.searchParams.get('cycle_degree_code'),
		groupCode: url.searchParams.get('group_code'),
		courseCode: url.searchParams.get('course_code')
	});
};
