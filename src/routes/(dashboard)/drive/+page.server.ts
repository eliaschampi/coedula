import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('drive:load');

	if (!(await locals.can('drive:read'))) {
		return { title: 'Drive' };
	}

	return { title: 'Drive' };
};
