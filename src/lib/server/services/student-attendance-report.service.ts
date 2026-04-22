import { readFile } from 'fs/promises';
import { join } from 'path';
import {
	PDFDocument,
	StandardFonts,
	rgb,
	type PDFFont,
	type PDFImage,
	type PDFPage
} from 'pdf-lib';
import type { Database } from '$lib/database';
import type { AttendanceOverviewItem } from '$lib/types/attendance';
import type { EnrollmentOverview, EnrollmentTurn, StudentOverview } from '$lib/types/education';
import { AttendanceRepository } from '$lib/server/repositories/attendance.repository';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import { formatAttendanceState, formatAttendanceTime } from '$lib/utils/attendance';
import { formatEducationDate, formatGroupCode } from '$lib/utils/education';

const LETTERHEAD_PATH = join(process.cwd(), 'static', 'membrete.png');
const REPORT_TITLE = 'Constancia de asistencia';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const CONTENT_X = 48;
const CONTENT_WIDTH = PAGE_WIDTH - CONTENT_X * 2;
const TITLE_Y = 734;
const SUMMARY_CARD_TOP_Y = 708;
const NEXT_PAGE_TABLE_TOP_Y = 712;
const TABLE_BOTTOM_Y = 108;
const TABLE_HEADER_HEIGHT = 26;
const TABLE_FONT_SIZE = 9;
const TABLE_LINE_HEIGHT = 11;

const TABLE_COLUMNS = [
	{ label: 'Fecha', x: CONTENT_X, width: 90 },
	{ label: 'Estado', x: CONTENT_X + 90, width: 92 },
	{ label: 'Ingreso', x: CONTENT_X + 182, width: 76 },
	{ label: 'Observaciones', x: CONTENT_X + 258, width: CONTENT_WIDTH - 258 }
] as const;

const COLORS = {
	text: rgb(0.12, 0.13, 0.16),
	muted: rgb(0.43, 0.46, 0.52),
	border: rgb(0.85, 0.87, 0.9),
	panelBorder: rgb(0.88, 0.89, 0.92),
	surface: rgb(0.984, 0.986, 0.991),
	headerSurface: rgb(0.965, 0.967, 0.972),
	white: rgb(1, 1, 1),
	accent: rgb(0.84, 0.16, 0.12),
	success: rgb(0.12, 0.62, 0.31),
	warning: rgb(0.85, 0.55, 0.1),
	danger: rgb(0.84, 0.18, 0.18),
	info: rgb(0.34, 0.41, 0.52)
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
	cycleTitle: string;
	groupLabel: string;
}

interface PdfAssets {
	font: PDFFont;
	boldFont: PDFFont;
	backgroundImage: PDFImage | null;
}

interface LayoutState {
	page: PDFPage;
	cursorY: number;
}

interface SummaryRow {
	label: string;
	lines: string[];
	fontSize: number;
}

interface TableRowContent {
	dateLines: string[];
	stateLines: string[];
	entryLines: string[];
	observationLines: string[];
	rowHeight: number;
	stateColor: (typeof COLORS)[keyof typeof COLORS];
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

function toSafeText(value: string | null | undefined, fallback = '—'): string {
	const normalized = value?.trim() ?? '';
	return normalized.length > 0 ? normalized : fallback;
}

function getAttendanceColor(state: AttendanceOverviewItem['attendance_state']) {
	if (state === 'presente') return COLORS.success;
	if (state === 'tarde') return COLORS.warning;
	if (state === 'falta') return COLORS.danger;
	if (state === 'justificado') return COLORS.info;
	return COLORS.muted;
}

function getPreferredEnrollment(
	enrollments: EnrollmentOverview[],
	requestedTurn: EnrollmentTurn | null
): EnrollmentOverview | null {
	return (
		enrollments.find((item) => item.status === 'active' && item.turn === requestedTurn) ??
		enrollments.find((item) => item.turn === requestedTurn) ??
		enrollments.find((item) => item.status === 'active') ??
		enrollments[0] ??
		null
	);
}

async function loadLetterheadPng(): Promise<Uint8Array | null> {
	try {
		return await readFile(LETTERHEAD_PATH);
	} catch {
		return null;
	}
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

	const preferredEnrollment = getPreferredEnrollment(enrollments, filters.requestedTurn);
	const availableTurns = Array.from(
		new Set(allRecords.map((record) => record.turn))
	) as EnrollmentTurn[];
	const selectedTurn =
		filters.requestedTurn ?? availableTurns[0] ?? preferredEnrollment?.turn ?? 'turn_1';
	const records = allRecords.filter((record) => record.turn === selectedTurn);
	const referenceRecord = records[0] ?? null;

	return {
		student,
		records,
		fromDate: filters.fromDate,
		toDate: filters.toDate,
		cycleTitle: toSafeText(referenceRecord?.cycle_title ?? preferredEnrollment?.cycle_title),
		groupLabel: referenceRecord
			? formatGroupCode(referenceRecord.group_code)
			: preferredEnrollment
				? formatGroupCode(preferredEnrollment.group_code)
				: 'Sin grupo registrado'
	};
}

function drawBackground(page: PDFPage, backgroundImage: PDFImage | null): void {
	if (!backgroundImage) {
		page.drawRectangle({
			x: 0,
			y: 0,
			width: PAGE_WIDTH,
			height: PAGE_HEIGHT,
			color: COLORS.white
		});
		return;
	}

	page.drawImage(backgroundImage, {
		x: 0,
		y: 0,
		width: PAGE_WIDTH,
		height: PAGE_HEIGHT
	});
}

function createBasePage(pdf: PDFDocument, assets: PdfAssets): PDFPage {
	const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

	drawBackground(page, assets.backgroundImage);

	return page;
}

function drawCenteredTitle(
	page: PDFPage,
	boldFont: PDFFont,
	title: string,
	y: number,
	size: number
) {
	const titleWidth = boldFont.widthOfTextAtSize(title, size);
	const titleX = (PAGE_WIDTH - titleWidth) / 2;

	page.drawText(title, {
		x: titleX,
		y,
		font: boldFont,
		size,
		color: COLORS.text
	});

	page.drawLine({
		start: { x: PAGE_WIDTH / 2 - 78, y: y - 9 },
		end: { x: PAGE_WIDTH / 2 + 78, y: y - 9 },
		thickness: 1,
		color: COLORS.accent
	});
}

function buildSummaryRows(context: ReportContext, boldFont: PDFFont): SummaryRow[] {
	const valueWidth = 290;

	return [
		{
			label: 'Alumno',
			lines: wrapText(context.student.full_name, boldFont, 11.5, valueWidth),
			fontSize: 11.5
		},
		{
			label: 'Ciclo',
			lines: wrapText(context.cycleTitle, boldFont, 10.5, valueWidth),
			fontSize: 10.5
		},
		{
			label: 'Grupo',
			lines: wrapText(context.groupLabel, boldFont, 10.5, valueWidth),
			fontSize: 10.5
		},
		{
			label: 'Periodo',
			lines: wrapText(
				`${formatEducationDate(context.fromDate)} - ${formatEducationDate(context.toDate)}`,
				boldFont,
				10.5,
				valueWidth
			),
			fontSize: 10.5
		}
	];
}

function drawSummaryCard(
	page: PDFPage,
	font: PDFFont,
	boldFont: PDFFont,
	context: ReportContext
): number {
	const cardWidth = CONTENT_WIDTH;
	const cardX = CONTENT_X;
	const labelX = cardX + 20;
	const valueX = cardX + 118;
	const rows = buildSummaryRows(context, boldFont);
	const rowHeights = rows.map((row) => Math.max(28, row.lines.length * 12 + 12));
	const cardHeight = 18 + rowHeights.reduce((sum, height) => sum + height, 0);
	const cardY = SUMMARY_CARD_TOP_Y - cardHeight;

	page.drawRectangle({
		x: cardX,
		y: cardY,
		width: cardWidth,
		height: cardHeight,
		color: COLORS.white,
		borderColor: COLORS.panelBorder,
		borderWidth: 1
	});

	page.drawRectangle({
		x: cardX,
		y: SUMMARY_CARD_TOP_Y - 3,
		width: cardWidth,
		height: 3,
		color: COLORS.accent
	});

	let currentTopY = SUMMARY_CARD_TOP_Y - 14;

	rows.forEach((row, index) => {
		if (index > 0) {
			page.drawLine({
				start: { x: cardX + 20, y: currentTopY + 8 },
				end: { x: cardX + cardWidth - 20, y: currentTopY + 8 },
				thickness: 0.6,
				color: COLORS.border
			});
		}

		page.drawText(row.label.toUpperCase(), {
			x: labelX,
			y: currentTopY,
			font,
			size: 8,
			color: COLORS.muted
		});

		row.lines.forEach((line, lineIndex) => {
			page.drawText(line, {
				x: valueX,
				y: currentTopY - 2 - lineIndex * 12,
				font: boldFont,
				size: row.fontSize,
				color: COLORS.text
			});
		});

		currentTopY -= rowHeights[index];
	});

	return cardY;
}

function drawColumnSeparators(page: PDFPage, bottomY: number, height: number): void {
	for (const column of TABLE_COLUMNS.slice(1)) {
		page.drawLine({
			start: { x: column.x, y: bottomY },
			end: { x: column.x, y: bottomY + height },
			thickness: 0.6,
			color: COLORS.border
		});
	}
}

function drawTableHeader(page: PDFPage, boldFont: PDFFont, topY: number): number {
	const headerY = topY - TABLE_HEADER_HEIGHT;

	page.drawRectangle({
		x: CONTENT_X,
		y: headerY,
		width: CONTENT_WIDTH,
		height: TABLE_HEADER_HEIGHT,
		color: COLORS.headerSurface,
		borderColor: COLORS.border,
		borderWidth: 1
	});

	page.drawLine({
		start: { x: CONTENT_X, y: topY },
		end: { x: CONTENT_X + CONTENT_WIDTH, y: topY },
		thickness: 1,
		color: COLORS.accent
	});

	drawColumnSeparators(page, headerY, TABLE_HEADER_HEIGHT);

	for (const column of TABLE_COLUMNS) {
		const textWidth = boldFont.widthOfTextAtSize(column.label, TABLE_FONT_SIZE);

		page.drawText(column.label, {
			x: column.x + column.width / 2 - textWidth / 2,
			y: headerY + 8,
			font: boldFont,
			size: TABLE_FONT_SIZE,
			color: COLORS.text
		});
	}

	return headerY;
}

function buildTableRowContent(
	font: PDFFont,
	boldFont: PDFFont,
	record: AttendanceOverviewItem
): TableRowContent {
	const dateLines = wrapText(
		formatEducationDate(record.attendance_date),
		font,
		TABLE_FONT_SIZE,
		TABLE_COLUMNS[0].width - 20
	);
	const stateLines = wrapText(
		formatAttendanceState(record.attendance_state),
		boldFont,
		TABLE_FONT_SIZE,
		TABLE_COLUMNS[1].width - 20
	);
	const entryLines = wrapText(
		formatAttendanceTime(record.attendance_entry_time),
		font,
		TABLE_FONT_SIZE,
		TABLE_COLUMNS[2].width - 20
	);
	const observationLines = wrapText(
		toSafeText(record.attendance_observation),
		font,
		TABLE_FONT_SIZE,
		TABLE_COLUMNS[3].width - 20
	);
	const maxLineCount = Math.max(
		dateLines.length,
		stateLines.length,
		entryLines.length,
		observationLines.length
	);

	return {
		dateLines,
		stateLines,
		entryLines,
		observationLines,
		rowHeight: Math.max(30, maxLineCount * TABLE_LINE_HEIGHT + 12),
		stateColor: getAttendanceColor(record.attendance_state)
	};
}

function drawTableRow(
	page: PDFPage,
	font: PDFFont,
	boldFont: PDFFont,
	content: TableRowContent,
	topY: number,
	rowIndex: number
): number {
	const rowY = topY - content.rowHeight;
	const rowColor = rowIndex % 2 === 0 ? COLORS.white : COLORS.surface;

	page.drawRectangle({
		x: CONTENT_X,
		y: rowY,
		width: CONTENT_WIDTH,
		height: content.rowHeight,
		color: rowColor,
		borderColor: COLORS.border,
		borderWidth: 1
	});

	drawColumnSeparators(page, rowY, content.rowHeight);

	const columns: Array<{
		x: number;
		lines: string[];
		font: PDFFont;
		color?: TableRowContent['stateColor'];
	}> = [
		{ x: TABLE_COLUMNS[0].x + 10, lines: content.dateLines, font },
		{
			x: TABLE_COLUMNS[1].x + 10,
			lines: content.stateLines,
			font: boldFont,
			color: content.stateColor
		},
		{ x: TABLE_COLUMNS[2].x + 10, lines: content.entryLines, font },
		{ x: TABLE_COLUMNS[3].x + 10, lines: content.observationLines, font }
	];

	for (const column of columns) {
		column.lines.forEach((line, index) => {
			page.drawText(line, {
				x: column.x,
				y: topY - 16 - index * TABLE_LINE_HEIGHT,
				font: column.font,
				size: TABLE_FONT_SIZE,
				color: column.color ?? COLORS.text
			});
		});
	}

	return rowY;
}

function drawEmptyTableState(page: PDFPage, font: PDFFont, boldFont: PDFFont, topY: number): void {
	const emptyHeight = 62;
	const emptyY = topY - emptyHeight;

	page.drawRectangle({
		x: CONTENT_X,
		y: emptyY,
		width: CONTENT_WIDTH,
		height: emptyHeight,
		color: COLORS.white,
		borderColor: COLORS.border,
		borderWidth: 1
	});

	const title = 'No se registraron asistencias en el periodo seleccionado.';
	const subtitle = 'Ajusta el rango o el turno para generar otra constancia.';
	const titleWidth = boldFont.widthOfTextAtSize(title, 10.5);
	const subtitleWidth = font.widthOfTextAtSize(subtitle, 9);

	page.drawText(title, {
		x: CONTENT_X + CONTENT_WIDTH / 2 - titleWidth / 2,
		y: emptyY + 35,
		font: boldFont,
		size: 10.5,
		color: COLORS.text
	});

	page.drawText(subtitle, {
		x: CONTENT_X + CONTENT_WIDTH / 2 - subtitleWidth / 2,
		y: emptyY + 20,
		font,
		size: 9,
		color: COLORS.muted
	});
}

function createFirstPage(pdf: PDFDocument, assets: PdfAssets, context: ReportContext): LayoutState {
	const page = createBasePage(pdf, assets);

	drawCenteredTitle(page, assets.boldFont, REPORT_TITLE, TITLE_Y, 18);

	const summaryBottomY = drawSummaryCard(page, assets.font, assets.boldFont, context);
	const tableTopY = summaryBottomY - 14;
	const cursorY = drawTableHeader(page, assets.boldFont, tableTopY);

	return { page, cursorY };
}

function createContinuationPage(pdf: PDFDocument, assets: PdfAssets): LayoutState {
	const page = createBasePage(pdf, assets);

	drawCenteredTitle(page, assets.boldFont, REPORT_TITLE, 734, 14);

	return {
		page,
		cursorY: drawTableHeader(page, assets.boldFont, NEXT_PAGE_TABLE_TOP_Y)
	};
}

function ensureSpace(
	pdf: PDFDocument,
	layout: LayoutState,
	assets: PdfAssets,
	requiredHeight: number
): LayoutState {
	if (layout.cursorY - requiredHeight >= TABLE_BOTTOM_Y) {
		return layout;
	}

	return createContinuationPage(pdf, assets);
}

export async function generateStudentAttendanceReportPdf(
	db: Database,
	studentCode: string,
	filters: StudentAttendanceReportFilters
): Promise<Buffer> {
	const context = await resolveReportContext(db, studentCode, filters);

	const pdf = await PDFDocument.create();
	const [font, boldFont, letterheadPng] = await Promise.all([
		pdf.embedFont(StandardFonts.Helvetica),
		pdf.embedFont(StandardFonts.HelveticaBold),
		loadLetterheadPng()
	]);

	const backgroundImage = letterheadPng ? await pdf.embedPng(letterheadPng) : null;
	const assets: PdfAssets = { font, boldFont, backgroundImage };

	let layout = createFirstPage(pdf, assets, context);

	if (context.records.length === 0) {
		drawEmptyTableState(layout.page, font, boldFont, layout.cursorY);
		return Buffer.from(await pdf.save());
	}

	for (const [index, record] of context.records.entries()) {
		const rowContent = buildTableRowContent(font, boldFont, record);

		layout = ensureSpace(pdf, layout, assets, rowContent.rowHeight);
		layout.cursorY = drawTableRow(layout.page, font, boldFont, rowContent, layout.cursorY, index);
	}

	return Buffer.from(await pdf.save());
}
