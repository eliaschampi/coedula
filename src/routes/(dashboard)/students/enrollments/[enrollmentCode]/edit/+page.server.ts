import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import {
	handleEnrollmentDelete,
	handleEnrollmentUpdate
} from '$lib/server/enrollment-actions.server';
import { getWorkspaceBranchUuid } from '$lib/server/user-branch.server';
import { isUuid } from '$lib/utils/validation';

export const load: PageServerLoad = async ({ locals, params }) => {
	const canRead = await locals.can('enrollments:read');
	const canUpdate = await locals.can('enrollments:update');
	if (!canRead && !canUpdate) {
		throw error(403, 'No autorizado');
	}

	const enrollmentCode = params.enrollmentCode?.trim() ?? '';
	if (!enrollmentCode || !isUuid(enrollmentCode)) {
		throw error(404, 'Matrícula no encontrada');
	}

	const enrollment = await EducationRepository.findEnrollmentOverviewByCode(
		locals.db,
		enrollmentCode
	);
	if (!enrollment) {
		throw error(404, 'Matrícula no encontrada');
	}

	const workspaceBranch = getWorkspaceBranchUuid(locals.user);
	if (!workspaceBranch) {
		return {
			title: 'Editar matrícula',
			noBranch: true,
			enrollment,
			student: null,
			cycles: [],
			cycleDegreeOptions: []
		};
	}

	const [cycles, cycleDegreeOptions] = await Promise.all([
		EducationRepository.listCycleOptions(locals.db, { branchCode: workspaceBranch }),
		EducationRepository.listCycleDegreeOptions(locals.db, { branchCode: workspaceBranch })
	]);

	const student = await EducationRepository.findStudentByCode(locals.db, enrollment.student_code);

	return {
		title: 'Editar matrícula',
		noBranch: false,
		enrollment,
		student,
		cycles,
		cycleDegreeOptions
	};
};

export const actions: Actions = {
	default: async (event) => handleEnrollmentUpdate(event),
	delete: async (event) => handleEnrollmentDelete(event)
};
