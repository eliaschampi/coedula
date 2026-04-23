import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generatePaymentTicketPdf } from '$lib/server/services/payment-ticket.service';
import { isUuid } from '$lib/utils/validation';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!(await locals.can('payments:read'))) {
		throw error(403, 'No tienes permisos para exportar tickets');
	}

	const paymentCode = (params.paymentCode ?? '').trim();
	if (!paymentCode || !isUuid(paymentCode)) {
		throw error(400, 'Ingreso inválido');
	}

	try {
		const pdfBuffer = await generatePaymentTicketPdf(locals.db, paymentCode);
		const body = Uint8Array.from(pdfBuffer);

		return new Response(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength), {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Length': pdfBuffer.length.toString(),
				'Content-Disposition': `inline; filename="ticket-${paymentCode}.pdf"`,
				'Cache-Control': 'private, no-store'
			}
		});
	} catch (caught) {
		const message = caught instanceof Error ? caught.message : 'No se pudo generar el ticket';
		throw error(message === 'Ingreso no encontrado' ? 404 : 409, message);
	}
};
