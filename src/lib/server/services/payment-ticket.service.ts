import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Database } from '$lib/database';
import { CashboxRepository } from '$lib/server/repositories/cashbox.repository';
import { formatEducationCurrency, formatEducationDate } from '$lib/utils';

const PT_PER_MM = 72 / 25.4;
const TICKET_WIDTH = 80 * PT_PER_MM;
const H_PADDING = 16;
const SMALL_FONT = 8;
const BASE_FONT = 9;
const TITLE_FONT = 13;
const LINE_GAP = 10;

const COLORS = {
	text: rgb(0.1, 0.12, 0.16),
	muted: rgb(0.42, 0.45, 0.5),
	border: rgb(0.84, 0.86, 0.9),
	accent: rgb(0.12, 0.32, 0.69),
	success: rgb(0.12, 0.62, 0.31),
	danger: rgb(0.79, 0.15, 0.15)
} as const;

interface TicketItemLayout {
	labelLines: string[];
	detailLines: string[];
	amountText: string;
	height: number;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
	const normalized = text.trim();
	if (!normalized) {
		return [];
	}

	const words = normalized.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let currentLine = '';

	for (const word of words) {
		const candidate = currentLine ? `${currentLine} ${word}` : word;
		if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
			currentLine = candidate;
			continue;
		}

		if (currentLine) {
			lines.push(currentLine);
		}

		currentLine = word;
	}

	if (currentLine) {
		lines.push(currentLine);
	}

	return lines;
}

function drawDivider(page: PDFPage, y: number): void {
	page.drawLine({
		start: { x: H_PADDING, y },
		end: { x: TICKET_WIDTH - H_PADDING, y },
		thickness: 0.6,
		color: COLORS.border
	});
}

function measureItemLayout(
	label: string,
	detail: string | null,
	amountText: string,
	font: PDFFont,
	boldFont: PDFFont
): TicketItemLayout {
	const labelLines = wrapText(label, boldFont, BASE_FONT, TICKET_WIDTH - H_PADDING * 2 - 70);
	const detailLines = detail
		? wrapText(detail, font, SMALL_FONT, TICKET_WIDTH - H_PADDING * 2 - 70)
		: [];
	const lineCount = Math.max(labelLines.length + detailLines.length, 1);

	return {
		labelLines,
		detailLines,
		amountText,
		height: lineCount * LINE_GAP + 6
	};
}

export async function generatePaymentTicketPdf(db: Database, paymentCode: string): Promise<Buffer> {
	const payment = await CashboxRepository.findPaymentByCode(db, paymentCode);
	if (!payment) {
		throw new Error('Ingreso no encontrado');
	}

	const pdf = await PDFDocument.create();
	const font = await pdf.embedFont(StandardFonts.Helvetica);
	const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

	const payerLines = wrapText(
		payment.payer_full_name,
		boldFont,
		BASE_FONT,
		TICKET_WIDTH - H_PADDING * 2
	);
	const observationLines = payment.observation
		? wrapText(payment.observation, font, SMALL_FONT, TICKET_WIDTH - H_PADDING * 2)
		: [];
	const generatedByText = payment.registered_by_full_name?.trim() || 'Usuario no disponible';
	const generatedByLines = wrapText(
		`Generado por: ${generatedByText}`,
		font,
		SMALL_FONT,
		TICKET_WIDTH - H_PADDING * 2
	);
	const itemLayouts = payment.items.map((item) =>
		measureItemLayout(
			item.concept_label,
			item.detail,
			formatEducationCurrency(item.amount),
			font,
			boldFont
		)
	);

	const itemsHeight = itemLayouts.reduce((sum, item) => sum + item.height, 0);
	const observationHeight =
		observationLines.length > 0 ? observationLines.length * LINE_GAP + 14 : 0;
	const studentMetaHeight = payment.student_code ? 18 : 0;
	const totalHeight =
		192 + itemsHeight + observationHeight + studentMetaHeight + generatedByLines.length * LINE_GAP;

	const page = pdf.addPage([TICKET_WIDTH, totalHeight]);
	let cursorY = totalHeight - 18;

	const brandText = 'COEDULA';
	const brandWidth = boldFont.widthOfTextAtSize(brandText, TITLE_FONT);
	page.drawText(brandText, {
		x: (TICKET_WIDTH - brandWidth) / 2,
		y: cursorY,
		font: boldFont,
		size: TITLE_FONT,
		color: COLORS.accent
	});
	cursorY -= 14;

	const subtitle = 'Ticket de ingreso';
	const subtitleWidth = boldFont.widthOfTextAtSize(subtitle, SMALL_FONT);
	page.drawText(subtitle, {
		x: (TICKET_WIDTH - subtitleWidth) / 2,
		y: cursorY,
		font: boldFont,
		size: SMALL_FONT,
		color: COLORS.danger
	});
	cursorY -= 14;

	page.drawText(payment.payment_number, {
		x: H_PADDING,
		y: cursorY,
		font: boldFont,
		size: BASE_FONT,
		color: COLORS.text
	});
	page.drawText(formatEducationDate(payment.payment_date), {
		x:
			TICKET_WIDTH -
			H_PADDING -
			font.widthOfTextAtSize(formatEducationDate(payment.payment_date), BASE_FONT),
		y: cursorY,
		font,
		size: BASE_FONT,
		color: COLORS.text
	});
	cursorY -= 10;
	drawDivider(page, cursorY);
	cursorY -= 14;

	page.drawText('Pagador', {
		x: H_PADDING,
		y: cursorY,
		font,
		size: SMALL_FONT,
		color: COLORS.muted
	});
	cursorY -= 12;

	for (const line of payerLines) {
		page.drawText(line, {
			x: H_PADDING,
			y: cursorY,
			font: boldFont,
			size: BASE_FONT,
			color: COLORS.text
		});
		cursorY -= LINE_GAP;
	}

	if (payment.student_code) {
		const studentMeta = `Alumno vinculado${payment.student_number ? ` · ${payment.student_number}` : ''}`;
		page.drawText(studentMeta, {
			x: H_PADDING,
			y: cursorY,
			font,
			size: SMALL_FONT,
			color: COLORS.muted
		});
		cursorY -= 12;
	}

	for (const line of generatedByLines) {
		page.drawText(line, {
			x: H_PADDING,
			y: cursorY,
			font,
			size: SMALL_FONT,
			color: COLORS.muted
		});
		cursorY -= LINE_GAP;
	}

	drawDivider(page, cursorY);
	cursorY -= 14;

	page.drawText('Conceptos', {
		x: H_PADDING,
		y: cursorY,
		font: boldFont,
		size: BASE_FONT,
		color: COLORS.text
	});
	cursorY -= 12;

	for (const item of itemLayouts) {
		let itemCursorY = cursorY;
		for (const line of item.labelLines) {
			page.drawText(line, {
				x: H_PADDING,
				y: itemCursorY,
				font: boldFont,
				size: BASE_FONT,
				color: COLORS.text
			});
			itemCursorY -= LINE_GAP;
		}

		for (const line of item.detailLines) {
			page.drawText(line, {
				x: H_PADDING,
				y: itemCursorY,
				font,
				size: SMALL_FONT,
				color: COLORS.muted
			});
			itemCursorY -= LINE_GAP;
		}

		page.drawText(item.amountText, {
			x: TICKET_WIDTH - H_PADDING - boldFont.widthOfTextAtSize(item.amountText, BASE_FONT),
			y: cursorY,
			font: boldFont,
			size: BASE_FONT,
			color: COLORS.text
		});

		cursorY -= item.height;
	}

	drawDivider(page, cursorY + 4);
	cursorY -= 10;

	page.drawText('Total', {
		x: H_PADDING,
		y: cursorY,
		font: boldFont,
		size: BASE_FONT,
		color: COLORS.text
	});
	const totalText = formatEducationCurrency(payment.total_amount);
	page.drawText(totalText, {
		x: TICKET_WIDTH - H_PADDING - boldFont.widthOfTextAtSize(totalText, 11),
		y: cursorY,
		font: boldFont,
		size: 11,
		color: payment.status === 'voided' ? COLORS.danger : COLORS.success
	});
	cursorY -= 18;

	if (observationLines.length > 0) {
		page.drawText('Observación', {
			x: H_PADDING,
			y: cursorY,
			font: boldFont,
			size: SMALL_FONT,
			color: COLORS.text
		});
		cursorY -= 12;

		for (const line of observationLines) {
			page.drawText(line, {
				x: H_PADDING,
				y: cursorY,
				font,
				size: SMALL_FONT,
				color: COLORS.muted
			});
			cursorY -= LINE_GAP;
		}
	}

	if (payment.status === 'voided') {
		cursorY -= 6;
		drawDivider(page, cursorY);
		cursorY -= 14;
		const voidText = 'COMPROBANTE ANULADO';
		page.drawText(voidText, {
			x: (TICKET_WIDTH - boldFont.widthOfTextAtSize(voidText, BASE_FONT)) / 2,
			y: cursorY,
			font: boldFont,
			size: BASE_FONT,
			color: COLORS.danger
		});
		cursorY -= 12;
	}

	drawDivider(page, cursorY);
	cursorY -= 14;
	const footerText = 'Gracias por su pago';
	page.drawText(footerText, {
		x: (TICKET_WIDTH - font.widthOfTextAtSize(footerText, SMALL_FONT)) / 2,
		y: cursorY,
		font,
		size: SMALL_FONT,
		color: COLORS.muted
	});

	return Buffer.from(await pdf.save());
}
