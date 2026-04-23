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
import type { StudentEvaluationReportItem } from '$lib/types/evaluation';
import type { StudentOverview } from '$lib/types/education';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import { EvaluationRepository } from '$lib/server/repositories/evaluation.repository';
import { formatEducationDate, formatGroupCode } from '$lib/utils';

const LETTERHEAD_PATH = join(process.cwd(), 'static', 'membrete.png');
const REPORT_TITLE = 'Reporte de resultados del alumno';
const PASSING_SCORE = 10.5;

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const CONTENT_X = 48;
const CONTENT_WIDTH = PAGE_WIDTH - CONTENT_X * 2;
const TITLE_Y = 734;
const SUMMARY_TOP_Y = 708;
const ENTRIES_TOP_Y = 594;
const ENTRIES_NEXT_PAGE_TOP_Y = 712;
const TABLE_HEADER_HEIGHT = 28;
const TABLE_BOTTOM_Y = 104;
const TABLE_FONT_SIZE = 9;
const TABLE_LINE_HEIGHT = 11;

const TABLE_COLUMNS = [
	{ label: 'Fecha', x: CONTENT_X, width: 72 },
	{ label: 'Evaluación', x: CONTENT_X + 72, width: 154 },
	{ label: 'Nota', x: CONTENT_X + 226, width: 58 },
	{ label: 'Resumen', x: CONTENT_X + 284, width: 82 },
	{ label: 'Secciones', x: CONTENT_X + 366, width: CONTENT_WIDTH - 366 }
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

interface ReportContext {
	student: StudentOverview;
	results: StudentEvaluationReportItem[];
	averageScore: number;
	bestScore: number;
	approvedCount: number;
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

interface SummaryMetric {
	label: string;
	value: string;
	color: (typeof COLORS)[keyof typeof COLORS];
}

interface ReportEntryLayout {
	dateLines: string[];
	evaluationLines: string[];
	scoreLines: string[];
	summaryLines: string[];
	sectionLines: string[];
	rowHeight: number;
	scoreColor: (typeof COLORS)[keyof typeof COLORS];
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
	const trimmed = text.trim();
	if (!trimmed) {
		return ['—'];
	}

	const words = trimmed.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
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

	return lines.length > 0 ? lines : ['—'];
}

function toSafeText(value: string | null | undefined, fallback = '—'): string {
	const normalized = value?.trim() ?? '';
	return normalized.length > 0 ? normalized : fallback;
}

function getScoreColor(score: number) {
	if (score >= 14) return COLORS.success;
	if (score >= PASSING_SCORE) return COLORS.warning;
	return COLORS.danger;
}

function buildSectionSummary(result: StudentEvaluationReportItem): string {
	const entries = Object.entries(result.course_scores);

	if (entries.length === 0) {
		return 'Sin desglose por curso';
	}

	return entries.map(([sectionName, score]) => `${sectionName}: ${score.toFixed(2)}`).join(' · ');
}

function buildEntryLayout(
	result: StudentEvaluationReportItem,
	assets: PdfAssets
): ReportEntryLayout {
	const dateLines = wrapText(
		formatEducationDate(result.eval_date),
		assets.font,
		TABLE_FONT_SIZE,
		TABLE_COLUMNS[0].width - 12
	);
	const evaluationLines = wrapText(
		`${result.eval_name} · ${result.cycle_title} · ${result.degree_name} · ${formatGroupCode(result.group_code)}`,
		assets.boldFont,
		TABLE_FONT_SIZE,
		TABLE_COLUMNS[1].width - 12
	);
	const scoreLines = wrapText(
		`${result.score.toFixed(2)} / 20`,
		assets.boldFont,
		TABLE_FONT_SIZE,
		TABLE_COLUMNS[2].width - 12
	);
	const summaryLines = wrapText(
		`${result.correct_count}C · ${result.incorrect_count}I · ${result.blank_count}B · Lista ${result.roll_code}`,
		assets.font,
		TABLE_FONT_SIZE,
		TABLE_COLUMNS[3].width - 12
	);
	const sectionLines = wrapText(
		buildSectionSummary(result),
		assets.font,
		TABLE_FONT_SIZE,
		TABLE_COLUMNS[4].width - 12
	);
	const lineCount = Math.max(
		dateLines.length,
		evaluationLines.length,
		scoreLines.length,
		summaryLines.length,
		sectionLines.length
	);

	return {
		dateLines,
		evaluationLines,
		scoreLines,
		summaryLines,
		sectionLines,
		rowHeight: Math.max(TABLE_HEADER_HEIGHT, lineCount * TABLE_LINE_HEIGHT + 16),
		scoreColor: getScoreColor(result.score)
	};
}

async function loadLetterheadPng(): Promise<Uint8Array | null> {
	try {
		return await readFile(LETTERHEAD_PATH);
	} catch {
		return null;
	}
}

async function resolveReportContext(db: Database, studentCode: string): Promise<ReportContext> {
	const [student, results] = await Promise.all([
		EducationRepository.findStudentByCode(db, studentCode),
		EvaluationRepository.listStudentReportItems(db, studentCode)
	]);

	if (!student) {
		throw new Error('Alumno no encontrado');
	}

	if (results.length === 0) {
		throw new Error('No existen resultados guardados para el alumno');
	}

	const totalScore = results.reduce((sum, item) => sum + item.score, 0);
	const bestScore = results.reduce((best, item) => Math.max(best, item.score), 0);
	const approvedCount = results.filter((item) => item.score >= PASSING_SCORE).length;

	return {
		student,
		results,
		averageScore: Number((totalScore / results.length).toFixed(2)),
		bestScore: Number(bestScore.toFixed(2)),
		approvedCount
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
		start: { x: PAGE_WIDTH / 2 - 92, y: y - 9 },
		end: { x: PAGE_WIDTH / 2 + 92, y: y - 9 },
		thickness: 1,
		color: COLORS.accent
	});
}

function drawSummaryCard(page: PDFPage, context: ReportContext, assets: PdfAssets): void {
	page.drawRectangle({
		x: CONTENT_X,
		y: SUMMARY_TOP_Y - 114,
		width: CONTENT_WIDTH,
		height: 114,
		color: COLORS.surface,
		borderColor: COLORS.panelBorder,
		borderWidth: 1
	});

	page.drawText(context.student.full_name, {
		x: CONTENT_X + 18,
		y: SUMMARY_TOP_Y - 26,
		font: assets.boldFont,
		size: 17,
		color: COLORS.text
	});

	page.drawText(
		`${context.student.student_number} · ${toSafeText(context.student.dni, 'Sin DNI')} · ${toSafeText(
			context.student.current_cycle_title,
			'Sin ciclo activo'
		)}`,
		{
			x: CONTENT_X + 18,
			y: SUMMARY_TOP_Y - 44,
			font: assets.font,
			size: 10,
			color: COLORS.muted
		}
	);

	const metrics: SummaryMetric[] = [
		{ label: 'Evaluaciones', value: String(context.results.length), color: COLORS.info },
		{ label: 'Promedio', value: context.averageScore.toFixed(2), color: COLORS.info },
		{
			label: 'Mejor nota',
			value: context.bestScore.toFixed(2),
			color: getScoreColor(context.bestScore)
		},
		{ label: 'Aprobadas', value: String(context.approvedCount), color: COLORS.success }
	];

	const metricWidth = (CONTENT_WIDTH - 36) / metrics.length;

	for (const [index, metric] of metrics.entries()) {
		const x = CONTENT_X + 18 + metricWidth * index;
		page.drawRectangle({
			x,
			y: SUMMARY_TOP_Y - 96,
			width: metricWidth - 8,
			height: 38,
			color: COLORS.white,
			borderColor: COLORS.border,
			borderWidth: 1
		});

		page.drawText(metric.label, {
			x: x + 10,
			y: SUMMARY_TOP_Y - 77,
			font: assets.font,
			size: 8,
			color: COLORS.muted
		});

		page.drawText(metric.value, {
			x: x + 10,
			y: SUMMARY_TOP_Y - 92,
			font: assets.boldFont,
			size: 13,
			color: metric.color
		});
	}
}

function drawTableHeader(page: PDFPage, assets: PdfAssets, topY: number): number {
	const headerBottomY = topY - TABLE_HEADER_HEIGHT;

	page.drawRectangle({
		x: CONTENT_X,
		y: headerBottomY,
		width: CONTENT_WIDTH,
		height: TABLE_HEADER_HEIGHT,
		color: COLORS.headerSurface,
		borderColor: COLORS.border,
		borderWidth: 1
	});

	for (const column of TABLE_COLUMNS) {
		page.drawText(column.label, {
			x: column.x + 8,
			y: headerBottomY + 9,
			font: assets.boldFont,
			size: 9,
			color: COLORS.text
		});
	}

	return headerBottomY;
}

function drawLines(
	page: PDFPage,
	lines: string[],
	font: PDFFont,
	fontSize: number,
	lineHeight: number,
	x: number,
	topY: number,
	color: (typeof COLORS)[keyof typeof COLORS]
): void {
	let currentY = topY;

	for (const line of lines) {
		page.drawText(line, {
			x,
			y: currentY,
			font,
			size: fontSize,
			color
		});
		currentY -= lineHeight;
	}
}

function drawEntryRow(
	page: PDFPage,
	assets: PdfAssets,
	result: StudentEvaluationReportItem,
	topY: number
): number {
	const layout = buildEntryLayout(result, assets);
	const rowBottomY = topY - layout.rowHeight;

	page.drawRectangle({
		x: CONTENT_X,
		y: rowBottomY,
		width: CONTENT_WIDTH,
		height: layout.rowHeight,
		color: COLORS.white,
		borderColor: COLORS.border,
		borderWidth: 1
	});

	for (let index = 1; index < TABLE_COLUMNS.length; index += 1) {
		const column = TABLE_COLUMNS[index];
		page.drawLine({
			start: { x: column.x, y: rowBottomY },
			end: { x: column.x, y: topY },
			thickness: 1,
			color: COLORS.border
		});
	}

	const textTopY = topY - 14;

	drawLines(
		page,
		layout.dateLines,
		assets.font,
		TABLE_FONT_SIZE,
		TABLE_LINE_HEIGHT,
		TABLE_COLUMNS[0].x + 8,
		textTopY,
		COLORS.text
	);
	drawLines(
		page,
		layout.evaluationLines,
		assets.boldFont,
		TABLE_FONT_SIZE,
		TABLE_LINE_HEIGHT,
		TABLE_COLUMNS[1].x + 8,
		textTopY,
		COLORS.text
	);
	drawLines(
		page,
		layout.scoreLines,
		assets.boldFont,
		TABLE_FONT_SIZE,
		TABLE_LINE_HEIGHT,
		TABLE_COLUMNS[2].x + 8,
		textTopY,
		layout.scoreColor
	);
	drawLines(
		page,
		layout.summaryLines,
		assets.font,
		TABLE_FONT_SIZE,
		TABLE_LINE_HEIGHT,
		TABLE_COLUMNS[3].x + 8,
		textTopY,
		COLORS.text
	);
	drawLines(
		page,
		layout.sectionLines,
		assets.font,
		TABLE_FONT_SIZE,
		TABLE_LINE_HEIGHT,
		TABLE_COLUMNS[4].x + 8,
		textTopY,
		COLORS.muted
	);

	return rowBottomY;
}

function createFirstPage(pdf: PDFDocument, assets: PdfAssets, context: ReportContext): LayoutState {
	const page = createBasePage(pdf, assets);
	drawCenteredTitle(page, assets.boldFont, REPORT_TITLE, TITLE_Y, 18);
	drawSummaryCard(page, context, assets);
	const headerBottomY = drawTableHeader(page, assets, ENTRIES_TOP_Y);

	return {
		page,
		cursorY: headerBottomY
	};
}

function createContinuationPage(pdf: PDFDocument, assets: PdfAssets): LayoutState {
	const page = createBasePage(pdf, assets);
	drawCenteredTitle(page, assets.boldFont, REPORT_TITLE, TITLE_Y, 16);
	const headerBottomY = drawTableHeader(page, assets, ENTRIES_NEXT_PAGE_TOP_Y);

	return {
		page,
		cursorY: headerBottomY
	};
}

function drawResults(pdf: PDFDocument, assets: PdfAssets, context: ReportContext): void {
	let layout = createFirstPage(pdf, assets, context);

	for (const result of context.results) {
		const entryLayout = buildEntryLayout(result, assets);

		if (layout.cursorY - entryLayout.rowHeight < TABLE_BOTTOM_Y) {
			layout = createContinuationPage(pdf, assets);
		}

		layout.cursorY = drawEntryRow(layout.page, assets, result, layout.cursorY);
	}
}

export async function generateStudentEvaluationReportPdf(
	db: Database,
	studentCode: string
): Promise<Buffer> {
	const [context, backgroundBytes] = await Promise.all([
		resolveReportContext(db, studentCode),
		loadLetterheadPng()
	]);

	const pdf = await PDFDocument.create();
	const [font, boldFont] = await Promise.all([
		pdf.embedFont(StandardFonts.Helvetica),
		pdf.embedFont(StandardFonts.HelveticaBold)
	]);
	const backgroundImage = backgroundBytes ? await pdf.embedPng(backgroundBytes) : null;

	drawResults(pdf, { font, boldFont, backgroundImage }, context);

	const pdfBytes = await pdf.save();
	return Buffer.from(pdfBytes);
}
