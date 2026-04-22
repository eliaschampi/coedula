import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isUuid } from '$lib/utils/validation';
import { formatLocalDateValue, normalizeAttendanceTurnFilter } from '$lib/utils';
import type { EnrollmentTurn } from '$lib/types/education';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import { AttendanceRepository } from '$lib/server/repositories/attendance.repository';

function normalizeDateFilter(value: string | null, fallback: string): string {
	const normalized = value?.trim() ?? '';
	return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : fallback;
}

function firstDayOfMonth(dateValue: string): string {
	return `${dateValue.slice(0, 8)}01`;
}

export const load: PageServerLoad = async ({ params, locals, url, depends }) => {
	depends('student:attendance');

	if (!(await locals.can('attendance:read'))) {
		throw error(403, 'No tienes permisos para consultar asistencia');
	}

	const studentCode = (params.studentCode || '').trim();
	if (!studentCode || !isUuid(studentCode)) {
		throw error(400, 'Alumno inválido');
	}

	const today = formatLocalDateValue();
	let fromDate = normalizeDateFilter(url.searchParams.get('from'), firstDayOfMonth(today));
	let toDate = normalizeDateFilter(url.searchParams.get('to'), today);
	const requestedTurn = normalizeAttendanceTurnFilter(url.searchParams.get('turn'));

	if (fromDate > toDate) {
		[fromDate, toDate] = [toDate, fromDate];
	}

	const student = await EducationRepository.findStudentByCode(locals.db, studentCode);
	if (!student) {
		throw error(404, 'Alumno no encontrado');
	}

	const allRecords = await AttendanceRepository.listByStudentAndRange(
		locals.db,
		studentCode,
		fromDate,
		toDate
	);
	const availableTurns = Array.from(
		new Set(allRecords.map((record) => record.turn))
	) as EnrollmentTurn[];
	const selectedTurn =
		requestedTurn && availableTurns.includes(requestedTurn)
			? requestedTurn
			: (availableTurns[0] ?? 'turn_1');
	const records = allRecords.filter((record) => record.turn === selectedTurn);

	return {
		title: `Asistencia · ${student.full_name}`,
		student,
		records,
		fromDate,
		toDate,
		selectedTurn
	};
};
