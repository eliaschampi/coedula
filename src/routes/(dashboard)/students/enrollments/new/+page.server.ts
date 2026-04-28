import type { Actions, PageServerLoad } from './$types';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import { handleEnrollmentCreate } from '$lib/server/enrollment-actions.server';
import { getWorkspaceBranchUuid } from '$lib/server/user-branch.server';
import { isUuid } from '$lib/utils/validation';

const VALID_GROUPS = new Set(['A', 'B', 'C', 'D']);

export const load: PageServerLoad = async ({ locals, url }) => {
	const canCreate = await locals.can('enrollments:create');
	if (!canCreate) {
		return {
			title: 'Nueva matrícula',
			forbidden: true,
			noBranch: false,
			student: null,
			cycles: [],
			cycleDegreeOptions: [],
			selectedCycleCode: null,
			selectedCycleDegreeCode: null,
			selectedGroupCode: 'A' as const
		};
	}

	const studentCode = (url.searchParams.get('student') ?? '').trim();
	const workspaceBranch = getWorkspaceBranchUuid(locals.user);

	if (!workspaceBranch) {
		return {
			title: 'Nueva matrícula',
			forbidden: false,
			noBranch: true,
			student: null,
			cycles: [],
			cycleDegreeOptions: [],
			selectedCycleCode: null,
			selectedCycleDegreeCode: null,
			selectedGroupCode: 'A' as const
		};
	}

	const requestedCycleCode = (url.searchParams.get('cycle') ?? '').trim();
	const requestedCycleDegreeCode = (url.searchParams.get('degree') ?? '').trim();
	const requestedGroupCode = (url.searchParams.get('group') ?? 'A').trim().toUpperCase();

	const [cycles, allCycleDegreeOptions] = await Promise.all([
		EducationRepository.listCycleOptions(locals.db, { branchCode: workspaceBranch }),
		EducationRepository.listCycleDegreeOptions(locals.db, { branchCode: workspaceBranch })
	]);

	const selectedCycleCode =
		cycles.find((c) => c.code === requestedCycleCode)?.code ?? cycles[0]?.code ?? null;
	const filtered = allCycleDegreeOptions.filter((o) => o.cycle_code === selectedCycleCode);
	const selectedCycleDegreeCode =
		filtered.find((o) => o.code === requestedCycleDegreeCode)?.code ?? filtered[0]?.code ?? null;
	const selectedGroupCode = VALID_GROUPS.has(requestedGroupCode)
		? (requestedGroupCode as 'A' | 'B' | 'C' | 'D')
		: 'A';

	const student =
		studentCode && isUuid(studentCode)
			? await EducationRepository.findStudentByCode(locals.db, studentCode)
			: null;

	return {
		title: 'Nueva matrícula',
		forbidden: false,
		noBranch: false,
		student,
		cycles,
		cycleDegreeOptions: allCycleDegreeOptions,
		selectedCycleCode,
		selectedCycleDegreeCode,
		selectedGroupCode
	};
};

export const actions: Actions = {
	default: async (event) => handleEnrollmentCreate(event)
};
