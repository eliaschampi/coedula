<script lang="ts">
	import { Alert, Card, Chip, Dialog, Table, Tabs, type TableRow } from '$lib/components';
	import type { EvaluationProcessingSuccessData } from '$lib/types/evaluation';

	interface Props {
		open?: boolean;
		result: EvaluationProcessingSuccessData | null;
		onclose?: () => void;
	}

	let { open = $bindable(false), result, onclose }: Props = $props();

	let activeTab = $state<'summary' | 'answers'>('summary');
	const answerRows = $derived((result?.answers ?? []) as unknown as TableRow[]);
	const sectionRows = $derived(
		Object.entries(result?.scores.by_section ?? {}).map(([sectionCode, section]) => ({
			id: sectionCode,
			section_code: sectionCode,
			...section
		})) as unknown as TableRow[]
	);
	const tabs = $derived([
		{ value: 'summary', label: 'Resumen', icon: 'chartBar' },
		{ value: 'answers', label: 'Respuestas', icon: 'listChecks' }
	]);

	function formatStudentAnswer(answer: EvaluationProcessingSuccessData['answers'][number]): string {
		if (answer.student_answer === null) return '-';
		if (answer.student_answer === 'error_multiple') return 'Múltiple';
		return answer.student_answer;
	}

	function getAnswerStatus(answer: EvaluationProcessingSuccessData['answers'][number]): {
		label: string;
		color: 'success' | 'warning' | 'danger';
	} {
		if (answer.is_blank) {
			return { label: 'En blanco', color: 'warning' };
		}

		if (answer.is_multiple) {
			return { label: 'Múltiple', color: 'danger' };
		}

		return answer.is_correct
			? { label: 'Correcta', color: 'success' }
			: { label: 'Incorrecta', color: 'danger' };
	}

	function getScoreColor(score: number): 'success' | 'warning' | 'danger' {
		if (score >= 14) return 'success';
		if (score >= 10.5) return 'warning';
		return 'danger';
	}

	$effect(() => {
		if (!open) {
			activeTab = 'summary';
		}
	});
</script>

<Dialog bind:open size="lg" title="Detalle del procesamiento" scrollable onclose={onclose}>
	{#if result}
		<div class="lumi-stack lumi-stack--md">
			<div class="lumi-stack lumi-stack--2xs">
				<h3 class="lumi-margin--none">Código de lista {result.roll_code}</h3>
				<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
					{#if result.student}
						{result.student.full_name} · {result.student.student_number}
					{:else}
						No se encontró matrícula asociada para esta hoja
					{/if}
				</p>
			</div>

			{#if !result.student}
				<Alert type="warning" closable={false}>
					La hoja fue procesada, pero no existe una matrícula válida para guardar este resultado.
				</Alert>
			{/if}

			<Tabs bind:value={activeTab} {tabs} />

			{#if activeTab === 'summary'}
				<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-md">
					<Card spaced class="evaluation-process-dialog__metric">
						<p class="evaluation-process-dialog__metric-label">Correctas</p>
						<strong class="evaluation-process-dialog__metric-value evaluation-process-dialog__metric-value--success">
							{result.scores.general.correct_count}
						</strong>
					</Card>
					<Card spaced class="evaluation-process-dialog__metric">
						<p class="evaluation-process-dialog__metric-label">Incorrectas</p>
						<strong class="evaluation-process-dialog__metric-value evaluation-process-dialog__metric-value--danger">
							{result.scores.general.incorrect_count}
						</strong>
					</Card>
					<Card spaced class="evaluation-process-dialog__metric">
						<p class="evaluation-process-dialog__metric-label">En blanco</p>
						<strong class="evaluation-process-dialog__metric-value evaluation-process-dialog__metric-value--warning">
							{result.scores.general.blank_count}
						</strong>
					</Card>
					<Card spaced class="evaluation-process-dialog__metric">
						<p class="evaluation-process-dialog__metric-label">Nota</p>
						<strong class="evaluation-process-dialog__metric-value">
							<Chip color={getScoreColor(result.scores.general.score)} size="sm">
								{result.scores.general.score.toFixed(2)} / 20
							</Chip>
						</strong>
					</Card>
				</div>

				<Card spaced>
					<div class="lumi-stack lumi-stack--sm">
						<div class="lumi-stack lumi-stack--2xs">
							<h4 class="lumi-margin--none">Detalle por sección</h4>
							<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
								La nota respeta la ponderación y la lógica de preguntas omitibles.
							</p>
						</div>

						<Table data={sectionRows} hover>
							{#snippet thead()}
								<th>Sección</th>
								<th>Correctas</th>
								<th>Incorrectas</th>
								<th>Blanco</th>
								<th>Nota</th>
							{/snippet}

							{#snippet row({ row })}
								<td>{row.section_name}</td>
								<td>{row.correct_count}</td>
								<td>{row.incorrect_count}</td>
								<td>{row.blank_count}</td>
								<td>
									<Chip color={getScoreColor(Number(row.score))} size="sm">
										{Number(row.score).toFixed(2)}
									</Chip>
								</td>
							{/snippet}
						</Table>
					</div>
				</Card>
			{:else}
				<Card spaced>
					<Table data={answerRows} pagination hover itemsPerPage={15}>
						{#snippet thead()}
							<th>Pregunta</th>
							<th>Marcada</th>
							<th>Clave</th>
							<th>Sección</th>
							<th>Estado</th>
						{/snippet}

						{#snippet row({ row })}
							{@const answer = row as unknown as EvaluationProcessingSuccessData['answers'][number]}
							<td>{answer.order_in_eval}</td>
							<td>
								<Chip color="primary" size="sm">{formatStudentAnswer(answer)}</Chip>
							</td>
							<td>
								<Chip color="secondary" size="sm">{answer.correct_key}</Chip>
							</td>
							<td>{answer.section_name ?? 'Sin sección'}</td>
							<td>
								<Chip color={getAnswerStatus(answer).color} size="sm">
									{getAnswerStatus(answer).label}
								</Chip>
							</td>
						{/snippet}
					</Table>
				</Card>
			{/if}
		</div>
	{/if}
</Dialog>

<style>
	:global(.evaluation-process-dialog__metric) {
		min-height: 100%;
	}

	.evaluation-process-dialog__metric-label {
		margin: 0;
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.evaluation-process-dialog__metric-value {
		display: inline-flex;
		align-items: center;
		margin-top: var(--lumi-space-xs);
		font-size: var(--lumi-font-size-2xl);
		font-weight: var(--lumi-font-weight-bold);
	}

	.evaluation-process-dialog__metric-value--success {
		color: var(--lumi-color-success);
	}

	.evaluation-process-dialog__metric-value--danger {
		color: var(--lumi-color-danger);
	}

	.evaluation-process-dialog__metric-value--warning {
		color: var(--lumi-color-warning);
	}

	@media (max-width: 900px) {
		:global(.evaluation-process-dialog__metric .lumi-card__body) {
			padding: var(--lumi-space-sm);
		}
	}
</style>
