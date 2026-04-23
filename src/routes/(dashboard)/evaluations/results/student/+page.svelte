<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		Avatar,
		Button,
		Card,
		Chip,
		EmptyState,
		InfoItem,
		Input,
		PageHeader,
		Select,
		StatCard,
		Table,
		type TableRow
	} from '$lib/components';
	import { buildStudentPhotoUrl, formatAcademicDegreeLabel, formatEducationDate } from '$lib/utils';
	import type { PageData } from './$types';

	type ResultRow = PageData['results'][number];

	const { data }: { data: PageData } = $props();

	let resultsSearchQuery = $state('');

	const studentOptions = $derived(
		data.studentOptions.map((student) => ({
			value: student.code,
			label: student.label
		}))
	);
	const filteredResults = $derived.by(() => {
		const query = resultsSearchQuery.trim().toLowerCase();

		if (!query) {
			return data.results;
		}

		return data.results.filter((result) => {
			return (
				result.eval_name.toLowerCase().includes(query) ||
				result.cycle_title.toLowerCase().includes(query) ||
				result.roll_code.toLowerCase().includes(query) ||
				result.score.toFixed(2).includes(query)
			);
		});
	});
	const resultRows = $derived(filteredResults as unknown as TableRow[]);
	const totalResults = $derived(data.results.length);
	const approvedResults = $derived(data.results.filter((result) => result.score >= 10.5).length);
	const averageScore = $derived.by(() => {
		if (data.results.length === 0) {
			return 0;
		}

		const total = data.results.reduce((sum, result) => sum + result.score, 0);
		return Number((total / data.results.length).toFixed(2));
	});
	const bestScore = $derived.by(() => {
		if (data.results.length === 0) {
			return 0;
		}

		return Number(Math.max(...data.results.map((result) => result.score)).toFixed(2));
	});

	function getScoreColor(score: number): 'success' | 'warning' | 'danger' {
		if (score >= 14) return 'success';
		if (score >= 10.5) return 'warning';
		return 'danger';
	}

	function handleStudentChange(value: string | number | object | null): void {
		const studentCode = value ? String(value) : '';

		if (!studentCode) {
			void goto(resolve('/evaluations/results/student' as '/'));
			return;
		}

		void goto(resolve(`/evaluations/results/student?student=${encodeURIComponent(studentCode)}` as '/'));
	}

	function openResultDetail(resultCode: string): void {
		const returnTo = encodeURIComponent(`${page.url.pathname}${page.url.search}`);
		void goto(resolve(`/evaluations/results/${resultCode}?returnTo=${returnTo}` as '/'));
	}

	function openStudentProfile(): void {
		if (!data.student) {
			return;
		}

		void goto(resolve(`/students/${data.student.code}` as '/'));
	}

	function exportStudentReport(): void {
		if (!data.student || data.results.length === 0) {
			return;
		}

		window.open(
			`/api/students/${data.student.code}/evaluation-results-report`,
			'_blank',
			'noopener,noreferrer'
		);
	}
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader
		title="Resultados por alumno"
		subtitle="Revisa el historial completo de evaluaciones de un alumno y genera un reporte PDF listo para imprimir."
		icon="userRound"
	>
		{#snippet actions()}
			{#if data.student}
				<Button
					type="filled"
					color="primary"
					icon="download"
					onclick={exportStudentReport}
					disabled={data.results.length === 0}
				>
					Exportar PDF
				</Button>
				<Button type="border" icon="user" onclick={openStudentProfile}>
					Ver perfil
				</Button>
			{/if}
			<Button
				type="border"
				icon="arrowLeft"
				onclick={() => void goto(resolve('/evaluations/results' as '/'))}
			>
				Volver
			</Button>
		{/snippet}
	</PageHeader>

	<Card spaced>
		<div class="evaluation-student-results__selector">
			<Select
				value={data.student?.code ?? null}
				label="Alumno"
				options={studentOptions}
				placeholder="Selecciona un alumno"
				autocomplete
				clearable
				onchange={handleStudentChange}
			/>
		</div>
	</Card>

	{#if !data.student}
		<EmptyState
			title="Selecciona un alumno"
			description="Elige un alumno desde el selector para revisar su historial de resultados y generar el reporte consolidado."
			icon="graduationCap"
		/>
	{:else}
		<Card>
			<div class="evaluation-student-results__hero">
				<div class="evaluation-student-results__identity">
					<Avatar
						src={data.student.photo_url ? buildStudentPhotoUrl(data.student.photo_url, 'preview') : ''}
						text={data.student.full_name}
						size="xl"
						color="primary"
					/>
					<div class="lumi-stack lumi-stack--2xs">
						<div class="evaluation-student-results__title-row">
							<h2 class="evaluation-student-results__name">{data.student.full_name}</h2>
							<Chip color={data.student.is_active ? 'success' : 'danger'} size="sm">
								{data.student.is_active ? 'Activo' : 'Inactivo'}
							</Chip>
						</div>
						<p class="evaluation-student-results__code">{data.student.student_number}</p>
						<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
							{#if data.student.current_cycle_title}
								<Chip color="secondary" size="sm">{data.student.current_cycle_title}</Chip>
							{/if}
							{#if data.student.current_degree_name}
								<Chip color="info" size="sm">
									{formatAcademicDegreeLabel(data.student.current_degree_name)}
								</Chip>
							{/if}
						</div>
					</div>
				</div>

				<div class="evaluation-student-results__meta">
					<InfoItem icon="creditCard" label="DNI" value={data.student.dni || 'Sin DNI'} />
					<InfoItem
						icon="building"
						label="Sede actual"
						value={data.student.current_branch_name || 'Sin sede activa'}
					/>
					<InfoItem
						icon="history"
						label="Matrículas"
						value={String(data.student.enrollments_count)}
					/>
				</div>
			</div>
		</Card>

		<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-md evaluation-student-results__stats-grid">
			<StatCard
				title="Evaluaciones"
				value={String(totalResults)}
				icon="badgeCheck"
				color="primary"
				subtitle="Resultados guardados en el historial"
			/>
			<StatCard
				title="Aprobadas"
				value={String(approvedResults)}
				icon="checkCircle"
				color="success"
				subtitle="Notas iguales o mayores a 10.5"
			/>
			<StatCard
				title="Promedio"
				value={averageScore.toFixed(2)}
				icon="chartBar"
				color="info"
				subtitle="Promedio global del alumno"
			/>
			<StatCard
				title="Mejor nota"
				value={bestScore.toFixed(2)}
				icon="award"
				color="secondary"
				subtitle="Máximo puntaje alcanzado"
			/>
		</div>

		{#if data.results.length === 0}
			<EmptyState
				title="El alumno todavía no tiene resultados guardados"
				description="Procesa y guarda evaluaciones para que el historial y el PDF consolidado se generen automáticamente."
				icon="badgeCheck"
			/>
		{:else}
			<Card spaced>
				<div class="lumi-stack lumi-stack--md">
					<div class="evaluation-student-results__toolbar">
						<Input
							bind:value={resultsSearchQuery}
							label="Buscar evaluación"
							placeholder="Nombre, ciclo, lista o nota"
							icon="search"
						/>
					</div>

					<Table data={resultRows} pagination hover itemsPerPage={15}>
						{#snippet thead()}
							<th>Evaluación</th>
							<th>Fecha</th>
							<th>Matrícula</th>
							<th>Correctas</th>
							<th>Incorrectas</th>
							<th>Blanco</th>
							<th>Nota</th>
							<th>Acciones</th>
						{/snippet}

						{#snippet row({ row })}
							{@const result = row as unknown as ResultRow}
							<td>
								<div class="lumi-stack lumi-stack--2xs">
									<span class="lumi-font--medium">{result.eval_name}</span>
									<span class="lumi-text--xs lumi-text--muted">
										{result.cycle_title} · {formatAcademicDegreeLabel(result.degree_name)} ·
										{result.group_code}
									</span>
								</div>
							</td>
							<td>{formatEducationDate(result.eval_date)}</td>
							<td>
								<div class="lumi-stack lumi-stack--2xs">
									<span class="lumi-font--medium">{result.enrollment_number}</span>
									<span class="lumi-text--xs lumi-text--muted">Lista {result.roll_code}</span>
								</div>
							</td>
							<td>{result.correct_count}</td>
							<td>{result.incorrect_count}</td>
							<td>{result.blank_count}</td>
							<td>
								<Chip color={getScoreColor(result.score)} size="sm">
									{result.score.toFixed(2)}
								</Chip>
							</td>
							<td>
								<Button
									type="border"
									size="sm"
									icon="eye"
									onclick={() => openResultDetail(result.code)}
								>
									Ver detalle
								</Button>
							</td>
						{/snippet}
					</Table>
				</div>
			</Card>
		{/if}
	{/if}
</div>

<style>
	.evaluation-student-results__selector {
		display: grid;
		grid-template-columns: minmax(0, 420px);
	}

	.evaluation-student-results__hero {
		display: grid;
		grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
		gap: var(--lumi-space-lg);
		align-items: start;
	}

	.evaluation-student-results__identity {
		display: flex;
		gap: var(--lumi-space-md);
		align-items: center;
	}

	.evaluation-student-results__title-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--lumi-space-xs);
	}

	.evaluation-student-results__name,
	.evaluation-student-results__code {
		margin: 0;
	}

	.evaluation-student-results__code {
		color: var(--lumi-color-text-muted);
		font-size: var(--lumi-font-size-sm);
	}

	.evaluation-student-results__meta {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--lumi-space-sm);
	}

	.evaluation-student-results__stats-grid {
		--lumi-grid-columns: repeat(4, minmax(0, 1fr));
	}

	.evaluation-student-results__toolbar {
		display: grid;
		grid-template-columns: minmax(0, 320px);
	}

	@media (max-width: 1100px) {
		.evaluation-student-results__hero {
			grid-template-columns: 1fr;
		}

		.evaluation-student-results__stats-grid {
			--lumi-grid-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 700px) {
		.evaluation-student-results__selector,
		.evaluation-student-results__toolbar,
		.evaluation-student-results__meta {
			grid-template-columns: 1fr;
		}

		.evaluation-student-results__identity {
			align-items: flex-start;
		}

		.evaluation-student-results__stats-grid {
			--lumi-grid-columns: 1fr;
		}
	}
</style>
