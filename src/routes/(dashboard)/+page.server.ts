import type { PageServerLoad } from './$types';
import { DashboardRepository } from '$lib/server/repositories/dashboard.repository';

export const load: PageServerLoad = async ({ locals, depends, url }) => {
	depends('dashboard:load');

	return DashboardRepository.loadHome(locals.db, locals.can, {
		branchCode: url.searchParams.get('branch_code'),
		rangeDays: url.searchParams.get('range')
	});
};
