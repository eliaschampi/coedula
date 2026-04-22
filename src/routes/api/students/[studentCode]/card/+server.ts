import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkAllPermissions } from '$lib/permissions/server';
import { generateStudentCardPdf } from '$lib/server/services/student-card.service';
import { isUuid } from '$lib/utils/validation';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!(await checkAllPermissions(locals.can, 'students:read', 'enrollments:read'))) {
		throw error(403, 'No tienes permisos para generar carnets');
	}

	const { studentCode } = params;
	if (!studentCode || !isUuid(studentCode)) {
		throw error(400, 'Alumno inválido');
	}

	try {
		const pdfBuffer = await generateStudentCardPdf(locals.db, studentCode);
		const body = Uint8Array.from(pdfBuffer);

		return new Response(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength), {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Length': pdfBuffer.length.toString(),
				'Content-Disposition': `inline; filename="carnet-${studentCode}.pdf"`,
				'Cache-Control': 'private, no-store'
			}
		});
	} catch (caught) {
		const message = caught instanceof Error ? caught.message : 'No se pudo generar el carnet';
		throw error(message === 'Alumno no encontrado' ? 404 : 409, message);
	}
};
