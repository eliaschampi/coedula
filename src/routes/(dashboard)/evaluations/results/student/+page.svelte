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
		Input,
		PageHeader,
		Select,
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

		void goto(
			resolve(`/evaluations/results/student?student=${encodeURIComponent(studentCode)}` as '/')
		);
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
				<Button type="border" icon="user" onclick={openStudentProfile}>Ver perfil</Button>
			{/if}
			<Button
				type="border"
				icon="arrowLeft"
				onclick={() => void goto(resolve('/evaluations/results' as '/'))}
			/>
		{/snippet}
	</PageHeader>

	<Card spaced>
		<div class="lumi-toolbar-field">
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
		<div class="lumi-filter-summary lumi-filter-summary--secondary">
			<div class="lumi-person-cell">
				<Avatar
					src={data.student.photo_url
						? buildStudentPhotoUrl(data.student.photo_url, 'preview')
						: ''}
					text={data.student.full_name}
					size="xl"
					color="primary"
				/>
				<div class="lumi-filter-summary__copy">
					<p class="lumi-filter-summary__eyebrow">Alumno activo</p>
					<h2 class="lumi-filter-summary__title">{data.student.full_name}</h2>
					<p class="lumi-filter-summary__subtitle">
						{data.student.student_number} · {data.student.current_branch_name || 'Sin sede activa'}
					</p>
				</div>
			</div>

			<div class="lumi-filter-summary__meta">
				<Chip color={data.student.is_active ? 'success' : 'danger'} size="sm">
					{data.student.is_active ? 'Activo' : 'Inactivo'}
				</Chip>
				{#if data.student.current_cycle_title}
					<Chip color="secondary" size="sm">{data.student.current_cycle_title}</Chip>
				{/if}
				{#if data.student.current_degree_name}
					<Chip color="info" size="sm">
						{formatAcademicDegreeLabel(data.student.current_degree_name)}
					</Chip>
				{/if}
				<Chip color="primary" size="sm">{totalResults} evaluaciones</Chip>
				<Chip color="success" size="sm">{approvedResults} aprobadas</Chip>
				<Chip color="warning" size="sm">Promedio {averageScore.toFixed(2)}</Chip>
				<Chip color="secondary" size="sm">Mejor {bestScore.toFixed(2)}</Chip>
				<Chip color="info" size="sm">{data.student.enrollments_count} matrículas</Chip>
				<Chip color="primary" size="sm">{data.student.dni || 'Sin DNI'}</Chip>
			</div>
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
					<div class="lumi-toolbar-field">
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
