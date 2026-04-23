import type { Database } from '$lib/database';
import { EvaluationRepository } from '$lib/server/repositories/evaluation.repository';

interface CsvFilePayload {
	filename: string;
	content: string;
}

const CSV_DELIMITER = ';';
const CSV_ROW_DELIMITER = '\r\n';
const PASSING_SCORE = 10.5;

function escapeCsvValue(value: string | number | null | undefined): string {
	const text = value == null ? '' : String(value);

	if (!/[;"\r\n]/.test(text)) {
		return text;
	}

	return `"${text.replaceAll('"', '""')}"`;
}

function buildCsv(headers: string[], rows: Array<Record<string, string | number | null | undefined>>): string {
	const serializedRows = rows.map((row) =>
		headers.map((header) => escapeCsvValue(row[header])).join(CSV_DELIMITER)
	);

	return `\uFEFF${[headers.join(CSV_DELIMITER), ...serializedRows].join(CSV_ROW_DELIMITER)}`;
}

function sanitizeFilenameSegment(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^\w\s-]/g, '')
		.trim()
		.replace(/\s+/g, '_')
		.toLowerCase();
}

function formatScore(value: number): string {
	return value.toFixed(2);
}

export async function generateDetailedEvaluationResultsCsv(
	db: Database,
	evaluationCode: string
): Promise<CsvFilePayload> {
	const [evaluation, sections, results] = await Promise.all([
		EvaluationRepository.getEvaluationByCode(db, evaluationCode),
		EvaluationRepository.listSections(db, evaluationCode),
		EvaluationRepository.listDetailedExportItems(db, evaluationCode)
	]);

	if (!evaluation) {
		throw new Error('La evaluación seleccionada no existe');
	}

	if (results.length === 0) {
		throw new Error('No existen resultados guardados para exportar');
	}

	const baseHeaders = [
		'Lista',
		'Estudiante',
		'Código alumno',
		'DNI',
		'Grupo',
		'Correctas',
		'Incorrectas',
		'En blanco',
		'Nota general',
		'Estado'
	];
	const sectionHeaders = sections.map((section) => section.course_name);
	const headers = [...baseHeaders, ...sectionHeaders];

	const rows = results.map((result) => {
		const row: Record<string, string | number | null | undefined> = {
			Lista: result.roll_code,
			Estudiante: result.student_full_name,
			'Código alumno': result.student_number,
			DNI: result.student_dni,
			Grupo: result.group_code,
			Correctas: result.correct_count,
			Incorrectas: result.incorrect_count,
			'En blanco': result.blank_count,
			'Nota general': formatScore(result.score),
			Estado: result.score >= PASSING_SCORE ? 'Aprobado' : 'En riesgo'
		};

		for (const section of sections) {
			row[section.course_name] = formatScore(result.course_scores[section.course_name] ?? 0);
		}

		return row;
	});

	const safeCycle = sanitizeFilenameSegment(evaluation.cycle_title);
	const safeDegree = sanitizeFilenameSegment(evaluation.degree_name);
	const safeName = sanitizeFilenameSegment(evaluation.name);
	const dateSuffix =
		typeof evaluation.eval_date === 'string'
			? evaluation.eval_date.slice(0, 10)
			: evaluation.eval_date instanceof Date
				? evaluation.eval_date.toISOString().slice(0, 10)
				: 'sin-fecha';

	return {
		filename: `resultados_detallados_${safeCycle}_${safeDegree}_${safeName}_${dateSuffix}.csv`,
		content: buildCsv(headers, rows)
	};
}
