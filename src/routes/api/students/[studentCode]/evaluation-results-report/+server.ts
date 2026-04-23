import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkAllPermissions } from '$lib/permissions/server';
import { generateStudentEvaluationReportPdf } from '$lib/server/services/student-evaluation-report.service';
import { isUuid } from '$lib/utils/validation';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!(await checkAllPermissions(locals.can, 'students:read', 'evaluations:read'))) {
		throw error(403, 'No tienes permisos para exportar resultados del alumno');
	}

	const studentCode = params.studentCode?.trim() ?? '';

	if (!studentCode || !isUuid(studentCode)) {
		throw error(400, 'Alumno inválido');
	}

	try {
		const pdfBuffer = await generateStudentEvaluationReportPdf(locals.db, studentCode);
		const body = Uint8Array.from(pdfBuffer);

		return new Response(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength), {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Length': pdfBuffer.length.toString(),
				'Content-Disposition': `inline; filename="resultados-${studentCode}.pdf"`,
				'Cache-Control': 'private, no-store'
			}
		});
	} catch (caught) {
		const message =
			caught instanceof Error ? caught.message : 'No se pudo generar el reporte de resultados';
		throw error(
			message === 'Alumno no encontrado'
				? 404
				: message === 'No existen resultados guardados para el alumno'
					? 409
					: 500,
			message
		);
	}
};
