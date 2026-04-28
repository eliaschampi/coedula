import type { PageServerLoad } from './$types';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import { getWorkspaceBranchUuid } from '$lib/server/user-branch.server';

const VALID_GROUPS = new Set(['A', 'B', 'C', 'D']);

export const load: PageServerLoad = async ({ locals, depends, url }) => {
	depends('students:hub:load');
	depends('enrollments:load');

	const canStudentsRead = await locals.can('students:read');
	const canEnrollmentsRead = await locals.can('enrollments:read');
	const canAccess =
		canStudentsRead ||
		canEnrollmentsRead ||
		(await locals.can('students:create')) ||
		(await locals.can('enrollments:create')) ||
		(await locals.can('enrollments:update')) ||
		(await locals.can('enrollments:delete'));

	if (!canAccess) {
		return {
			title: 'Alumnos',
			enrollments: [],
			cycles: [],
			cycleDegreeOptions: [],
			selectedCycleCode: null,
			selectedCycleDegreeCode: null,
			selectedGroupCode: 'A',
			searchQuery: '',
			canStudentsRead,
			canEnrollmentsRead
		};
	}

	const requestedCycleCode = (url.searchParams.get('cycle') ?? '').trim();
	const requestedCycleDegreeCode = (url.searchParams.get('degree') ?? '').trim();
	const requestedGroupCode = (url.searchParams.get('group') ?? 'A').trim().toUpperCase();
	const searchQuery = (url.searchParams.get('search') ?? '').trim();

	const workspaceBranch = getWorkspaceBranchUuid(locals.user);
	const [cycles, allCycleDegreeOptions] = await Promise.all([
		canEnrollmentsRead && workspaceBranch
			? EducationRepository.listCycleOptions(locals.db, { branchCode: workspaceBranch })
			: Promise.resolve([]),
		canEnrollmentsRead && workspaceBranch
			? EducationRepository.listCycleDegreeOptions(locals.db, { branchCode: workspaceBranch })
			: Promise.resolve([])
	]);

	const selectedCycleCode =
		cycles.find((cycle) => cycle.code === requestedCycleCode)?.code ?? cycles[0]?.code ?? null;
	const cycleDegreeOptions = allCycleDegreeOptions.filter(
		(option) => option.cycle_code === selectedCycleCode
	);
	const selectedCycleDegreeCode =
		cycleDegreeOptions.find((option) => option.code === requestedCycleDegreeCode)?.code ??
		cycleDegreeOptions[0]?.code ??
		null;
	const selectedGroupCode = VALID_GROUPS.has(requestedGroupCode) ? requestedGroupCode : 'A';

	const enrollments =
		canEnrollmentsRead && selectedCycleCode && selectedCycleDegreeCode
			? await EducationRepository.listEnrollmentsByFilters(locals.db, {
					cycleCode: selectedCycleCode,
					cycleDegreeCode: selectedCycleDegreeCode,
					groupCode: selectedGroupCode as 'A' | 'B' | 'C' | 'D',
					search: searchQuery
				})
			: [];

	return {
		title: 'Alumnos',
		enrollments,
		cycles,
		cycleDegreeOptions: allCycleDegreeOptions,
		selectedCycleCode,
		selectedCycleDegreeCode,
		selectedGroupCode,
		searchQuery,
		canStudentsRead,
		canEnrollmentsRead
	};
};
