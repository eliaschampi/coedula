<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import {
		Alert,
		Button,
		Card,
		Chip,
		Dialog,
		EmptyState,
		NumberInput,
		PageHeader,
		StatCard,
		Switch,
		Tabs,
		Textarea
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import type { EvaluationQuestionDraft } from '$lib/types/evaluation';
	import {
		EVALUATION_ANSWER_KEYS,
		applyEvaluationKeyString,
		buildEvaluationKeyString,
		buildEvaluationSectionStarts,
		formatAcademicDegreeLabel,
		formatEducationDate,
		formatGroupCode,
		getLocalEvaluationQuestionIndex
	} from '$lib/utils';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
	const getInitialActiveSectionCode = () => data.sections[0]?.code ?? '';
	const initialActiveSectionCode = getInitialActiveSectionCode();

	const canUpdate = $derived(can('evaluations:update'));

	let activeSectionCode = $state(initialActiveSectionCode);
	let errorMessage = $state('');
	let pasteDialogOpen = $state(false);
	let pasteContent = $state('');
	let pasteError = $state('');
	let sectionQuestions = $state<Record<string, EvaluationQuestionDraft[]>>({});

	const sectionStarts = $derived(buildEvaluationSectionStarts(data.sections));
	const allQuestions = $derived(
		Object.values(sectionQuestions)
			.flat()
			.sort((left, right) => left.order_in_eval - right.order_in_eval)
	);
	const totalQuestions = $derived(allQuestions.length);
	const answeredQuestions = $derived(
		allQuestions.filter((question) => question.correct_key.length > 0).length
	);
	const completionPercentage = $derived(
		totalQuestions > 0 ? Number(((answeredQuestions * 100) / totalQuestions).toFixed(2)) : 0
	);
	const isComplete = $derived(totalQuestions > 0 && answeredQuestions === totalQuestions);
	const activeSection = $derived(
		data.sections.find((section) => section.code === activeSectionCode) ?? null
	);
	const activeQuestions = $derived(sectionQuestions[activeSectionCode] ?? []);
	const sectionTabs = $derived(
		data.sections.map((section) => ({
			value: section.code,
			label: `${section.course_name} · ${section.question_count}`,
			icon: 'bookOpenCheck'
		}))
	);

	function submitForm(formId: string): void {
		const form = document.getElementById(formId);
		if (form instanceof HTMLFormElement) {
			form.requestSubmit();
		}
	}

	function initializeQuestions(): void {
		if (data.existingQuestions.length > 0) {
			const grouped = data.existingQuestions.reduce<Record<string, EvaluationQuestionDraft[]>>(
				(acc, question) => {
					if (!acc[question.section_code]) {
						acc[question.section_code] = [];
					}

					acc[question.section_code] = [
						...acc[question.section_code],
						{
							...question,
							correct_key: question.correct_key
						}
					];
					return acc;
				},
				{}
			);

			for (const [sectionCode, questions] of Object.entries(grouped)) {
				grouped[sectionCode] = [...questions].sort(
					(left, right) => left.order_in_eval - right.order_in_eval
				);
			}

			sectionQuestions = grouped;
			return;
		}

		sectionQuestions = data.sections.reduce<Record<string, EvaluationQuestionDraft[]>>(
			(acc, section) => {
				const start = sectionStarts[section.code] ?? 1;
				acc[section.code] = Array.from({ length: section.question_count }, (_, index) => ({
					code: crypto.randomUUID(),
					eval_code: data.evaluation.code,
					section_code: section.code,
					order_in_eval: start + index,
					correct_key: '',
					omitable: false,
					score_percent: 1
				}));
				return acc;
			},
			{}
		);
	}

	function updateQuestion(
		sectionCode: string,
		orderInEval: number,
		updater: (question: EvaluationQuestionDraft) => EvaluationQuestionDraft
	): void {
		const questions = sectionQuestions[sectionCode] ?? [];
		sectionQuestions = {
			...sectionQuestions,
			[sectionCode]: questions.map((question) =>
				question.order_in_eval === orderInEval ? updater(question) : question
			)
		};
	}

	function toggleCorrectKey(
		sectionCode: string,
		question: EvaluationQuestionDraft,
		key: string
	): void {
		const nextValue = (
			question.correct_key === key ? '' : key
		) as EvaluationQuestionDraft['correct_key'];
		updateQuestion(sectionCode, question.order_in_eval, (current) => ({
			...current,
			correct_key: nextValue
		}));
	}

	function updateOmitable(
		sectionCode: string,
		question: EvaluationQuestionDraft,
		checked: boolean
	): void {
		updateQuestion(sectionCode, question.order_in_eval, (current) => ({
			...current,
			omitable: checked
		}));
	}

	function updateScore(
		sectionCode: string,
		question: EvaluationQuestionDraft,
		scorePercent: number
	): void {
		updateQuestion(sectionCode, question.order_in_eval, (current) => ({
			...current,
			score_percent: Number(scorePercent.toFixed(2))
		}));
	}

	function clearAllKeys(): void {
		sectionQuestions = Object.fromEntries(
			Object.entries(sectionQuestions).map(([sectionCode, questions]) => [
				sectionCode,
				questions.map((question) => ({
					...question,
					correct_key: ''
				}))
			])
		);
		showToast('Todas las claves se limpiaron correctamente', 'success');
	}

	async function copyAllKeys(): Promise<void> {
		try {
			await navigator.clipboard.writeText(buildEvaluationKeyString(allQuestions));
			showToast('Claves copiadas al portapapeles', 'success');
		} catch {
			showToast('No se pudieron copiar las claves', 'warning');
		}
	}

	function openPasteDialog(): void {
		pasteContent = '';
		pasteError = '';
		pasteDialogOpen = true;
	}

	function closePasteDialog(): void {
		pasteDialogOpen = false;
		pasteContent = '';
		pasteError = '';
	}

	function applyPastedKeys(): void {
		const normalized = pasteContent.trim().toUpperCase();
		if (!normalized) {
			pasteError = 'Debes ingresar al menos una clave';
			return;
		}

		if (!/^[A-E]+$/.test(normalized)) {
			pasteError = 'Solo se permiten letras A, B, C, D o E';
			return;
		}

		if (normalized.length > totalQuestions) {
			pasteError = `No puedes pegar más de ${totalQuestions} respuestas`;
			return;
		}

		const appliedQuestions = applyEvaluationKeyString(allQuestions, normalized);
		const bySection = appliedQuestions.reduce<Record<string, EvaluationQuestionDraft[]>>(
			(acc, question) => {
				if (!acc[question.section_code]) {
					acc[question.section_code] = [];
				}
				acc[question.section_code] = [...acc[question.section_code], question];
				return acc;
			},
			{}
		);

		sectionQuestions = data.sections.reduce<Record<string, EvaluationQuestionDraft[]>>(
			(acc, section) => {
				acc[section.code] = [...(bySection[section.code] ?? [])].sort(
					(left, right) => left.order_in_eval - right.order_in_eval
				);
				return acc;
			},
			{}
		);
		showToast(
			normalized.length === totalQuestions
				? 'Claves aplicadas correctamente'
				: `${normalized.length} de ${totalQuestions} claves aplicadas`,
			'success'
		);
		closePasteDialog();
	}

	initializeQuestions();
</script>

<div class="lumi-stack lumi-stack--md">
	<PageHeader
		title={`Claves · ${data.evaluation.name}`}
		subtitle={`${data.evaluation.cycle_title} · ${formatAcademicDegreeLabel(data.evaluation.degree_name)} · ${formatGroupCode(data.evaluation.group_code)} · ${formatEducationDate(data.evaluation.eval_date)}`}
		icon="key"
	>
		{#snippet actions()}
			<div class="lumi-flex lumi-flex--gap-sm lumi-flex--wrap">
				<Button type="border" icon="arrowLeft" onclick={() => goto(resolve(data.returnTo as '/'))}>
					Volver
				</Button>
				<Button
					type="filled"
					color="primary"
					icon="check"
					disabled={!isComplete || !canUpdate}
					onclick={() => submitForm('evaluation-keys-form')}
				>
					Guardar claves
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-md">
		<StatCard
			title="Progreso"
			value={`${Math.round(completionPercentage)}%`}
			icon="badgeCheck"
			color={isComplete ? 'success' : 'primary'}
			subtitle={`${answeredQuestions} de ${totalQuestions} preguntas completas`}
		/>
		<StatCard
			title="Cursos"
			value={String(data.sections.length)}
			icon="bookOpenCheck"
			color="secondary"
			subtitle="Secciones registradas en esta evaluación"
		/>
		<StatCard
			title="Preguntas"
			value={String(totalQuestions)}
			icon="listChecks"
			color="info"
			subtitle="Total global según la estructura definida"
		/>
		<StatCard
			title="Estado"
			value={isComplete ? 'Lista' : 'Pendiente'}
			icon={isComplete ? 'checkCircle' : 'clock'}
			color={isComplete ? 'success' : 'warning'}
			subtitle={isComplete ? 'La evaluación ya tiene todas sus claves' : 'Aún faltan respuestas'}
		/>
	</div>

	<Card spaced>
		<div class="lumi-stack lumi-stack--md">
			<div
				class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--gap-sm lumi-flex--wrap"
			>
				<div class="lumi-stack lumi-stack--2xs">
					<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Secuencia global</p>
					<h2 class="lumi-margin--none">
						{answeredQuestions} / {totalQuestions} preguntas con clave asignada
					</h2>
					<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
						Las preguntas respetan el orden global continuo entre secciones, igual que en Nextya.
					</p>
				</div>

				<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
					<Button type="border" size="sm" icon="copy" onclick={copyAllKeys} disabled={!isComplete}>
						Copiar
					</Button>
					<Button
						type="border"
						size="sm"
						icon="clipboard"
						onclick={openPasteDialog}
						disabled={!canUpdate}
					>
						Pegar
					</Button>
					<Button
						type="border"
						size="sm"
						color="danger"
						icon="rotateCcw"
						onclick={clearAllKeys}
						disabled={!canUpdate}
					>
						Limpiar
					</Button>
				</div>
			</div>

			{#if !canUpdate}
				<Alert type="warning" closable={false}>
					Tienes acceso de lectura, pero no permisos para guardar cambios en las claves.
				</Alert>
			{/if}

			<form
				id="evaluation-keys-form"
				method="POST"
				action="?/saveQuestions"
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success') {
							showToast('Claves guardadas exitosamente', 'success');
							await goto(resolve(data.returnTo as '/'));
							return;
						}

						if (result.type === 'failure') {
							const error = result.data?.error;
							errorMessage =
								typeof error === 'string' && error.length > 0
									? error
									: 'No se pudieron guardar las claves';
						}
					};
				}}
			>
				{#if errorMessage}
					<Alert type="danger" closable onclose={() => (errorMessage = '')}>
						{errorMessage}
					</Alert>
				{/if}

				{#each data.sections as section (section.code)}
					{#each sectionQuestions[section.code] ?? [] as question (question.order_in_eval)}
						{@const localIndex = getLocalEvaluationQuestionIndex(
							question.order_in_eval,
							section.code,
							sectionStarts
						)}
						<input
							type="hidden"
							name={`question_${section.code}_${localIndex}`}
							value={question.correct_key}
						/>
						{#if question.omitable}
							<input type="hidden" name={`omitable_${section.code}_${localIndex}`} value="on" />
						{/if}
						<input
							type="hidden"
							name={`score_${section.code}_${localIndex}`}
							value={String(question.score_percent)}
						/>
					{/each}
				{/each}
			</form>

			{#if data.sections.length === 0}
				<EmptyState
					title="La evaluación no tiene secciones"
					description="Regresa al módulo de evaluaciones y completa primero la estructura de cursos."
					icon="bookOpenCheck"
				/>
			{:else}
				<Tabs bind:value={activeSectionCode} tabs={sectionTabs} color="primary" />

				{#if activeSection}
					<Card spaced>
						<div class="lumi-stack lumi-stack--md">
							<div
								class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--gap-sm lumi-flex--wrap"
							>
								<div class="lumi-stack lumi-stack--2xs">
									<h3 class="lumi-margin--none">{activeSection.course_name}</h3>
									<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
										Orden {activeSection.order_in_eval} · {activeSection.question_count} preguntas
									</p>
								</div>
								<Chip color="primary" size="sm">
									{(activeQuestions.filter((question) => question.correct_key).length /
										activeSection.question_count) *
										100 || 0}
									% completado
								</Chip>
							</div>

							<div class="lumi-stack lumi-stack--sm">
								{#each activeQuestions as question (question.order_in_eval)}
									{@const localIndex = getLocalEvaluationQuestionIndex(
										question.order_in_eval,
										activeSection.code,
										sectionStarts
									)}
									<Card spaced>
										<div class="lumi-stack lumi-stack--sm">
											<div
												class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--gap-sm lumi-flex--wrap"
											>
												<div
													class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap lumi-align-items--center"
												>
													<span class="lumi-font--medium">Pregunta {localIndex}</span>
													<Chip color="info" size="sm">
														Global {question.order_in_eval}
													</Chip>
													{#if question.correct_key}
														<Chip color="success" size="sm">
															Clave {question.correct_key}
														</Chip>
													{/if}
												</div>
												<Switch
													checked={question.omitable}
													label="Omitible"
													disabled={!canUpdate}
													onchange={(checked) =>
														updateOmitable(activeSection.code, question, checked)}
												/>
											</div>

											<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
												{#each EVALUATION_ANSWER_KEYS as key (key)}
													<Button
														type={question.correct_key === key ? 'filled' : 'border'}
														color={question.correct_key === key ? 'primary' : 'info'}
														size="sm"
														disabled={!canUpdate}
														onclick={() => toggleCorrectKey(activeSection.code, question, key)}
													>
														{key}
													</Button>
												{/each}
											</div>

											<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
												<div class="lumi-stack lumi-stack--2xs">
													<span class="lumi-text--xs lumi-text--muted">Ponderación</span>
													<NumberInput
														value={question.score_percent}
														min={0}
														max={1}
														step={0.05}
														disabled={!canUpdate}
														onchange={(value) => updateScore(activeSection.code, question, value)}
													/>
												</div>
												<div class="lumi-stack lumi-stack--2xs">
													<span class="lumi-text--xs lumi-text--muted">Estado</span>
													<Chip color={question.correct_key ? 'success' : 'warning'} size="sm">
														{question.correct_key
															? `Clave configurada (${question.correct_key})`
															: 'Pendiente'}
													</Chip>
												</div>
											</div>
										</div>
									</Card>
								{/each}
							</div>
						</div>
					</Card>
				{/if}
			{/if}
		</div>
	</Card>
</div>

<Dialog bind:open={pasteDialogOpen} title="Pegar claves" size="md">
	<div class="lumi-stack lumi-stack--md">
		<Textarea
			bind:value={pasteContent}
			label="Secuencia de respuestas"
			placeholder="Ejemplo: ABCDEABCDE"
			hint={`Puedes pegar hasta ${totalQuestions} letras usando solo A, B, C, D o E.`}
		/>

		{#if pasteError}
			<Alert type="danger" closable onclose={() => (pasteError = '')}>
				{pasteError}
			</Alert>
		{/if}
	</div>

	{#snippet footer()}
		<Button type="border" onclick={closePasteDialog}>Cancelar</Button>
		<Button type="filled" color="primary" onclick={applyPastedKeys}>Aplicar</Button>
	{/snippet}
</Dialog>
