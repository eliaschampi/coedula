import { sql, type Kysely, type Transaction } from 'kysely';
import type { DB, Database } from '$lib/database';
import type { GroupCode } from '$lib/types/education';
import type {
	EvaluationAnswerKey,
	EvaluationOverview,
	EvaluationSavedResultSummary,
	EvaluationScoreSummary,
	EvaluationStudentAnswer,
	EvaluationQuestionRecord,
	EvaluationProcessingStudentSummary,
	EvaluationSectionFormItem,
	EvaluationSectionOverview
} from '$lib/types/evaluation';
import { MAX_EVALUATION_QUESTIONS, normalizeEvaluationSections } from '$lib/utils/evaluation';

type DatabaseExecutor = Kysely<DB> | Transaction<DB>;

interface EvaluationUpsertInput {
	evaluationCode?: string;
	name: string;
	cycleDegreeCode: string;
	groupCode: GroupCode;
	evalDate: string | Date;
	userCode: string;
	sections: EvaluationSectionFormItem[];
}

interface EvaluationQuestionUpsertInput {
	sectionCode: string;
	orderInEval: number;
	correctKey: EvaluationAnswerKey;
	omitable: boolean;
	scorePercent: number;
}

interface EvaluationResultReplacementInput {
	evaluationCode: string;
	enrollmentCode: string;
	answers: Array<{
		question_code: string;
		student_answer: EvaluationStudentAnswer;
	}>;
	general: EvaluationScoreSummary;
	sections: Array<{
		section_code: string;
		correct_count: number;
		incorrect_count: number;
		blank_count: number;
		score: number;
	}>;
}

interface EvaluationProcessingEnrollmentRow {
	enrollment_code: string;
	enrollment_number: string;
	roll_code: string;
	student_code: string;
	student_full_name: string;
	student_number: string;
	student_dni: string | null;
	student_photo_url: string | null;
}

interface EvaluationSavedResultRow {
	code: string;
	enrollment_code: string;
	enrollment_number: string;
	roll_code: string;
	student_code: string;
	student_full_name: string;
	student_number: string;
	student_dni: string | null;
	student_photo_url: string | null;
	correct_count: number | string | bigint;
	incorrect_count: number | string | bigint;
	blank_count: number | string | bigint;
	score: number | string | bigint;
	calculated_at: Date | string;
}

interface EvaluationOverviewRow {
	code: string | null;
	name: string | null;
	cycle_degree_code: string | null;
	cycle_code: string | null;
	branch_code: string | null;
	branch_name: string | null;
	cycle_title: string | null;
	modality: string | null;
	degree_code: string | null;
	degree_name: string | null;
	degree_short_name: string | null;
	degree_sort_order: number | string | bigint | null;
	group_code: string | null;
	eval_date: Date | string | null;
	user_code: string | null;
	created_at: Date | string | null;
	updated_at: Date | string | null;
	section_count: number | string | bigint | null;
	planned_question_count: number | string | bigint | null;
	configured_question_count: number | string | bigint | null;
	has_questions: boolean | null;
	eval_sections: unknown;
}

const VALID_GROUP_CODES = new Set<GroupCode>(['A', 'B', 'C', 'D']);
const VALID_ANSWER_KEYS = new Set<EvaluationAnswerKey>(['A', 'B', 'C', 'D', 'E']);

function toNumber(value: number | string | bigint | null | undefined): number {
	if (typeof value === 'bigint') return Number(value);
	if (typeof value === 'number') return value;
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRequiredText(value: string | null | undefined, label: string): string {
	const normalized = value?.trim() ?? '';

	if (!normalized) {
		throw new Error(`${label} es obligatorio`);
	}

	return normalized;
}

function normalizeEvalDate(value: string | Date): string {
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) {
			throw new Error('La fecha de evaluación no es válida');
		}

		return value.toISOString().slice(0, 10);
	}

	const normalized = value.trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
		throw new Error('La fecha de evaluación no es válida');
	}

	const parsed = new Date(`${normalized}T00:00:00`);
	if (Number.isNaN(parsed.getTime())) {
		throw new Error('La fecha de evaluación no es válida');
	}

	return normalized;
}

function buildSearchPattern(query: string): string {
	return `%${query.trim().replace(/\s+/g, ' ').replace(/[%_]/g, '').toLowerCase()}%`;
}

function parseEvalSectionsPayload(payload: unknown): EvaluationSectionOverview[] {
	if (!Array.isArray(payload)) {
		return [];
	}

	const sections = payload
		.map((value) => {
			if (!value || typeof value !== 'object') {
				return null;
			}

			const section = value as Record<string, unknown>;
			const code = typeof section.code === 'string' ? section.code : '';
			const evalCode = typeof section.eval_code === 'string' ? section.eval_code : '';
			const courseCode = typeof section.course_code === 'string' ? section.course_code : '';
			const courseName = typeof section.course_name === 'string' ? section.course_name : '';
			const orderInEval = toNumber(
				section.order_in_eval as string | number | bigint | null | undefined
			);
			const questionCount = toNumber(
				section.question_count as string | number | bigint | null | undefined
			);

			if (!code || !evalCode || !courseCode) {
				return null;
			}

			return {
				code,
				eval_code: evalCode,
				course_code: courseCode,
				course_name: courseName,
				order_in_eval: orderInEval,
				question_count: questionCount
			} satisfies EvaluationSectionOverview;
		})
		.filter((section): section is EvaluationSectionOverview => Boolean(section));

	return sections.sort((left, right) => left.order_in_eval - right.order_in_eval);
}

function mapEvaluationOverview(row: EvaluationOverviewRow): EvaluationOverview {
	if (!row.code || !row.name || !row.cycle_degree_code || !row.cycle_code || !row.branch_code) {
		throw new Error('La evaluación consultada contiene datos incompletos');
	}

	if (
		!row.branch_name ||
		!row.cycle_title ||
		!row.modality ||
		!row.degree_code ||
		!row.degree_name ||
		!row.group_code ||
		!row.user_code
	) {
		throw new Error('El filtro académico de la evaluación es inválida');
	}

	if (!VALID_GROUP_CODES.has(row.group_code as GroupCode)) {
		throw new Error('El grupo de la evaluación no es válido');
	}

	return {
		code: row.code,
		name: row.name,
		cycle_degree_code: row.cycle_degree_code,
		cycle_code: row.cycle_code,
		branch_code: row.branch_code,
		branch_name: row.branch_name,
		cycle_title: row.cycle_title,
		modality: row.modality,
		degree_code: row.degree_code,
		degree_name: row.degree_name,
		degree_short_name: row.degree_short_name,
		degree_sort_order: toNumber(row.degree_sort_order),
		group_code: row.group_code as GroupCode,
		eval_date: row.eval_date,
		user_code: row.user_code,
		created_at: row.created_at,
		updated_at: row.updated_at,
		section_count: toNumber(row.section_count),
		planned_question_count: toNumber(row.planned_question_count),
		configured_question_count: toNumber(row.configured_question_count),
		has_questions: Boolean(row.has_questions),
		eval_sections: parseEvalSectionsPayload(row.eval_sections)
	};
}

async function ensureCycleDegreeExists(
	db: DatabaseExecutor,
	cycleDegreeCode: string
): Promise<void> {
	const cycleDegree = await db
		.selectFrom('cycle_degrees')
		.select('code')
		.where('code', '=', cycleDegreeCode)
		.executeTakeFirst();

	if (!cycleDegree) {
		throw new Error('El grupo o nivel seleccionado no existe');
	}
}

async function assertCourseCodes(db: DatabaseExecutor, courseCodes: string[]): Promise<void> {
	const uniqueCodes = Array.from(new Set(courseCodes));

	if (uniqueCodes.length === 0) {
		throw new Error('Debe agregar al menos un curso a la evaluación');
	}

	const records = await db
		.selectFrom('courses')
		.select('code')
		.where('code', 'in', uniqueCodes)
		.execute();

	if (records.length !== uniqueCodes.length) {
		throw new Error('La evaluación contiene cursos inválidos');
	}
}

async function loadSectionRows(
	db: DatabaseExecutor,
	evaluationCode: string
): Promise<EvaluationSectionOverview[]> {
	const rows = await db
		.selectFrom('eval_sections')
		.innerJoin('courses', 'courses.code', 'eval_sections.course_code')
		.select([
			'eval_sections.code',
			'eval_sections.eval_code',
			'eval_sections.course_code',
			'eval_sections.order_in_eval',
			'eval_sections.question_count',
			'courses.name as course_name'
		])
		.where('eval_sections.eval_code', '=', evaluationCode)
		.orderBy('eval_sections.order_in_eval', 'asc')
		.execute();

	return rows.map((row) => ({
		code: row.code,
		eval_code: row.eval_code,
		course_code: row.course_code,
		course_name: row.course_name,
		order_in_eval: row.order_in_eval,
		question_count: row.question_count
	}));
}

function assertValidSections(sections: EvaluationSectionFormItem[]): EvaluationSectionFormItem[] {
	const normalized = normalizeEvaluationSections(sections);

	if (normalized.length === 0) {
		throw new Error('Debe agregar al menos una sección a la evaluación');
	}

	const repeatedCourseCodes = normalized.reduce<Map<string, number>>((acc, section) => {
		acc.set(section.course_code, (acc.get(section.course_code) ?? 0) + 1);
		return acc;
	}, new Map());

	if ([...repeatedCourseCodes.values()].some((count) => count > 1)) {
		throw new Error('Cada curso solo puede aparecer una vez dentro de la evaluación');
	}

	if (normalized.some((section) => section.question_count <= 0)) {
		throw new Error('Todas las secciones deben tener al menos una pregunta');
	}

	const totalQuestions = normalized.reduce((total, section) => total + section.question_count, 0);
	if (totalQuestions > MAX_EVALUATION_QUESTIONS) {
		throw new Error(
			`El total de preguntas no puede exceder ${MAX_EVALUATION_QUESTIONS} en una evaluación`
		);
	}

	return normalized;
}

function areSectionsEquivalent(
	left: EvaluationSectionFormItem[],
	right: EvaluationSectionOverview[]
): boolean {
	if (left.length !== right.length) {
		return false;
	}

	return left.every((section, index) => {
		const counterpart = right[index];
		return (
			section.course_code === counterpart.course_code &&
			section.order_in_eval === counterpart.order_in_eval &&
			section.question_count === counterpart.question_count
		);
	});
}

function assertValidQuestionSet(
	questions: EvaluationQuestionUpsertInput[],
	sections: EvaluationSectionOverview[]
): void {
	const totalExpected = sections.reduce((total, section) => total + section.question_count, 0);

	if (questions.length !== totalExpected) {
		throw new Error(
			'La cantidad de claves no coincide con las preguntas definidas en la evaluación'
		);
	}

	const orderSet = new Set<number>();

	for (const question of questions) {
		if (!VALID_ANSWER_KEYS.has(question.correctKey)) {
			throw new Error('La evaluación contiene respuestas correctas inválidas');
		}

		if (!Number.isInteger(question.orderInEval) || question.orderInEval <= 0) {
			throw new Error('El orden global de las preguntas no es válido');
		}

		if (question.scorePercent < 0 || question.scorePercent > 1) {
			throw new Error('Cada ponderación debe estar entre 0 y 1');
		}

		if (orderSet.has(question.orderInEval)) {
			throw new Error('Se detectaron preguntas duplicadas en la secuencia global');
		}

		orderSet.add(question.orderInEval);
	}

	for (const section of sections) {
		const sectionQuestions = questions.filter((question) => question.sectionCode === section.code);

		if (sectionQuestions.length !== section.question_count) {
			throw new Error(
				`La sección ${section.course_name} no tiene la cantidad esperada de preguntas`
			);
		}
	}
}

function mapSavedResultSummary(row: EvaluationSavedResultRow): EvaluationSavedResultSummary {
	return {
		code: row.code,
		enrollment_code: row.enrollment_code,
		enrollment_number: row.enrollment_number,
		roll_code: row.roll_code,
		student_code: row.student_code,
		student_full_name: row.student_full_name,
		student_number: row.student_number,
		student_dni: row.student_dni,
		student_photo_url: row.student_photo_url,
		correct_count: toNumber(row.correct_count),
		incorrect_count: toNumber(row.incorrect_count),
		blank_count: toNumber(row.blank_count),
		score: toNumber(row.score),
		calculated_at: row.calculated_at
	};
}

export class EvaluationRepository {
	static normalizeEvaluationInput(input: EvaluationUpsertInput): EvaluationUpsertInput {
		return {
			evaluationCode: input.evaluationCode?.trim() || undefined,
			name: normalizeRequiredText(input.name, 'El nombre de la evaluación'),
			cycleDegreeCode: normalizeRequiredText(input.cycleDegreeCode, 'Nivel academico seleccionado'),
			groupCode: normalizeRequiredText(input.groupCode, 'El grupo') as GroupCode,
			evalDate: normalizeEvalDate(input.evalDate),
			userCode: normalizeRequiredText(input.userCode, 'El usuario creador'),
			sections: assertValidSections(input.sections)
		};
	}

	static async listEvaluationsByFilters(
		db: Database,
		filters: {
			cycleCode?: string | null;
			cycleDegreeCode?: string | null;
			groupCode?: GroupCode | null;
			search?: string | null;
		}
	): Promise<EvaluationOverview[]> {
		const search = filters.search?.trim() ?? '';
		const searchPattern = search ? buildSearchPattern(search) : '';

		const rows = await db
			.selectFrom('eval_overview')
			.selectAll()
			.$if(Boolean(filters.cycleCode), (qb) => qb.where('cycle_code', '=', filters.cycleCode!))
			.$if(Boolean(filters.cycleDegreeCode), (qb) =>
				qb.where('cycle_degree_code', '=', filters.cycleDegreeCode!)
			)
			.$if(Boolean(filters.groupCode), (qb) => qb.where('group_code', '=', filters.groupCode!))
			.$if(Boolean(search), (qb) =>
				qb.where((eb) =>
					eb.or([
						sql<boolean>`LOWER(name) LIKE ${searchPattern}`,
						sql<boolean>`LOWER(cycle_title) LIKE ${searchPattern}`,
						sql<boolean>`LOWER(degree_name) LIKE ${searchPattern}`
					])
				)
			)
			.orderBy('eval_date', 'desc')
			.orderBy('created_at', 'desc')
			.orderBy('name', 'asc')
			.execute();

		return rows.map((row) => mapEvaluationOverview(row as EvaluationOverviewRow));
	}

	static async getEvaluationByCode(
		db: Database,
		evaluationCode: string
	): Promise<EvaluationOverview | null> {
		const row = await db
			.selectFrom('eval_overview')
			.selectAll()
			.where('code', '=', evaluationCode)
			.executeTakeFirst();

		return row ? mapEvaluationOverview(row as EvaluationOverviewRow) : null;
	}

	static async listQuestions(
		db: Database,
		evaluationCode: string
	): Promise<EvaluationQuestionRecord[]> {
		const rows = await db
			.selectFrom('eval_questions')
			.selectAll()
			.where('eval_code', '=', evaluationCode)
			.orderBy('order_in_eval', 'asc')
			.execute();

		return rows.map((row) => ({
			code: row.code,
			eval_code: row.eval_code,
			section_code: row.section_code,
			order_in_eval: row.order_in_eval,
			correct_key: row.correct_key as EvaluationAnswerKey,
			omitable: row.omitable,
			score_percent: toNumber(row.score_percent)
		}));
	}

	static async hasQuestions(db: DatabaseExecutor, evaluationCode: string): Promise<boolean> {
		const row = await db
			.selectFrom('eval_questions')
			.select('code')
			.where('eval_code', '=', evaluationCode)
			.limit(1)
			.executeTakeFirst();

		return Boolean(row);
	}

	static async createEvaluation(
		db: Database,
		input: EvaluationUpsertInput
	): Promise<{ code: string }> {
		await ensureCycleDegreeExists(db, input.cycleDegreeCode);
		await assertCourseCodes(
			db,
			input.sections.map((section) => section.course_code)
		);

		return db.transaction().execute(async (trx) => {
			const inserted = await trx
				.insertInto('evals')
				.values({
					name: input.name,
					cycle_degree_code: input.cycleDegreeCode,
					group_code: input.groupCode,
					eval_date: normalizeEvalDate(input.evalDate),
					user_code: input.userCode
				})
				.returning('code')
				.executeTakeFirstOrThrow();

			await trx
				.insertInto('eval_sections')
				.values(
					input.sections.map((section) => ({
						eval_code: inserted.code,
						course_code: section.course_code,
						order_in_eval: section.order_in_eval,
						question_count: section.question_count
					}))
				)
				.execute();

			return inserted;
		});
	}

	static async updateEvaluation(db: Database, input: EvaluationUpsertInput): Promise<boolean> {
		if (!input.evaluationCode) {
			throw new Error('La evaluación seleccionada no es válida');
		}

		await ensureCycleDegreeExists(db, input.cycleDegreeCode);
		await assertCourseCodes(
			db,
			input.sections.map((section) => section.course_code)
		);

		return db.transaction().execute(async (trx) => {
			const existing = await trx
				.selectFrom('evals')
				.select('code')
				.where('code', '=', input.evaluationCode!)
				.executeTakeFirst();

			if (!existing) {
				return false;
			}

			const hasQuestions = await this.hasQuestions(trx, input.evaluationCode!);
			if (hasQuestions) {
				const existingSections = await loadSectionRows(trx, input.evaluationCode!);
				if (!areSectionsEquivalent(input.sections, existingSections)) {
					throw new Error(
						'No se pueden modificar las secciones después de configurar las claves de la evaluación'
					);
				}
			}

			const result = await trx
				.updateTable('evals')
				.set({
					name: input.name,
					cycle_degree_code: input.cycleDegreeCode,
					group_code: input.groupCode,
					eval_date: normalizeEvalDate(input.evalDate),
					updated_at: new Date()
				})
				.where('code', '=', input.evaluationCode!)
				.executeTakeFirst();

			if (Number(result.numUpdatedRows ?? 0) === 0) {
				return false;
			}

			if (!hasQuestions) {
				await trx
					.deleteFrom('eval_sections')
					.where('eval_code', '=', input.evaluationCode!)
					.execute();
				await trx
					.insertInto('eval_sections')
					.values(
						input.sections.map((section) => ({
							eval_code: input.evaluationCode!,
							course_code: section.course_code,
							order_in_eval: section.order_in_eval,
							question_count: section.question_count
						}))
					)
					.execute();
			}

			return true;
		});
	}

	static async deleteEvaluation(db: Database, evaluationCode: string): Promise<boolean> {
		const result = await db
			.deleteFrom('evals')
			.where('code', '=', evaluationCode)
			.executeTakeFirst();

		return Number(result.numDeletedRows ?? 0) > 0;
	}

	static async replaceQuestions(
		db: Database,
		evaluationCode: string,
		questions: EvaluationQuestionUpsertInput[]
	): Promise<void> {
		const sections = await loadSectionRows(db, evaluationCode);

		if (sections.length === 0) {
			throw new Error('La evaluación no tiene secciones configuradas');
		}

		assertValidQuestionSet(questions, sections);

		await db.transaction().execute(async (trx) => {
			await trx.deleteFrom('eval_questions').where('eval_code', '=', evaluationCode).execute();

			await trx
				.insertInto('eval_questions')
				.values(
					questions.map((question) => ({
						eval_code: evaluationCode,
						section_code: question.sectionCode,
						order_in_eval: question.orderInEval,
						correct_key: question.correctKey,
						omitable: question.omitable,
						score_percent: question.scorePercent
					}))
				)
				.execute();
		});
	}

	static async listSections(
		db: Database,
		evaluationCode: string
	): Promise<EvaluationSectionOverview[]> {
		return loadSectionRows(db, evaluationCode);
	}

	static async findEnrollmentForProcessing(
		db: Database,
		filters: {
			cycleDegreeCode: string;
			groupCode: GroupCode;
			rollCode: string;
		}
	): Promise<{
		enrollment_code: string;
		enrollment_number: string;
		roll_code: string;
		student: EvaluationProcessingStudentSummary;
	} | null> {
		const row = await db
			.selectFrom('enrollment_overview as eo')
			.innerJoin('students as s', 's.code', 'eo.student_code')
			.select([
				'eo.code as enrollment_code',
				'eo.enrollment_number',
				'eo.roll_code',
				'eo.student_code',
				'eo.student_full_name',
				'eo.student_number',
				'eo.student_dni',
				's.photo_url as student_photo_url'
			])
			.where('eo.cycle_degree_code', '=', filters.cycleDegreeCode)
			.where('eo.group_code', '=', filters.groupCode)
			.where('eo.roll_code', '=', filters.rollCode)
			.where('eo.status', 'in', ['active', 'finalized'])
			.orderBy('eo.updated_at', 'desc')
			.executeTakeFirst();

		if (!row) {
			return null;
		}

		const enrollment = row as EvaluationProcessingEnrollmentRow;

		return {
			enrollment_code: enrollment.enrollment_code,
			enrollment_number: enrollment.enrollment_number,
			roll_code: enrollment.roll_code,
			student: {
				code: enrollment.student_code,
				full_name: enrollment.student_full_name,
				student_number: enrollment.student_number,
				dni: enrollment.student_dni,
				photo_url: enrollment.student_photo_url
			}
		};
	}

	static async replaceProcessedResult(
		db: Database,
		input: EvaluationResultReplacementInput
	): Promise<void> {
		const questions = await db
			.selectFrom('eval_questions')
			.select(['code', 'section_code'])
			.where('eval_code', '=', input.evaluationCode)
			.orderBy('order_in_eval', 'asc')
			.execute();

		if (questions.length === 0) {
			throw new Error('La evaluación no tiene claves configuradas');
		}

		const questionCodeSet = new Set(questions.map((question) => question.code));
		const answerQuestionCodes = new Set(input.answers.map((answer) => answer.question_code));

		if (input.answers.length !== questions.length || answerQuestionCodes.size !== questions.length) {
			throw new Error('La cantidad de respuestas no coincide con la evaluación seleccionada');
		}

		if (input.answers.some((answer) => !questionCodeSet.has(answer.question_code))) {
			throw new Error('La carga contiene respuestas que no pertenecen a la evaluación');
		}

		const questionCodes = questions.map((question) => question.code);

		await db.transaction().execute(async (trx) => {
			await trx
				.deleteFrom('eval_answers')
				.where('enrollment_code', '=', input.enrollmentCode)
				.where('question_code', 'in', questionCodes)
				.execute();

			await trx
				.insertInto('eval_answers')
				.values(
					input.answers.map((answer) => ({
						enrollment_code: input.enrollmentCode,
						question_code: answer.question_code,
						student_answer: answer.student_answer
					}))
				)
				.execute();

			await trx
				.deleteFrom('eval_results')
				.where('enrollment_code', '=', input.enrollmentCode)
				.where('eval_code', '=', input.evaluationCode)
				.execute();

			await trx
				.insertInto('eval_results')
				.values([
					{
						enrollment_code: input.enrollmentCode,
						eval_code: input.evaluationCode,
						section_code: null,
						correct_count: input.general.correct_count,
						incorrect_count: input.general.incorrect_count,
						blank_count: input.general.blank_count,
						score: input.general.score
					},
					...input.sections.map((section) => ({
						enrollment_code: input.enrollmentCode,
						eval_code: input.evaluationCode,
						section_code: section.section_code,
						correct_count: section.correct_count,
						incorrect_count: section.incorrect_count,
						blank_count: section.blank_count,
						score: section.score
					}))
				])
				.execute();
		});
	}

	static async countSavedResults(db: Database, evaluationCode: string): Promise<number> {
		const row = await db
			.selectFrom('eval_results')
			.select((eb) => eb.fn.count<string>('code').as('count'))
			.where('eval_code', '=', evaluationCode)
			.where('section_code', 'is', null)
			.executeTakeFirst();

		return toNumber(row?.count);
	}

	static async listSavedResults(
		db: Database,
		evaluationCode: string
	): Promise<EvaluationSavedResultSummary[]> {
		const rows = await db
			.selectFrom('eval_results as er')
			.innerJoin('enrollment_overview as eo', 'eo.code', 'er.enrollment_code')
			.innerJoin('students as s', 's.code', 'eo.student_code')
			.select([
				'er.code',
				'er.enrollment_code',
				'eo.enrollment_number',
				'eo.roll_code',
				'eo.student_code',
				'eo.student_full_name',
				'eo.student_number',
				'eo.student_dni',
				's.photo_url as student_photo_url',
				'er.correct_count',
				'er.incorrect_count',
				'er.blank_count',
				'er.score',
				'er.calculated_at'
			])
			.where('er.eval_code', '=', evaluationCode)
			.where('er.section_code', 'is', null)
			.orderBy('eo.roll_code', 'asc')
			.orderBy('eo.student_full_name', 'asc')
			.execute();

		return rows.map((row) => mapSavedResultSummary(row as EvaluationSavedResultRow));
	}

	static async deleteSavedResults(
		db: Database,
		evaluationCode: string,
		resultCodes: string[] = []
	): Promise<number> {
		return db.transaction().execute(async (trx) => {
			const targetRows = await trx
				.selectFrom('eval_results')
				.select(['code', 'enrollment_code'])
				.where('eval_code', '=', evaluationCode)
				.where('section_code', 'is', null)
				.$if(resultCodes.length > 0, (qb) => qb.where('code', 'in', resultCodes))
				.execute();

			const enrollmentCodes = Array.from(
				new Set(targetRows.map((row) => row.enrollment_code).filter(Boolean))
			);

			if (enrollmentCodes.length === 0) {
				return 0;
			}

			const questionCodes = await trx
				.selectFrom('eval_questions')
				.select('code')
				.where('eval_code', '=', evaluationCode)
				.execute();

			if (questionCodes.length > 0) {
				await trx
					.deleteFrom('eval_answers')
					.where('enrollment_code', 'in', enrollmentCodes)
					.where(
						'question_code',
						'in',
						questionCodes.map((question) => question.code)
					)
					.execute();
			}

			await trx
				.deleteFrom('eval_results')
				.where('eval_code', '=', evaluationCode)
				.where('enrollment_code', 'in', enrollmentCodes)
				.execute();

			return enrollmentCodes.length;
		});
	}
}
