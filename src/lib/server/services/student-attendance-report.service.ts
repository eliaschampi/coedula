import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Database } from '$lib/database';
import type { AttendanceOverviewItem } from '$lib/types/attendance';
import type { EnrollmentOverview, EnrollmentTurn, StudentOverview } from '$lib/types/education';
import { AttendanceRepository } from '$lib/server/repositories/attendance.repository';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import {
	formatAttendanceState,
	formatAttendanceTime,
	summarizeAttendance
} from '$lib/utils/attendance';
import { formatEducationDate, formatEnrollmentTurn, formatGroupCode } from '$lib/utils/education';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const FOOTER_HEIGHT = 28;
const TABLE_HEADER_HEIGHT = 24;
const TABLE_LINE_HEIGHT = 11;

const COLORS = {
	primary: rgb(0.1176, 0.251, 0.6863),
	accent: rgb(0.9843, 0.4431, 0.5216),
	text: rgb(0.102, 0.121, 0.18),
	muted: rgb(0.4, 0.45, 0.55),
	border: rgb(0.86, 0.89, 0.93),
	surface: rgb(0.965, 0.975, 0.99),
	white: rgb(1, 1, 1),
	success: rgb(0.133, 0.773, 0.369),
	warning: rgb(0.961, 0.62, 0.043),
	danger: rgb(0.937, 0.267, 0.267),
	info: rgb(0.231, 0.51, 0.965),
	secondary: rgb(0.43, 0.48, 0.56)
} as const;

interface StudentAttendanceReportFilters {
	fromDate: string;
	toDate: string;
	requestedTurn: EnrollmentTurn | null;
}

interface ReportContext {
	student: StudentOverview;
	records: AttendanceOverviewItem[];
	fromDate: string;
	toDate: string;
	selectedTurn: EnrollmentTurn;
	enrollmentLines: string[];
}

interface LayoutState {
	page: PDFPage;
	cursorY: number;
	pageNumber: number;
}

interface TableRowContent {
	dateLines: string[];
	stateLines: string[];
	timeLines: string[];
	enrollmentLines: string[];
	detailLines: string[];
	rowHeight: number;
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
	const trimmed = text.trim();
	if (!trimmed) {
		return ['—'];
	}

	const paragraphs = trimmed.split('\n');
	const lines: string[] = [];

	for (const paragraph of paragraphs) {
		const words = paragraph.trim().split(/\s+/).filter(Boolean);

		if (words.length === 0) {
			lines.push('—');
			continue;
		}

		let currentLine = '';

		for (const word of words) {
			const candidate = currentLine ? `${currentLine} ${word}` : word;

			if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
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
	}

	return lines.length > 0 ? lines : ['—'];
}

function getAttendanceColor(state: AttendanceOverviewItem['attendance_state']) {
	if (state === 'presente') return COLORS.success;
	if (state === 'tarde') return COLORS.warning;
	if (state === 'falta') return COLORS.danger;
	if (state === 'justificado') return COLORS.info;
	return COLORS.secondary;
}

function buildEnrollmentLines(
	records: AttendanceOverviewItem[],
	enrollments: EnrollmentOverview[],
	selectedTurn: EnrollmentTurn
): string[] {
	const recordLines = Array.from(
		new Map(
			records.map((record) => [
				record.enrollment_code,
				`${record.enrollment_number} · ${record.cycle_title} · ${record.degree_name} · ${formatGroupCode(record.group_code)}`
			])
		).values()
	);

	if (recordLines.length > 0) {
		return recordLines;
	}

	const preferredEnrollment =
		enrollments.find((item) => item.status === 'active' && item.turn === selectedTurn) ??
		enrollments.find((item) => item.turn === selectedTurn) ??
		enrollments.find((item) => item.status === 'active') ??
		enrollments[0];

	if (!preferredEnrollment) {
		return ['Sin matrícula registrada'];
	}

	return [
		`${preferredEnrollment.enrollment_number} · ${preferredEnrollment.cycle_title} · ${preferredEnrollment.degree_name} · ${formatGroupCode(preferredEnrollment.group_code)}`
	];
}

async function resolveReportContext(
	db: Database,
	studentCode: string,
	filters: StudentAttendanceReportFilters
): Promise<ReportContext> {
	const student = await EducationRepository.findStudentByCode(db, studentCode);
	if (!student) {
		throw new Error('Alumno no encontrado');
	}

	const [allRecords, enrollments] = await Promise.all([
		AttendanceRepository.listByStudentAndRange(db, studentCode, filters.fromDate, filters.toDate),
		EducationRepository.listStudentEnrollmentHistory(db, studentCode)
	]);

	const availableTurns = Array.from(
		new Set(allRecords.map((record) => record.turn))
	) as EnrollmentTurn[];
	const selectedTurn =
		filters.requestedTurn && availableTurns.includes(filters.requestedTurn)
			? filters.requestedTurn
			: (availableTurns[0] ?? 'turn_1');

	const records = allRecords.filter((record) => record.turn === selectedTurn);
	const enrollmentLines = buildEnrollmentLines(records, enrollments, selectedTurn);

	return {
		student,
		records,
		fromDate: filters.fromDate,
		toDate: filters.toDate,
		selectedTurn,
		enrollmentLines
	};
}

function drawPageNumber(page: PDFPage, pageNumber: number, font: PDFFont): void {
	page.drawText(`Página ${pageNumber}`, {
		x: PAGE_WIDTH - PAGE_MARGIN - 48,
		y: 16,
		font,
		size: 9,
		color: COLORS.muted
	});
}

function createLayout(pdf: PDFDocument, font: PDFFont): LayoutState {
	const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
	drawPageNumber(page, pdf.getPageCount(), font);

	return {
		page,
		cursorY: PAGE_HEIGHT - PAGE_MARGIN,
		pageNumber: pdf.getPageCount()
	};
}

function createNextPage(pdf: PDFDocument, font: PDFFont): LayoutState {
	const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
	drawPageNumber(page, pdf.getPageCount(), font);

	return {
		page,
		cursorY: PAGE_HEIGHT - PAGE_MARGIN,
		pageNumber: pdf.getPageCount()
	};
}

function ensureSpace(
	pdf: PDFDocument,
	layout: LayoutState,
	font: PDFFont,
	requiredHeight: number
): LayoutState {
	if (layout.cursorY - requiredHeight >= PAGE_MARGIN + FOOTER_HEIGHT) {
		return layout;
	}

	return createNextPage(pdf, font);
}

function drawMetricCard(
	page: PDFPage,
	font: PDFFont,
	boldFont: PDFFont,
	input: {
		x: number;
		y: number;
		width: number;
		title: string;
		value: string;
		color: (typeof COLORS)[keyof typeof COLORS];
	}
): void {
	page.drawRectangle({
		x: input.x,
		y: input.y,
		width: input.width,
		height: 52,
		color: COLORS.surface,
		borderColor: COLORS.border,
		borderWidth: 1
	});

	page.drawText(input.title, {
		x: input.x + 12,
		y: input.y + 34,
		font,
		size: 9,
		color: COLORS.muted
	});

	page.drawText(input.value, {
		x: input.x + 12,
		y: input.y + 14,
		font: boldFont,
		size: 16,
		color: input.color
	});
}

function drawTableHeader(page: PDFPage, boldFont: PDFFont, topY: number): number {
	const headerY = topY - TABLE_HEADER_HEIGHT;

	page.drawRectangle({
		x: PAGE_MARGIN,
		y: headerY,
		width: CONTENT_WIDTH,
		height: TABLE_HEADER_HEIGHT,
		color: COLORS.primary
	});

	const columns = [
		{ label: 'Fecha', x: PAGE_MARGIN + 10 },
		{ label: 'Estado', x: PAGE_MARGIN + 84 },
		{ label: 'Ingreso', x: PAGE_MARGIN + 160 },
		{ label: 'Matrícula', x: PAGE_MARGIN + 220 },
		{ label: 'Detalle', x: PAGE_MARGIN + 310 }
	];

	for (const column of columns) {
		page.drawText(column.label, {
			x: column.x,
			y: headerY + 8,
			font: boldFont,
			size: 9,
			color: COLORS.white
		});
	}

	return headerY - 8;
}

function drawTableRow(
	page: PDFPage,
	font: PDFFont,
	boldFont: PDFFont,
	record: AttendanceOverviewItem,
	content: TableRowContent,
	topY: number
): number {
	const { dateLines, stateLines, timeLines, enrollmentLines, detailLines, rowHeight } = content;
	const rowBottomY = topY - rowHeight;

	page.drawRectangle({
		x: PAGE_MARGIN,
		y: rowBottomY,
		width: CONTENT_WIDTH,
		height: rowHeight,
		color: COLORS.white,
		borderColor: COLORS.border,
		borderWidth: 1
	});

	const columns = [
		{ x: PAGE_MARGIN + 10, lines: dateLines, font },
		{
			x: PAGE_MARGIN + 84,
			lines: stateLines,
			font: boldFont,
			color: getAttendanceColor(record.attendance_state)
		},
		{ x: PAGE_MARGIN + 160, lines: timeLines, font },
		{ x: PAGE_MARGIN + 220, lines: enrollmentLines, font },
		{ x: PAGE_MARGIN + 310, lines: detailLines, font }
	];

	for (const column of columns) {
		column.lines.forEach((line, index) => {
			page.drawText(line, {
				x: column.x,
				y: topY - 16 - index * TABLE_LINE_HEIGHT,
				font: column.font,
				size: 9,
				color: column.color ?? COLORS.text
			});
		});
	}

	return rowBottomY - 6;
}

function buildTableRowContent(
	font: PDFFont,
	boldFont: PDFFont,
	record: AttendanceOverviewItem
): TableRowContent {
	const detailText = `${record.cycle_title} · ${record.degree_name} · ${formatGroupCode(record.group_code)}${
		record.attendance_observation ? `\nObs: ${record.attendance_observation}` : ''
	}`;

	const dateLines = wrapText(formatEducationDate(record.attendance_date), font, 9, 60);
	const stateLines = wrapText(formatAttendanceState(record.attendance_state), boldFont, 9, 68);
	const timeLines = wrapText(formatAttendanceTime(record.attendance_entry_time), font, 9, 50);
	const enrollmentLines = wrapText(
		`${record.enrollment_number} · Lista ${record.roll_code}`,
		font,
		9,
		82
	);
	const detailLines = wrapText(detailText, font, 9, 240);
	const maxLineCount = Math.max(
		dateLines.length,
		stateLines.length,
		timeLines.length,
		enrollmentLines.length,
		detailLines.length
	);

	return {
		dateLines,
		stateLines,
		timeLines,
		enrollmentLines,
		detailLines,
		rowHeight: Math.max(28, maxLineCount * TABLE_LINE_HEIGHT + 10)
	};
}

export async function generateStudentAttendanceReportPdf(
	db: Database,
	studentCode: string,
	filters: StudentAttendanceReportFilters
): Promise<Buffer> {
	const context = await resolveReportContext(db, studentCode, filters);
	const summary = summarizeAttendance(context.records);

	const pdf = await PDFDocument.create();
	const [font, boldFont] = await Promise.all([
		pdf.embedFont(StandardFonts.Helvetica),
		pdf.embedFont(StandardFonts.HelveticaBold)
	]);

	let layout = createLayout(pdf, font);

	layout.page.drawRectangle({
		x: PAGE_MARGIN,
		y: layout.cursorY - 86,
		width: CONTENT_WIDTH,
		height: 86,
		color: COLORS.primary
	});

	layout.page.drawText('Reporte de asistencia', {
		x: PAGE_MARGIN + 18,
		y: layout.cursorY - 28,
		font: boldFont,
		size: 20,
		color: COLORS.white
	});

	layout.page.drawText(context.student.full_name, {
		x: PAGE_MARGIN + 18,
		y: layout.cursorY - 54,
		font: boldFont,
		size: 14,
		color: COLORS.white
	});

	layout.page.drawText(
		`${context.student.student_number} · ${context.student.dni?.trim() || 'Sin DNI'} · ${formatEnrollmentTurn(context.selectedTurn)}`,
		{
			x: PAGE_MARGIN + 18,
			y: layout.cursorY - 72,
			font,
			size: 10,
			color: COLORS.white
		}
	);

	layout.cursorY -= 106;

	layout.page.drawText('Resumen del reporte', {
		x: PAGE_MARGIN,
		y: layout.cursorY,
		font: boldFont,
		size: 12,
		color: COLORS.text
	});

	layout.cursorY -= 12;

	const infoBoxHeight = 78;
	layout.page.drawRectangle({
		x: PAGE_MARGIN,
		y: layout.cursorY - infoBoxHeight,
		width: CONTENT_WIDTH,
		height: infoBoxHeight,
		color: COLORS.surface,
		borderColor: COLORS.border,
		borderWidth: 1
	});

	layout.page.drawText('Rango', {
		x: PAGE_MARGIN + 14,
		y: layout.cursorY - 20,
		font,
		size: 9,
		color: COLORS.muted
	});
	layout.page.drawText(
		`${formatEducationDate(context.fromDate)} - ${formatEducationDate(context.toDate)}`,
		{
			x: PAGE_MARGIN + 14,
			y: layout.cursorY - 36,
			font: boldFont,
			size: 10,
			color: COLORS.text
		}
	);

	layout.page.drawText('Generado', {
		x: PAGE_MARGIN + 220,
		y: layout.cursorY - 20,
		font,
		size: 9,
		color: COLORS.muted
	});
	layout.page.drawText(formatEducationDate(new Date()), {
		x: PAGE_MARGIN + 220,
		y: layout.cursorY - 36,
		font: boldFont,
		size: 10,
		color: COLORS.text
	});

	layout.page.drawText('Matrícula', {
		x: PAGE_MARGIN + 14,
		y: layout.cursorY - 54,
		font,
		size: 9,
		color: COLORS.muted
	});

	const enrollmentDisplayLines = context.enrollmentLines
		.slice(0, 3)
		.flatMap((line) => wrapText(line, font, 9, CONTENT_WIDTH - 28));
	if (context.enrollmentLines.length > 3) {
		enrollmentDisplayLines.push(
			`+${context.enrollmentLines.length - 3} matrícula(s) adicional(es)`
		);
	}

	enrollmentDisplayLines.slice(0, 2).forEach((line, index) => {
		layout.page.drawText(line, {
			x: PAGE_MARGIN + 14,
			y: layout.cursorY - 68 - index * 11,
			font,
			size: 9,
			color: COLORS.text
		});
	});

	layout.cursorY -= infoBoxHeight + 18;

	const cardWidth = (CONTENT_WIDTH - 18) / 4;
	drawMetricCard(layout.page, font, boldFont, {
		x: PAGE_MARGIN,
		y: layout.cursorY - 52,
		width: cardWidth,
		title: 'Registros',
		value: String(summary.total),
		color: COLORS.primary
	});
	drawMetricCard(layout.page, font, boldFont, {
		x: PAGE_MARGIN + cardWidth + 6,
		y: layout.cursorY - 52,
		width: cardWidth,
		title: 'Presentes',
		value: String(summary.present),
		color: COLORS.success
	});
	drawMetricCard(layout.page, font, boldFont, {
		x: PAGE_MARGIN + (cardWidth + 6) * 2,
		y: layout.cursorY - 52,
		width: cardWidth,
		title: 'Tardes',
		value: String(summary.late),
		color: COLORS.warning
	});
	drawMetricCard(layout.page, font, boldFont, {
		x: PAGE_MARGIN + (cardWidth + 6) * 3,
		y: layout.cursorY - 52,
		width: cardWidth,
		title: 'Incidencias',
		value: String(summary.incidents),
		color: COLORS.accent
	});

	layout.cursorY -= 72;

	layout.page.drawText('Detalle de asistencias', {
		x: PAGE_MARGIN,
		y: layout.cursorY,
		font: boldFont,
		size: 12,
		color: COLORS.text
	});

	layout.cursorY -= 14;

	if (context.records.length === 0) {
		layout.page.drawRectangle({
			x: PAGE_MARGIN,
			y: layout.cursorY - 68,
			width: CONTENT_WIDTH,
			height: 68,
			color: COLORS.surface,
			borderColor: COLORS.border,
			borderWidth: 1
		});

		layout.page.drawText('No se encontraron asistencias en el rango seleccionado.', {
			x: PAGE_MARGIN + 16,
			y: layout.cursorY - 30,
			font: boldFont,
			size: 11,
			color: COLORS.text
		});
		layout.page.drawText('Ajusta las fechas o el turno para generar otro reporte.', {
			x: PAGE_MARGIN + 16,
			y: layout.cursorY - 46,
			font,
			size: 9,
			color: COLORS.muted
		});
	} else {
		layout.cursorY = drawTableHeader(layout.page, boldFont, layout.cursorY);

		for (const record of context.records) {
			const rowContent = buildTableRowContent(font, boldFont, record);
			layout = ensureSpace(pdf, layout, font, rowContent.rowHeight + 12);

			if (layout.cursorY > PAGE_HEIGHT - PAGE_MARGIN - 1) {
				layout.cursorY = drawTableHeader(layout.page, boldFont, layout.cursorY);
			} else if (layout.cursorY < PAGE_MARGIN + FOOTER_HEIGHT + rowContent.rowHeight + 12) {
				layout = createNextPage(pdf, font);
				layout.cursorY = drawTableHeader(layout.page, boldFont, layout.cursorY);
			}

			layout.cursorY = drawTableRow(
				layout.page,
				font,
				boldFont,
				record,
				rowContent,
				layout.cursorY
			);
		}
	}

	return Buffer.from(await pdf.save());
}
