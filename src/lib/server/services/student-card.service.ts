import { readFile } from 'fs/promises';
import { join } from 'path';
import QRCode from 'qrcode';
import sharp from 'sharp';
import {
	PDFDocument,
	StandardFonts,
	rgb,
	degrees,
	type PDFFont,
	type PDFImage,
	type PDFPage
} from 'pdf-lib';
import type { Database } from '$lib/database';
import type { EnrollmentOverview, StudentOverview } from '$lib/types/education';
import { EducationRepository } from '$lib/server/repositories/education.repository';
import { isUuid } from '$lib/utils/validation';
import { readDriveFileBuffer } from './drive-image.service';

const PT_PER_MM = 72 / 25.4;
const CARD_WIDTH = 85.6 * PT_PER_MM;
const CARD_HEIGHT = 53.98 * PT_PER_MM;

const TEMPLATE_WIDTH_PX = 2032;
const TEMPLATE_HEIGHT_PX = 1276;
const TEMPLATE_PATH = join(process.cwd(), 'static', 'student-card-template.png');

const COLORS = {
	text: rgb(0.1, 0.12, 0.18),
	background: rgb(1, 1, 1),
	panel: rgb(0.95, 0.97, 0.99),
	border: rgb(0.85, 0.88, 0.93),
	navy: rgb(0.09, 0.23, 0.52),
	white: rgb(1, 1, 1)
} as const;

interface StudentCardData {
	fullName: string;
	dni: string;
	details: string[];
}

interface TextLayoutResult {
	lines: string[];
	fontSize: number;
	lineHeight: number;
}

// --- Coordinate Helpers ---
function pxX(value: number): number {
	return (value / TEMPLATE_WIDTH_PX) * CARD_WIDTH;
}

function pxY(value: number): number {
	return (value / TEMPLATE_HEIGHT_PX) * CARD_HEIGHT;
}

function rectY(topPx: number, heightPx: number): number {
	return CARD_HEIGHT - pxY(topPx + heightPx);
}

// --- Data Preparation ---
function toSafeText(value: string | null | undefined, fallback = ''): string {
	const normalized = value?.trim() ?? '';
	return normalized.length > 0 ? normalized : fallback;
}

function getPreferredEnrollment(enrollments: EnrollmentOverview[]): EnrollmentOverview | null {
	return enrollments.find((item) => item.status === 'active') ?? enrollments[0] ?? null;
}

function buildStudentCardData(
	student: StudentOverview,
	enrollment: EnrollmentOverview
): StudentCardData {
	const dni = student.dni?.trim() ?? '';
	if (!dni) {
		throw new Error('El alumno no tiene DNI registrado para generar el carnet');
	}

	return {
		fullName: toSafeText(student.full_name, 'Alumno sin nombre'),
		dni,
		details: [
			toSafeText(enrollment.cycle_title, 'N/A'),
			toSafeText(enrollment.degree_name, 'N/A'),
			toSafeText(enrollment.group_code, 'N/A')
		]
	};
}

function getInitials(fullName: string): string {
	const words = fullName.trim().split(/\s+/).filter(Boolean).slice(0, 2);

	if (words.length === 0) return 'AL';
	return words.map((word) => word[0]?.toUpperCase() ?? '').join('') || 'AL';
}

// --- Fixed High Performance Text Logic ---
function attemptWrap(
	text: string,
	font: PDFFont,
	fontSize: number,
	maxWidth: number,
	maxLines: number
): { lines: string[]; truncated: boolean } {
	const words = text.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return { lines: [], truncated: false };

	const lines: string[] = [];
	let currentLine = '';

	for (const word of words) {
		const candidate = currentLine ? `${currentLine} ${word}` : word;

		if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
			currentLine = candidate;
		} else {
			if (currentLine) {
				lines.push(currentLine);
			}
			currentLine = word;
		}
	}

	if (currentLine) {
		lines.push(currentLine);
	}

	// It's truncated if we exceed allowed lines OR if any single word is wider than the column
	const isTooLong =
		lines.length > maxLines || lines.some((l) => font.widthOfTextAtSize(l, fontSize) > maxWidth);

	return {
		lines: lines.slice(0, maxLines),
		truncated: isTooLong
	};
}

function resolveNameLayout(fullName: string, font: PDFFont, maxWidth: number): TextLayoutResult {
	// ↓ REUDCED STUDENT FULL NAME FONT SIZES ↓
	const profiles = [
		{ size: 9, maxLines: 1 }, // (was 12)
		{ size: 8, maxLines: 1 }, // (was 10)
		{ size: 7, maxLines: 2 }, // (was 8.5)
		{ size: 6, maxLines: 2 }, // (was 7.5)
		{ size: 5.5, maxLines: 2 } // (was 6.5)
	];

	for (const profile of profiles) {
		const { lines, truncated } = attemptWrap(
			fullName,
			font,
			profile.size,
			maxWidth,
			profile.maxLines
		);
		if (!truncated || profile === profiles[profiles.length - 1]) {
			return { lines, fontSize: profile.size, lineHeight: profile.size * 1.25 };
		}
	}

	return { lines: [fullName], fontSize: 5.5, lineHeight: 7 }; // (was 6.5, lineHeight 8)
	// ↑ ------------------------------------ ↑
}

// --- Asset Loaders ---
async function loadStudentPhotoPng(
	db: Database,
	photoUrl: string | null | undefined
): Promise<Uint8Array | null> {
	const match = photoUrl?.trim().match(/^\/api\/students\/photos\/([0-9a-f-]+)(?:\?.*)?$/i);
	const fileCode = match?.[1] ?? null;

	if (!fileCode || !isUuid(fileCode)) return null;

	const file = await db
		.selectFrom('drive_files')
		.select(['code', 'storage_path', 'type'])
		.where('code', '=', fileCode)
		.executeTakeFirst();

	if (!file?.storage_path || file.type !== 'img') return null;

	try {
		const buffer = await readDriveFileBuffer(file.storage_path);
		return await sharp(buffer)
			.rotate()
			.resize({ width: 900, height: 900, fit: 'cover', position: 'centre' })
			.png()
			.toBuffer();
	} catch {
		return null;
	}
}

async function loadBackgroundTemplate(): Promise<Uint8Array | null> {
	try {
		return await readFile(TEMPLATE_PATH);
	} catch {
		return null;
	}
}

async function buildQrPng(dni: string): Promise<Uint8Array> {
	return QRCode.toBuffer(dni, {
		errorCorrectionLevel: 'H',
		margin: 1,
		type: 'png',
		width: 900,
		color: { dark: '#111827', light: '#FFFFFFFF' }
	});
}

// --- Rendering Blocks ---
function drawBackground(page: PDFPage, backgroundImage: PDFImage | null): void {
	if (!backgroundImage) {
		page.drawRectangle({
			x: 0,
			y: 0,
			width: CARD_WIDTH,
			height: CARD_HEIGHT,
			color: COLORS.background
		});
		return;
	}
	page.drawImage(backgroundImage, { x: 0, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT });
}

function drawQrAndDni(
	page: PDFPage,
	boldFont: PDFFont,
	data: StudentCardData,
	qrImage: PDFImage
): void {
	const qrSize = 800;
	const qrX = 72;
	const qrY = 240;

	page.drawImage(qrImage, {
		x: pxX(qrX),
		y: rectY(qrY, qrSize),
		width: pxX(qrSize),
		height: pxY(qrSize)
	});

	const dniFontSize = 13;
	const dniText = data.dni;
	const dniWidth = boldFont.widthOfTextAtSize(dniText, dniFontSize);

	const pillCenterX = pxX(1040);
	const pillCenterY = CARD_HEIGHT / 2;

	page.drawText(dniText, {
		x: pillCenterX + dniFontSize * 0.35,
		y: pillCenterY - dniWidth / 2,
		font: boldFont,
		size: dniFontSize,
		color: COLORS.text,
		rotate: degrees(90)
	});
}

function drawPhotoBlock(
	page: PDFPage,
	boldFont: PDFFont,
	data: StudentCardData,
	photoImage: PDFImage | null
): void {
	const photoX = 1244;
	const photoY = 110;
	const photoSize = 585;

	if (photoImage) {
		page.drawImage(photoImage, {
			x: pxX(photoX),
			y: rectY(photoY, photoSize),
			width: pxX(photoSize),
			height: pxY(photoSize)
		});
		return;
	}

	page.drawRectangle({
		x: pxX(photoX),
		y: rectY(photoY, photoSize),
		width: pxX(photoSize),
		height: pxY(photoSize),
		color: COLORS.panel,
		borderColor: COLORS.border,
		borderWidth: 1
	});

	const initials = getInitials(data.fullName);
	const initialsFontSize = 28;
	const initialsWidth = boldFont.widthOfTextAtSize(initials, initialsFontSize);

	page.drawText(initials, {
		x: pxX(photoX) + pxX(photoSize) / 2 - initialsWidth / 2,
		y: rectY(photoY, photoSize) + pxY(photoSize) / 2 - initialsFontSize * 0.35,
		font: boldFont,
		size: initialsFontSize,
		color: COLORS.navy
	});
}

function drawStudentInfo(
	page: PDFPage,
	font: PDFFont,
	boldFont: PDFFont,
	data: StudentCardData
): void {
	// Fixed Alignment: Centered perfectly underneath the X/Width of the photo block above it
	const panelX = 1215;
	const panelTop = 740;
	const panelWidth = 642;
	const panelHeight = 240;
	const panelPaddingX = 15;

	page.drawRectangle({
		x: pxX(panelX),
		y: rectY(panelTop, panelHeight),
		width: pxX(panelWidth),
		height: pxY(panelHeight),
		color: COLORS.white,
		borderColor: COLORS.border,
		borderWidth: 0.8
	});

	// --- 1. Top Section: Full Name ---
	const nameBlockX = pxX(panelX + panelPaddingX);
	const nameBlockWidth = pxX(panelWidth - panelPaddingX * 2);
	const { fontSize, lines, lineHeight } = resolveNameLayout(
		data.fullName,
		boldFont,
		nameBlockWidth
	);

	// Vertically center the name in the top ~35% of the white block
	const nameAreaCenterY = CARD_HEIGHT - pxY(panelTop + panelHeight * 0.35);

	let currentNameY =
		nameAreaCenterY + (fontSize * 0.7 + (lines.length - 1) * lineHeight) / 2 - fontSize * 0.7;

	for (const line of lines) {
		const width = boldFont.widthOfTextAtSize(line, fontSize);
		page.drawText(line, {
			x: nameBlockX + (nameBlockWidth - width) / 2,
			y: currentNameY,
			font: boldFont,
			size: fontSize,
			color: COLORS.text
		});
		currentNameY -= lineHeight;
	}

	// --- 2. Bottom Section: 3 Minimal Fields Properly Distributed ---
	const innerWidth = panelWidth - panelPaddingX * 2;
	const segmentWidth = innerWidth / 3;
	const maxTextWidthPdf = pxX(segmentWidth - 6); // Small inner padding inside the column

	// Vertically center details in the lower ~25% section
	const detailsCenterY = CARD_HEIGHT - pxY(panelTop + panelHeight * 0.75);

	let unifiedSize = 8;
	let detailLinesList: string[][] = [];

	// Loop shrinks size safely until all 3 items fit in their respective columns
	while (unifiedSize >= 4) {
		let allFit = true;
		let currentTry: string[][] = [];

		for (const text of data.details) {
			const wrapResult = attemptWrap(text.toUpperCase(), boldFont, unifiedSize, maxTextWidthPdf, 3);
			currentTry.push(wrapResult.lines);
			if (wrapResult.truncated) {
				allFit = false;
			}
		}

		detailLinesList = currentTry;
		if (allFit) break;
		unifiedSize -= 0.5;
	}

	const detailsLineHeight = unifiedSize * 1.15;

	data.details.forEach((_, index) => {
		const itemLines = detailLinesList[index] || [];

		// Perfect geometric center X coordinate of this specific column (1st, 2nd, or 3rd)
		const cx = panelX + panelPaddingX + segmentWidth * index + segmentWidth / 2;

		const textBlockTotalHeight = unifiedSize * 0.7 + (itemLines.length - 1) * detailsLineHeight;
		let currentY = detailsCenterY + textBlockTotalHeight / 2 - unifiedSize * 0.7;

		for (const line of itemLines) {
			const lineWidth = boldFont.widthOfTextAtSize(line, unifiedSize);
			page.drawText(line, {
				x: pxX(cx) - lineWidth / 2,
				y: currentY,
				font: boldFont,
				size: unifiedSize,
				color: COLORS.navy
			});
			currentY -= detailsLineHeight;
		}
	});
}

export async function generateStudentCardPdf(db: Database, studentCode: string): Promise<Buffer> {
	const [student, enrollments] = await Promise.all([
		EducationRepository.findStudentByCode(db, studentCode),
		EducationRepository.listStudentEnrollmentHistory(db, studentCode)
	]);

	if (!student) throw new Error('Alumno no encontrado');

	const enrollment = getPreferredEnrollment(enrollments);
	if (!enrollment) throw new Error('El alumno no tiene matrículas registradas');

	const cardData = buildStudentCardData(student, enrollment);
	const pdf = await PDFDocument.create();
	const page = pdf.addPage([CARD_WIDTH, CARD_HEIGHT]);

	const [font, boldFont, backgroundPng, qrPng, photoPng] = await Promise.all([
		pdf.embedFont(StandardFonts.Helvetica),
		pdf.embedFont(StandardFonts.HelveticaBold),
		loadBackgroundTemplate(),
		buildQrPng(cardData.dni),
		loadStudentPhotoPng(db, student.photo_url)
	]);

	const backgroundImage = backgroundPng ? await pdf.embedPng(backgroundPng) : null;
	const qrImage = await pdf.embedPng(qrPng);
	const photoImage = photoPng ? await pdf.embedPng(photoPng) : null;

	drawBackground(page, backgroundImage);
	drawQrAndDni(page, boldFont, cardData, qrImage);
	drawPhotoBlock(page, boldFont, cardData, photoImage);
	drawStudentInfo(page, font, boldFont, cardData);

	return Buffer.from(await pdf.save());
}
