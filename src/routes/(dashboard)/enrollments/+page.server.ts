import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { readFormField } from '$lib/utils/formData';
import { isUuid } from '$lib/utils/validation';
import { EducationRepository } from '$lib/server/repositories/education.repository';

const VALID_TURNS = new Set(['turn_1', 'turn_2', 'both']);
const VALID_STATUSES = new Set(['active', 'finalized', 'inactive']);
const VALID_GROUPS = new Set(['A', 'B', 'C', 'D']);

function parseMoney(value: string): number | null {
	if (!value) return null;
	const parsed = Number.parseFloat(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error('El costo a pagar debe ser un monto válido mayor o igual a 0');
	}
	return parsed;
}

export const load: PageServerLoad = async ({ locals, depends, url }) => {
	depends('enrollments:load');

	if (!(await locals.can('enrollments:read'))) {
		return {
			title: 'Matrículas',
			enrollments: [],
			cycles: [],
			cycleDegreeOptions: [],
			selectedCycleCode: null,
			selectedCycleDegreeCode: null,
			selectedGroupCode: 'A',
			searchQuery: ''
		};
	}

	const requestedCycleCode = (url.searchParams.get('cycle') ?? '').trim();
	const requestedCycleDegreeCode = (url.searchParams.get('degree') ?? '').trim();
	const requestedGroupCode = (url.searchParams.get('group') ?? 'A').trim().toUpperCase();
	const searchQuery = (url.searchParams.get('search') ?? '').trim();

	const [cycles, allCycleDegreeOptions] = await Promise.all([
		EducationRepository.listCycleOptions(locals.db),
		EducationRepository.listCycleDegreeOptions(locals.db)
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
		selectedCycleCode && selectedCycleDegreeCode
			? await EducationRepository.listEnrollmentsByFilters(locals.db, {
					cycleCode: selectedCycleCode,
					cycleDegreeCode: selectedCycleDegreeCode,
					groupCode: selectedGroupCode as 'A' | 'B' | 'C' | 'D',
					search: searchQuery
				})
			: [];

	return {
		title: 'Matrículas',
		enrollments,
		cycles,
		cycleDegreeOptions: allCycleDegreeOptions,
		selectedCycleCode,
		selectedCycleDegreeCode,
		selectedGroupCode,
		searchQuery
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!(await locals.can('enrollments:create'))) {
			return fail(403, { error: 'No tienes permisos para crear matrículas' });
		}

		try {
			const formData = await request.formData();
			const studentCode = readFormField(formData, 'student_code');
			const cycleDegreeCode = readFormField(formData, 'cycle_degree_code');
			const payCost = parseMoney(readFormField(formData, 'pay_cost'));
			const turn = readFormField(formData, 'turn');
			const status = readFormField(formData, 'status');
			const groupCode = readFormField(formData, 'group_code');
			const observation = readFormField(formData, 'observation');

			if (!studentCode || !isUuid(studentCode)) {
				return fail(400, { error: 'Debe seleccionar un alumno válido' });
			}

			if (!cycleDegreeCode || !isUuid(cycleDegreeCode)) {
				return fail(400, { error: 'Debe seleccionar un grado válido dentro del ciclo' });
			}

			if (!VALID_TURNS.has(turn)) {
				return fail(400, { error: 'Debe seleccionar un turno válido' });
			}

			if (!VALID_STATUSES.has(status)) {
				return fail(400, { error: 'Debe seleccionar un estado válido' });
			}

			if (!VALID_GROUPS.has(groupCode)) {
				return fail(400, { error: 'Debe seleccionar un grupo válido' });
			}

			const createdEnrollment = await EducationRepository.createEnrollment(
				locals.db,
				EducationRepository.normalizeEnrollmentInput({
					studentCode,
					cycleDegreeCode,
					payCost,
					turn: turn as 'turn_1' | 'turn_2' | 'both',
					status: status as 'active' | 'finalized' | 'inactive',
					groupCode: groupCode as 'A' | 'B' | 'C' | 'D',
					observation
				})
			);

			return {
				success: true,
				type: 'success',
				enrollmentNumber: createdEnrollment.enrollment_number,
				rollCode: createdEnrollment.roll_code
			};
		} catch (error) {
			const dbError = error as { code?: string };
			if (dbError.code === '23505') {
				return fail(400, {
					error:
						'Ya existe una matrícula para este alumno en ese grado o el código de lista ya está ocupado'
				});
			}

			const message = error instanceof Error ? error.message : 'No se pudo crear la matrícula';
			return fail(400, { error: message });
		}
	},

	update: async ({ locals, request }) => {
		if (!(await locals.can('enrollments:update'))) {
			return fail(403, { error: 'No tienes permisos para actualizar matrículas' });
		}

		try {
			const formData = await request.formData();
			const enrollmentCode = readFormField(formData, 'code');
			const studentCode = readFormField(formData, 'student_code');
			const cycleDegreeCode = readFormField(formData, 'cycle_degree_code');
			const payCost = parseMoney(readFormField(formData, 'pay_cost'));
			const turn = readFormField(formData, 'turn');
			const status = readFormField(formData, 'status');
			const groupCode = readFormField(formData, 'group_code');
			const observation = readFormField(formData, 'observation');

			if (!enrollmentCode || !isUuid(enrollmentCode)) {
				return fail(400, { error: 'La matrícula seleccionada no es válida' });
			}

			if (!studentCode || !isUuid(studentCode)) {
				return fail(400, { error: 'Debe seleccionar un alumno válido' });
			}

			if (!cycleDegreeCode || !isUuid(cycleDegreeCode)) {
				return fail(400, { error: 'Debe seleccionar un grado válido dentro del ciclo' });
			}

			if (!VALID_TURNS.has(turn)) {
				return fail(400, { error: 'Debe seleccionar un turno válido' });
			}

			if (!VALID_STATUSES.has(status)) {
				return fail(400, { error: 'Debe seleccionar un estado válido' });
			}

			if (!VALID_GROUPS.has(groupCode)) {
				return fail(400, { error: 'Debe seleccionar un grupo válido' });
			}

			const updated = await EducationRepository.updateEnrollment(
				locals.db,
				EducationRepository.normalizeEnrollmentInput({
					enrollmentCode,
					studentCode,
					cycleDegreeCode,
					payCost,
					turn: turn as 'turn_1' | 'turn_2' | 'both',
					status: status as 'active' | 'finalized' | 'inactive',
					groupCode: groupCode as 'A' | 'B' | 'C' | 'D',
					observation
				})
			);

			if (!updated) {
				return fail(404, { error: 'La matrícula no fue encontrada' });
			}

			return { success: true, type: 'success' };
		} catch (error) {
			const dbError = error as { code?: string };
			if (dbError.code === '23505') {
				return fail(400, {
					error:
						'Ya existe una matrícula para este alumno en ese grado o el código de lista ya está ocupado'
				});
			}

			const message = error instanceof Error ? error.message : 'No se pudo actualizar la matrícula';
			return fail(400, { error: message });
		}
	},

	delete: async ({ locals, request }) => {
		if (!(await locals.can('enrollments:delete'))) {
			return fail(403, { error: 'No tienes permisos para eliminar matrículas' });
		}

		const formData = await request.formData();
		const enrollmentCode = readFormField(formData, 'code');

		if (!enrollmentCode || !isUuid(enrollmentCode)) {
			return fail(400, { error: 'La matrícula seleccionada no es válida' });
		}

		try {
			const deleted = await EducationRepository.deleteEnrollment(locals.db, enrollmentCode);

			if (!deleted) {
				return fail(404, { error: 'La matrícula no fue encontrada' });
			}

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'No se pudo eliminar la matrícula';
			return fail(400, { error: message });
		}
	}
};
