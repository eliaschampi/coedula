import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkAllPermissions } from '$lib/permissions/server';
import { generateStudentAttendanceReportPdf } from '$lib/server/services/student-attendance-report.service';
import { formatLocalDateValue, normalizeAttendanceTurnFilter } from '$lib/utils/attendance';
import { isUuid } from '$lib/utils/validation';

function normalizeDateFilter(value: string | null, fallback: string): string {
	const normalized = value?.trim() ?? '';
	return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : fallback;
}

function firstDayOfMonth(dateValue: string): string {
	return `${dateValue.slice(0, 8)}01`;
}

export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!(await checkAllPermissions(locals.can, 'students:read', 'attendance:read'))) {
		throw error(403, 'No tienes permisos para exportar asistencia');
	}

	const { studentCode } = params;
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

	try {
		const pdfBuffer = await generateStudentAttendanceReportPdf(locals.db, studentCode, {
			fromDate,
			toDate,
			requestedTurn
		});
		const body = Uint8Array.from(pdfBuffer);

		return new Response(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength), {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Length': pdfBuffer.length.toString(),
				'Content-Disposition': `inline; filename="asistencia-${studentCode}.pdf"`,
				'Cache-Control': 'private, no-store'
			}
		});
	} catch (caught) {
		const message =
			caught instanceof Error ? caught.message : 'No se pudo generar el reporte de asistencia';
		throw error(message === 'Alumno no encontrado' ? 404 : 409, message);
	}
};
