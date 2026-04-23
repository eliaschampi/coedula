<script lang="ts">
	import { untrack } from 'svelte';
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

	const canUpdate = $derived(can('evaluations:update'));

	let activeSectionCode = $state(untrack(() => data.sections[0]?.code ?? ''));
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
	const activeAnsweredQuestions = $derived(
		activeQuestions.filter((question) => question.correct_key).length
	);
	const activeSectionCompletion = $derived(
		activeSection ? Math.round((activeAnsweredQuestions * 100) / activeSection.question_count) : 0
	);
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
		title="Claves de evaluación"
		subtitle="Configura la secuencia OMR por curso con una vista más compacta y rápida."
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

	<div class="lumi-filter-summary lumi-filter-summary--secondary">
		<div class="lumi-filter-summary__copy">
			<p class="lumi-filter-summary__eyebrow">Secuencia activa</p>
			<h2 class="lumi-filter-summary__title">{data.evaluation.name}</h2>
			<p class="lumi-filter-summary__subtitle">
				{data.evaluation.cycle_title} · {formatAcademicDegreeLabel(data.evaluation.degree_name)} ·
				{formatGroupCode(data.evaluation.group_code)} ·
				{formatEducationDate(data.evaluation.eval_date)}
			</p>
		</div>

		<div class="lumi-filter-summary__meta">
			<Chip color={isComplete ? 'success' : 'primary'} size="sm">
				{Math.round(completionPercentage)}% completo
			</Chip>
			<Chip color="info" size="sm">
				{answeredQuestions}/{totalQuestions} claves
			</Chip>
			<Chip color="secondary" size="sm">{data.sections.length} cursos</Chip>
			<Chip color={isComplete ? 'success' : 'warning'} size="sm">
				{isComplete ? 'Lista' : 'Pendiente'}
			</Chip>
		</div>
	</div>

	<Card spaced>
		<div class="lumi-stack lumi-stack--md">
			<div class="lumi-section-toolbar">
				<div class="lumi-section-toolbar__copy">
					<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Secuencia global</p>
					<h2 class="lumi-margin--none">
						{answeredQuestions} / {totalQuestions} preguntas con clave asignada
					</h2>
					<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
						Las preguntas respetan el orden global continuo entre secciones, igual que en Nextya.
					</p>
				</div>

				<div class="lumi-section-toolbar__actions">
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
					<section class="evaluation-keys__section-panel">
						<div class="lumi-stack lumi-stack--md">
							<div class="lumi-section-toolbar">
								<div class="lumi-section-toolbar__copy">
									<h3 class="lumi-margin--none">{activeSection.course_name}</h3>
									<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
										Orden {activeSection.order_in_eval} · {activeSection.question_count} preguntas
									</p>
								</div>
								<Chip color="primary" size="sm">
									{activeSectionCompletion}% completado
								</Chip>
							</div>

							<div class="evaluation-keys__question-list lumi-scrollbar">
								{#each activeQuestions as question (question.order_in_eval)}
									{@const localIndex = getLocalEvaluationQuestionIndex(
										question.order_in_eval,
										activeSection.code,
										sectionStarts
									)}
									<div class="evaluation-keys__question-row">
										<div class="evaluation-keys__question-main">
											<div class="evaluation-keys__question-title">
												<span class="lumi-font--medium">Pregunta {localIndex}</span>
												<Chip color="info" size="sm">Global {question.order_in_eval}</Chip>
												{#if question.correct_key}
													<Chip color="success" size="sm">Clave {question.correct_key}</Chip>
												{:else}
													<Chip color="warning" size="sm">Pendiente</Chip>
												{/if}
											</div>

											<div class="evaluation-keys__answer-group">
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
										</div>

										<div class="evaluation-keys__question-controls">
											<Switch
												checked={question.omitable}
												label="Omitible"
												disabled={!canUpdate}
												onchange={(checked) =>
													updateOmitable(activeSection.code, question, checked)}
											/>

											<div class="evaluation-keys__score-field">
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
										</div>
									</div>
								{/each}
							</div>
						</div>
					</section>
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

<style>
	.evaluation-keys__section-panel {
		padding: var(--lumi-space-md);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-xl);
		background:
			linear-gradient(
				145deg,
				color-mix(in srgb, var(--lumi-color-primary) 5%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-info) 4%, transparent) 100%
			),
			color-mix(in srgb, var(--lumi-color-surface) 92%, transparent);
	}

	.evaluation-keys__question-list {
		display: grid;
		gap: var(--lumi-space-xs);
		max-block-size: 52rem;
		overflow-y: auto;
		padding-right: var(--lumi-space-2xs);
	}

	.evaluation-keys__question-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(14rem, auto);
		align-items: center;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-lg);
		background: color-mix(in srgb, var(--lumi-color-surface) 86%, var(--lumi-color-background) 14%);
	}

	.evaluation-keys__question-main,
	.evaluation-keys__question-title,
	.evaluation-keys__answer-group,
	.evaluation-keys__question-controls {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
		min-width: 0;
	}

	.evaluation-keys__question-main {
		flex-wrap: wrap;
	}

	.evaluation-keys__question-title {
		flex: 1 1 13rem;
		flex-wrap: wrap;
	}

	.evaluation-keys__answer-group,
	.evaluation-keys__question-controls {
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.evaluation-keys__score-field {
		display: grid;
		gap: var(--lumi-space-2xs);
		min-width: 8rem;
	}

	@media (max-width: 900px) {
		.evaluation-keys__question-row {
			grid-template-columns: 1fr;
			align-items: stretch;
		}

		.evaluation-keys__answer-group,
		.evaluation-keys__question-controls {
			justify-content: flex-start;
		}
	}

	@media (max-width: 640px) {
		.evaluation-keys__question-row {
			padding: var(--lumi-space-sm);
		}

		.evaluation-keys__question-controls {
			align-items: flex-start;
			flex-direction: column;
		}

		.evaluation-keys__score-field {
			width: 100%;
		}
	}
</style>
