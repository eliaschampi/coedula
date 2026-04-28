import { fail, type RequestEvent } from '@sveltejs/kit';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import { readFormCheckbox, readFormField } from '$lib/utils/formData';
import { isUuid } from '$lib/utils/validation';
import type { EnrollmentTurn } from '$lib/types/education';

const VALID_TURNS = new Set<EnrollmentTurn>(['turn_1', 'turn_2', 'both']);
const VALID_GROUPS = new Set(['A', 'B', 'C', 'D']);

function parseMoney(value: string): number | null {
	if (!value) return null;
	const parsed = Number.parseFloat(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error('El costo a pagar debe ser un monto válido mayor o igual a 0');
	}
	return parsed;
}

function mapEnrollmentDbError(error: unknown): string | null {
	const dbError = error as { code?: string };
	if (dbError.code === '23505') {
		return 'Ya existe una matrícula activa para este alumno, o el código de lista ya está ocupado';
	}
	return null;
}

export async function handleEnrollmentCreate(event: RequestEvent) {
	if (!(await event.locals.can('enrollments:create'))) {
		return fail(403, { error: 'No tienes permisos para crear matrículas' });
	}

	try {
		const formData = await event.request.formData();
		const studentCode = readFormField(formData, 'student_code');
		const cycleDegreeCode = readFormField(formData, 'cycle_degree_code');
		const payCost = parseMoney(readFormField(formData, 'pay_cost'));
		const turn = readFormField(formData, 'turn');
		const isActive = readFormCheckbox(formData, 'is_active');
		const groupCode = readFormField(formData, 'group_code');
		const observation = readFormField(formData, 'observation');

		if (!studentCode || !isUuid(studentCode)) {
			return fail(400, { error: 'Debe seleccionar un alumno válido' });
		}

		if (!cycleDegreeCode || !isUuid(cycleDegreeCode)) {
			return fail(400, { error: 'Debe seleccionar un grado válido dentro del ciclo' });
		}

		if (!VALID_TURNS.has(turn as EnrollmentTurn)) {
			return fail(400, { error: 'Debe seleccionar un turno válido' });
		}

		if (!VALID_GROUPS.has(groupCode)) {
			return fail(400, { error: 'Debe seleccionar un grupo válido' });
		}

		const createdEnrollment = await EducationRepository.createEnrollment(
			event.locals.db,
			EducationRepository.normalizeEnrollmentInput({
				studentCode,
				cycleDegreeCode,
				payCost,
				turn: turn as EnrollmentTurn,
				isActive,
				groupCode: groupCode as 'A' | 'B' | 'C' | 'D',
				observation
			})
		);

		return {
			success: true,
			enrollmentNumber: createdEnrollment.enrollment_number,
			rollCode: createdEnrollment.roll_code
		};
	} catch (error) {
		const mapped = mapEnrollmentDbError(error);
		if (mapped) return fail(400, { error: mapped });
		const message = error instanceof Error ? error.message : 'No se pudo crear la matrícula';
		return fail(400, { error: message });
	}
}

export async function handleEnrollmentUpdate(event: RequestEvent) {
	if (!(await event.locals.can('enrollments:update'))) {
		return fail(403, { error: 'No tienes permisos para actualizar matrículas' });
	}

	try {
		const formData = await event.request.formData();
		const enrollmentCode = readFormField(formData, 'code');
		const studentCode = readFormField(formData, 'student_code');
		const cycleDegreeCode = readFormField(formData, 'cycle_degree_code');
		const payCost = parseMoney(readFormField(formData, 'pay_cost'));
		const turn = readFormField(formData, 'turn');
		const isActive = readFormCheckbox(formData, 'is_active');
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

		if (!VALID_TURNS.has(turn as EnrollmentTurn)) {
			return fail(400, { error: 'Debe seleccionar un turno válido' });
		}

		if (!VALID_GROUPS.has(groupCode)) {
			return fail(400, { error: 'Debe seleccionar un grupo válido' });
		}

		const updated = await EducationRepository.updateEnrollment(
			event.locals.db,
			EducationRepository.normalizeEnrollmentInput({
				enrollmentCode,
				studentCode,
				cycleDegreeCode,
				payCost,
				turn: turn as EnrollmentTurn,
				isActive,
				groupCode: groupCode as 'A' | 'B' | 'C' | 'D',
				observation
			})
		);

		if (!updated) {
			return fail(404, { error: 'La matrícula no fue encontrada' });
		}

		return { success: true };
	} catch (error) {
		const mapped = mapEnrollmentDbError(error);
		if (mapped) return fail(400, { error: mapped });
		const message = error instanceof Error ? error.message : 'No se pudo actualizar la matrícula';
		return fail(400, { error: message });
	}
}

export async function handleEnrollmentDelete(event: RequestEvent) {
	if (!(await event.locals.can('enrollments:delete'))) {
		return fail(403, { error: 'No tienes permisos para eliminar matrículas' });
	}

	const formData = await event.request.formData();
	const enrollmentCode = readFormField(formData, 'code');

	if (!enrollmentCode || !isUuid(enrollmentCode)) {
		return fail(400, { error: 'La matrícula seleccionada no es válida' });
	}

	try {
		const deleted = await EducationRepository.deleteEnrollment(event.locals.db, enrollmentCode);

		if (!deleted) {
			return fail(404, { error: 'La matrícula no fue encontrada' });
		}

		return { success: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'No se pudo eliminar la matrícula';
		return fail(400, { error: message });
	}
}
