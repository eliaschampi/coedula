<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import {
		Avatar,
		Button,
		Card,
		Chip,
		PageHeader,
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

	<div class="lumi-filter-summary">
		<div class="lumi-person-cell">
			<Avatar
				src={result.student.photo_url
					? buildStudentPhotoUrl(result.student.photo_url, 'preview')
					: ''}
				text={result.student.full_name}
				size="xl"
				color="primary"
			/>
			<div class="lumi-filter-summary__copy">
				<p class="lumi-filter-summary__eyebrow">Resultado guardado</p>
				<h2 class="lumi-filter-summary__title">{result.student.full_name}</h2>
				<p class="lumi-filter-summary__subtitle">
					{result.student.student_number} · {result.evaluation.cycle_title} ·
					{formatEducationDate(result.evaluation.eval_date)}
				</p>
			</div>
		</div>

		<div class="lumi-filter-summary__meta">
			<Chip color={getScoreColor(result.general.score)} size="sm">
				Nota {result.general.score.toFixed(2)} / 20
			</Chip>
			<Chip color="success" size="sm">{result.general.correct_count} correctas</Chip>
			<Chip color="danger" size="sm">{result.general.incorrect_count} incorrectas</Chip>
			<Chip color="warning" size="sm">{result.general.blank_count} en blanco</Chip>
			<Chip color="secondary" size="sm">Lista {result.enrollment.roll_code}</Chip>
			<Chip color="info" size="sm">{formatEnrollmentTurn(result.enrollment.turn)}</Chip>
			<Chip color="primary" size="sm">
				{formatAcademicDegreeLabel(result.evaluation.degree_name)} ·
				{formatGroupCode(result.evaluation.group_code)}
			</Chip>
			<Chip color="primary" size="sm">
				{formatEnrollmentStatus(result.enrollment.status)}
			</Chip>
			<Chip color="info" size="sm">{result.enrollment.enrollment_number}</Chip>
			<Chip color="secondary" size="sm">
				Calculado {formatEducationDate(result.calculated_at)}
			</Chip>
			<Chip color="primary" size="sm">{result.student.dni || 'Sin DNI'}</Chip>
		</div>
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
