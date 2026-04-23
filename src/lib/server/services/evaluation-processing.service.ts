import { Buffer } from 'buffer';
import { createErrorResult as createOmrErrorResultObject } from '$lib/omrProcessor/error';
import { omrProcessor } from '$lib/omrProcessor';
import type { Database } from '$lib/database';
import { EvaluationRepository } from '$lib/server/repositories/evaluation.repository';
import type {
	EvaluationProcessedAnswer,
	EvaluationProcessingBatchItem,
	EvaluationProcessingBatchRequest,
	EvaluationProcessingBatchResponse,
	EvaluationProcessingErrorCode,
	EvaluationProcessingSavePayload,
	EvaluationQuestionRecord,
	EvaluationScoreSummary,
	EvaluationSectionOverview,
	EvaluationStudentAnswer
} from '$lib/types/evaluation';

const DEBUG_OMR = false;
const MAX_ITEMS_PER_REQUEST = 20;
const MAX_IMAGE_SIZE_BYTES = 1024 * 1024 * 2;
const MAX_SCORE = 20;
const ROLL_CODE_PATTERN = /^\d{4}$/;

interface ProcessingContext {
	evaluationCode: string;
	cycleDegreeCode: string;
	groupCode: 'A' | 'B' | 'C' | 'D';
	sections: EvaluationSectionOverview[];
	questions: EvaluationQuestionRecord[];
}

function getBase64ImageSize(imageData: string): number {
	const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
	return Math.ceil((base64Data.length * 3) / 4);
}

function calculateVigesimalScore(correctWeightedSum: number, totalWeightedSum: number): number {
	if (totalWeightedSum === 0) return 0;
	return Number(((correctWeightedSum / totalWeightedSum) * MAX_SCORE).toFixed(2));
}

function mapErrorMessage(code: EvaluationProcessingErrorCode): string {
	const messages: Record<EvaluationProcessingErrorCode, string> = {
		DECODE_FAILED: 'Error al leer la imagen. Intenta con una imagen más clara.',
		IMAGE_EMPTY: 'La imagen está vacía o no se pudo cargar.',
		PREPROCESSING_FAILED: 'Error al preparar la imagen para el análisis.',
		FIDUCIALS_NOT_FOUND: 'No se encontraron las marcas de guía en la hoja.',
		FIDUCIALS_INVALID_COUNT: 'Número incorrecto de marcas de guía detectadas.',
		FIDUCIAL_ORDERING_FAILED: 'No se pudo determinar la orientación de la hoja.',
		WARP_FAILED: 'Error al corregir la perspectiva de la imagen.',
		WARPED_IMAGE_EMPTY: 'La imagen corregida está vacía.',
		ROI_EXTRACTION_FAILED: 'No se pudieron extraer las áreas de interés.',
		CODE_ROI_EMPTY: 'El área del código está vacía.',
		ANSWERS_ROI_EMPTY: 'El área de respuestas está vacía.',
		BUBBLE_DETECTION_FAILED: 'Error al detectar las burbujas marcadas.',
		CODE_PROCESSING_FAILED: 'Error al leer el código de lista.',
		ANSWER_PROCESSING_FAILED: 'Error al leer las respuestas marcadas.',
		INVALID_PARAMS: 'Parámetros inválidos para el procesamiento.',
		CALCULATION_ERROR: 'Error en cálculos internos.',
		UNEXPECTED_ERROR: 'Ocurrió un error inesperado durante el procesamiento OMR.',
		VALIDATION_ERROR: 'El código de lista no es válido. Debe tener 4 dígitos.',
		ENROLLMENT_NOT_FOUND:
			'No se encontró una matrícula válida con ese código de lista en la evaluación.',
		INTERNAL_ERROR: 'Ocurrió un error interno en el servidor.'
	};

	return messages[code];
}

function createItemErrorResponse(
	itemId: string,
	code: EvaluationProcessingErrorCode,
	internalError?: unknown,
	rollCode?: string,
	debugImage?: string | null
): EvaluationProcessingBatchItem {
	if (internalError) {
		console.error(`[Evaluation OMR] item=${itemId} code=${code}`, internalError);
	}

	return {
		id: itemId,
		success: false,
		error: {
			code,
			message: mapErrorMessage(code),
			details: internalError,
			roll_code: rollCode,
			omr_debug_image: debugImage
		}
	};
}

function buildQuestionAnswerMap(
	answers: Array<{
		question_code: string;
		student_answer: EvaluationStudentAnswer;
	}>
): Map<string, EvaluationStudentAnswer> {
	const answerMap = new Map<string, EvaluationStudentAnswer>();

	for (const answer of answers) {
		answerMap.set(answer.question_code, answer.student_answer);
	}

	return answerMap;
}

function calculateScores(
	sections: EvaluationSectionOverview[],
	questions: EvaluationQuestionRecord[],
	resolveStudentAnswer: (question: EvaluationQuestionRecord) => EvaluationStudentAnswer
): {
	detailedAnswers: EvaluationProcessedAnswer[];
	scores: {
		general: EvaluationScoreSummary;
		by_section: Record<
			string,
			EvaluationScoreSummary & {
				section_name: string;
			}
		>;
	};
} {
	const sectionNames = new Map(sections.map((section) => [section.code, section.course_name]));
	const sectionStats = Object.fromEntries(
		sections.map((section) => [
			section.code,
			{
				section_name: section.course_name,
				correct_count: 0,
				incorrect_count: 0,
				blank_count: 0,
				total_questions: 0,
				correctWeightedSum: 0,
				totalWeightedSum: 0
			}
		])
	);

	const detailedAnswers: EvaluationProcessedAnswer[] = [];
	let generalCorrectCount = 0;
	let generalIncorrectCount = 0;
	let generalBlankCount = 0;
	let generalCorrectWeightedSum = 0;
	let generalTotalWeightedSum = 0;

	for (const question of [...questions].sort(
		(left, right) => left.order_in_eval - right.order_in_eval
	)) {
		const studentAnswer = resolveStudentAnswer(question);
		const isBlank = studentAnswer === null;
		const isMultiple = studentAnswer === 'error_multiple';
		const isCorrect = studentAnswer === question.correct_key;
		const scorePercent = Number(question.score_percent) || 1;
		const omitFromTotal = question.omitable && isBlank;
		const sectionEntry = sectionStats[question.section_code];

		if (isCorrect) {
			generalCorrectCount += 1;
			generalCorrectWeightedSum += scorePercent;
		} else if (isBlank) {
			generalBlankCount += 1;
		} else {
			generalIncorrectCount += 1;
		}

		if (!omitFromTotal) {
			generalTotalWeightedSum += scorePercent;
		}

		if (sectionEntry) {
			sectionEntry.total_questions += 1;

			if (isCorrect) {
				sectionEntry.correct_count += 1;
				sectionEntry.correctWeightedSum += scorePercent;
			} else if (isBlank) {
				sectionEntry.blank_count += 1;
			} else {
				sectionEntry.incorrect_count += 1;
			}

			if (!omitFromTotal) {
				sectionEntry.totalWeightedSum += scorePercent;
			}
		}

		detailedAnswers.push({
			question_code: question.code,
			student_answer: studentAnswer,
			order_in_eval: question.order_in_eval,
			correct_key: question.correct_key,
			score_percent: scorePercent,
			is_correct: isCorrect,
			is_blank: isBlank,
			is_multiple: isMultiple,
			section_code: question.section_code,
			section_name: sectionNames.get(question.section_code) ?? null
		});
	}

	return {
		detailedAnswers,
		scores: {
			general: {
				correct_count: generalCorrectCount,
				incorrect_count: generalIncorrectCount,
				blank_count: generalBlankCount,
				total_questions: questions.length,
				score: calculateVigesimalScore(generalCorrectWeightedSum, generalTotalWeightedSum)
			},
			by_section: Object.fromEntries(
				Object.entries(sectionStats).map(([sectionCode, stats]) => [
					sectionCode,
					{
						section_name: stats.section_name,
						correct_count: stats.correct_count,
						incorrect_count: stats.incorrect_count,
						blank_count: stats.blank_count,
						total_questions: stats.total_questions,
						score: calculateVigesimalScore(stats.correctWeightedSum, stats.totalWeightedSum)
					}
				])
			)
		}
	};
}

async function buildContext(db: Database, evaluationCode: string): Promise<ProcessingContext> {
	const evaluation = await EvaluationRepository.getEvaluationByCode(db, evaluationCode);

	if (!evaluation) {
		throw new Error('La evaluación seleccionada no existe');
	}

	const [sections, questions] = await Promise.all([
		EvaluationRepository.listSections(db, evaluationCode),
		EvaluationRepository.listQuestions(db, evaluationCode)
	]);

	if (sections.length === 0) {
		throw new Error('La evaluación no tiene secciones configuradas');
	}

	if (questions.length === 0) {
		throw new Error('La evaluación no tiene claves configuradas');
	}

	return {
		evaluationCode: evaluation.code,
		cycleDegreeCode: evaluation.cycle_degree_code,
		groupCode: evaluation.group_code,
		sections,
		questions
	};
}

export class EvaluationProcessingService {
	static validateBatchRequest(payload: unknown): EvaluationProcessingBatchRequest {
		if (!payload || typeof payload !== 'object') {
			throw new Error('El cuerpo de la solicitud es inválido');
		}

		const record = payload as Record<string, unknown>;
		const evaluationCode =
			typeof record.evaluationCode === 'string' ? record.evaluationCode.trim() : '';
		const items = Array.isArray(record.items) ? record.items : [];

		if (!evaluationCode) {
			throw new Error('Debe seleccionar una evaluación válida');
		}

		if (items.length === 0) {
			throw new Error('Debe enviar al menos una imagen para procesar');
		}

		if (items.length > MAX_ITEMS_PER_REQUEST) {
			throw new Error(`Máximo ${MAX_ITEMS_PER_REQUEST} imágenes permitidas por lote`);
		}

		const normalizedItems = items.map((item, index) => {
			if (!item || typeof item !== 'object') {
				throw new Error(`La imagen ${index + 1} es inválida`);
			}

			const current = item as Record<string, unknown>;
			const id = typeof current.id === 'string' ? current.id.trim() : '';
			const imageData = typeof current.imageData === 'string' ? current.imageData.trim() : '';
			const rollCode =
				typeof current.rollCode === 'string' && current.rollCode.trim().length > 0
					? current.rollCode.trim()
					: undefined;

			if (!id) {
				throw new Error(`La imagen ${index + 1} no tiene identificador`);
			}

			if (!imageData) {
				throw new Error(`La imagen ${index + 1} no contiene datos`);
			}

			if (getBase64ImageSize(imageData) > MAX_IMAGE_SIZE_BYTES) {
				throw new Error(`La imagen ${index + 1} excede ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)} MB`);
			}

			return { id, imageData, rollCode };
		});

		return {
			evaluationCode,
			items: normalizedItems
		};
	}

	static async processBatch(
		db: Database,
		payload: EvaluationProcessingBatchRequest
	): Promise<EvaluationProcessingBatchResponse> {
		const context = await buildContext(db, payload.evaluationCode);
		const results: EvaluationProcessingBatchItem[] = [];

		for (const item of payload.items) {
			if (item.rollCode && !ROLL_CODE_PATTERN.test(item.rollCode)) {
				results.push(
					createItemErrorResponse(item.id, 'VALIDATION_ERROR', undefined, item.rollCode)
				);
				continue;
			}

			try {
				const imageBuffer = Buffer.from(
					item.imageData.replace(/^data:image\/\w+;base64,/, ''),
					'base64'
				);

				const omrResult = await omrProcessor(
					imageBuffer,
					context.questions.length,
					DEBUG_OMR,
					item.rollCode ?? null
				);

				if (omrResult.status === 'error') {
					results.push(
						createItemErrorResponse(
							item.id,
							omrResult.errorCode,
							omrResult.message,
							item.rollCode,
							omrResult.debug?.processedImage ?? null
						)
					);
					continue;
				}

				const finalRollCode = (item.rollCode ?? omrResult.studentCode ?? '').trim();

				if (!ROLL_CODE_PATTERN.test(finalRollCode)) {
					results.push(
						createItemErrorResponse(item.id, 'VALIDATION_ERROR', undefined, finalRollCode)
					);
					continue;
				}

				const enrollment = await EvaluationRepository.findEnrollmentForProcessing(db, {
					cycleDegreeCode: context.cycleDegreeCode,
					groupCode: context.groupCode,
					rollCode: finalRollCode
				});

				const { detailedAnswers, scores } = calculateScores(
					context.sections,
					context.questions,
					(question) => omrResult.answers[question.order_in_eval] ?? null
				);

				results.push({
					id: item.id,
					success: true,
					data: {
						roll_code: finalRollCode,
						enrollment_code: enrollment?.enrollment_code ?? null,
						enrollment_number: enrollment?.enrollment_number ?? null,
						student: enrollment?.student ?? null,
						answers: detailedAnswers,
						scores,
						omr_debug_image: omrResult.debug?.warpedThresholdedImage ?? null
					}
				});
			} catch (error) {
				const omrError = createOmrErrorResultObject(error);
				results.push(
					createItemErrorResponse(
						item.id,
						omrError.errorCode,
						error,
						item.rollCode,
						omrError.debug?.processedImage ?? null
					)
				);
			}
		}

		return {
			success: true,
			results
		};
	}

	static validateSavePayload(payload: unknown): EvaluationProcessingSavePayload {
		if (!payload || typeof payload !== 'object') {
			throw new Error('No se recibieron resultados para guardar');
		}

		const record = payload as Record<string, unknown>;
		const evaluationCode =
			typeof record.evaluation_code === 'string' ? record.evaluation_code.trim() : '';
		const results = Array.isArray(record.results) ? record.results : [];

		if (!evaluationCode) {
			throw new Error('La evaluación seleccionada no es válida');
		}

		if (results.length === 0) {
			throw new Error('No hay resultados válidos para guardar');
		}

		return {
			evaluation_code: evaluationCode,
			results: results as EvaluationProcessingSavePayload['results']
		};
	}

	static async saveProcessedBatch(
		db: Database,
		payload: EvaluationProcessingSavePayload
	): Promise<{
		successCount: number;
		errors: string[];
		savedEnrollmentCodes: string[];
	}> {
		const context = await buildContext(db, payload.evaluation_code);
		const questionCodeSet = new Set(context.questions.map((question) => question.code));
		const savedEnrollmentCodes: string[] = [];
		const errors: string[] = [];
		let successCount = 0;

		for (const result of payload.results) {
			try {
				if (!result.enrollment_code?.trim()) {
					throw new Error('La matrícula seleccionada no es válida');
				}

				if (!ROLL_CODE_PATTERN.test(result.roll_code?.trim() ?? '')) {
					throw new Error('El código de lista debe tener 4 dígitos');
				}

				const enrollment = await EvaluationRepository.findEnrollmentForProcessing(db, {
					cycleDegreeCode: context.cycleDegreeCode,
					groupCode: context.groupCode,
					rollCode: result.roll_code.trim()
				});

				if (!enrollment || enrollment.enrollment_code !== result.enrollment_code.trim()) {
					throw new Error('La matrícula ya no coincide con el código de lista procesado');
				}

				if (!Array.isArray(result.answers) || result.answers.length !== context.questions.length) {
					throw new Error('La cantidad de respuestas no coincide con la evaluación');
				}

				const answers = result.answers.map((answer) => ({
					question_code:
						typeof answer.question_code === 'string' ? answer.question_code.trim() : '',
					student_answer:
						answer.student_answer === 'A' ||
						answer.student_answer === 'B' ||
						answer.student_answer === 'C' ||
						answer.student_answer === 'D' ||
						answer.student_answer === 'E' ||
						answer.student_answer === 'error_multiple' ||
						answer.student_answer === null
							? answer.student_answer
							: null
				}));

				if (
					answers.some(
						(answer) => !answer.question_code || !questionCodeSet.has(answer.question_code)
					)
				) {
					throw new Error('Se detectaron respuestas que no pertenecen a la evaluación');
				}

				if (
					new Set(answers.map((answer) => answer.question_code)).size !== context.questions.length
				) {
					throw new Error('Se detectaron respuestas duplicadas o incompletas');
				}

				const answerMap = buildQuestionAnswerMap(answers);
				const { scores } = calculateScores(context.sections, context.questions, (question) => {
					return answerMap.get(question.code) ?? null;
				});

				await EvaluationRepository.replaceProcessedResult(db, {
					evaluationCode: payload.evaluation_code,
					enrollmentCode: result.enrollment_code.trim(),
					answers: context.questions.map((question) => ({
						question_code: question.code,
						student_answer: answerMap.get(question.code) ?? null
					})),
					general: scores.general,
					sections: Object.entries(scores.by_section).map(([sectionCode, section]) => ({
						section_code: sectionCode,
						correct_count: section.correct_count,
						incorrect_count: section.incorrect_count,
						blank_count: section.blank_count,
						score: section.score
					}))
				});

				successCount += 1;
				savedEnrollmentCodes.push(result.enrollment_code.trim());
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Ocurrió un error al guardar el resultado';
				errors.push(`${result.roll_code}: ${message}`);
			}
		}

		return {
			successCount,
			errors,
			savedEnrollmentCodes
		};
	}
}
