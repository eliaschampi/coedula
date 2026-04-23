<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import {
		Avatar,
		Button,
		Card,
		Chip,
		InfoItem,
		PageHeader,
		StatCard,
		Table,
		Tabs,
		type TableRow
	} from '$lib/components';
	import {
		buildStudentPhotoUrl,
		formatAcademicDegreeLabel,
		formatEducationDate,
		formatEnrollmentStatus,
		formatEnrollmentTurn,
		formatGroupCode
	} from '$lib/utils';
	import type { EvaluationProcessedAnswer } from '$lib/types/evaluation';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	let activeTab = $state<'summary' | 'answers'>('summary');

	const result = $derived(data.result);
	const tabs = [
		{ value: 'summary', label: 'Resumen', icon: 'chartBar' },
		{ value: 'answers', label: 'Respuestas', icon: 'listChecks' }
	];
	const sectionRows = $derived(data.result.sections as unknown as TableRow[]);
	const answerRows = $derived(data.result.answers as unknown as TableRow[]);

	function getScoreColor(score: number): 'success' | 'warning' | 'danger' {
		if (score >= 14) return 'success';
		if (score >= 10.5) return 'warning';
		return 'danger';
	}

	function formatStudentAnswer(answer: EvaluationProcessedAnswer): string {
		if (answer.student_answer === null) return '-';
		if (answer.student_answer === 'error_multiple') return 'Múltiple';
		return answer.student_answer;
	}

	function getAnswerStatus(answer: EvaluationProcessedAnswer): {
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

	function openStudentHistory(): void {
		void goto(
			resolve(
				`/evaluations/results/student?student=${encodeURIComponent(result.student.code)}` as '/'
			)
		);
	}
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader
		title={result.evaluation.name}
		subtitle={`Resultado guardado para ${result.student.full_name}`}
		icon="badgeCheck"
	>
		{#snippet actions()}
			<Button type="border" icon="userRound" onclick={openStudentHistory}>
				Historial del alumno
			</Button>
			<Button
				type="border"
				icon="arrowLeft"
				onclick={() => void goto(resolve(data.returnTo as '/'))}
			>
				Volver
			</Button>
		{/snippet}
	</PageHeader>

	<Card>
		<div class="evaluation-result-detail__hero">
			<div class="evaluation-result-detail__identity">
				<Avatar
					src={result.student.photo_url
						? buildStudentPhotoUrl(result.student.photo_url, 'preview')
						: ''}
					text={result.student.full_name}
					size="xl"
					color="primary"
				/>
				<div class="lumi-stack lumi-stack--2xs">
					<div class="evaluation-result-detail__title-row">
						<h2 class="evaluation-result-detail__name">{result.student.full_name}</h2>
						<Chip color={getScoreColor(result.general.score)} size="sm">
							{result.general.score.toFixed(2)} / 20
						</Chip>
					</div>
					<p class="evaluation-result-detail__meta-line">{result.student.student_number}</p>
					<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
						<Chip color="secondary" size="sm">
							Lista {result.enrollment.roll_code}
						</Chip>
						<Chip color="info" size="sm">
							{formatEnrollmentTurn(result.enrollment.turn)}
						</Chip>
						<Chip color="primary" size="sm">
							{formatEnrollmentStatus(result.enrollment.status)}
						</Chip>
					</div>
				</div>
			</div>

			<div class="evaluation-result-detail__meta-grid">
				<InfoItem
					icon="calendar"
					label="Fecha evaluación"
					value={formatEducationDate(result.evaluation.eval_date)}
				/>
				<InfoItem icon="building" label="Ciclo" value={result.evaluation.cycle_title} />
				<InfoItem
					icon="bookOpenCheck"
					label="Nivel"
					value={`${formatAcademicDegreeLabel(result.evaluation.degree_name)} · ${formatGroupCode(result.evaluation.group_code)}`}
				/>
				<InfoItem icon="creditCard" label="Matrícula" value={result.enrollment.enrollment_number} />
				<InfoItem
					icon="clock"
					label="Calculado"
					value={formatEducationDate(result.calculated_at)}
				/>
				<InfoItem icon="hash" label="DNI" value={result.student.dni || 'Sin DNI'} />
			</div>
		</div>
	</Card>

	<div
		class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-md evaluation-result-detail__stats-grid"
	>
		<StatCard
			title="Correctas"
			value={String(result.general.correct_count)}
			icon="checkCircle"
			color="success"
			subtitle={`${result.general.total_questions} preguntas consideradas`}
		/>
		<StatCard
			title="Incorrectas"
			value={String(result.general.incorrect_count)}
			icon="xCircle"
			color="danger"
			subtitle="Preguntas marcadas con respuesta equivocada"
		/>
		<StatCard
			title="En blanco"
			value={String(result.general.blank_count)}
			icon="minus"
			color="warning"
			subtitle="Respuestas no marcadas"
		/>
		<StatCard
			title="Nota final"
			value={result.general.score.toFixed(2)}
			icon="award"
			color={getScoreColor(result.general.score)}
			subtitle="Escala vigesimal"
		/>
	</div>

	<Card spaced>
		<div class="lumi-stack lumi-stack--md">
			<Tabs bind:value={activeTab} {tabs} />

			{#if activeTab === 'summary'}
				<Table data={sectionRows} hover>
					{#snippet thead()}
						<th>Sección</th>
						<th>Preguntas</th>
						<th>Correctas</th>
						<th>Incorrectas</th>
						<th>Blanco</th>
						<th>Nota</th>
					{/snippet}

					{#snippet row({ row })}
						<td>{row.section_name}</td>
						<td>{row.question_count}</td>
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
			{:else}
				<Table data={answerRows} pagination hover itemsPerPage={20}>
					{#snippet thead()}
						<th>Pregunta</th>
						<th>Marcada</th>
						<th>Clave</th>
						<th>Sección</th>
						<th>Estado</th>
					{/snippet}

					{#snippet row({ row })}
						{@const answer = row as unknown as EvaluationProcessedAnswer}
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
			{/if}
		</div>
	</Card>
</div>

<style>
	.evaluation-result-detail__hero {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
		gap: var(--lumi-space-lg);
		align-items: start;
	}

	.evaluation-result-detail__identity {
		display: flex;
		gap: var(--lumi-space-md);
		align-items: center;
	}

	.evaluation-result-detail__title-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--lumi-space-xs);
	}

	.evaluation-result-detail__name,
	.evaluation-result-detail__meta-line {
		margin: 0;
	}

	.evaluation-result-detail__meta-line {
		color: var(--lumi-color-text-muted);
		font-size: var(--lumi-font-size-sm);
	}

	.evaluation-result-detail__meta-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--lumi-space-sm);
	}

	.evaluation-result-detail__stats-grid {
		--lumi-grid-columns: repeat(4, minmax(0, 1fr));
	}

	@media (max-width: 1100px) {
		.evaluation-result-detail__hero {
			grid-template-columns: 1fr;
		}

		.evaluation-result-detail__stats-grid {
			--lumi-grid-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 700px) {
		.evaluation-result-detail__identity {
			align-items: flex-start;
		}

		.evaluation-result-detail__meta-grid {
			grid-template-columns: 1fr;
		}

		.evaluation-result-detail__stats-grid {
			--lumi-grid-columns: 1fr;
		}
	}
</style>
