<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		Card,
		Chip,
		DashboardBarChart,
		DashboardChart,
		DashboardSection,
		EmptyState,
		PageHeader,
		Select,
		type SelectOption
	} from '$lib/components';
	import { formatAcademicDegreeLabel, formatGroupCode } from '$lib/utils';
	import type { PageData } from './$types';

	type SelectValue = string | number | object | null;

	const { data }: { data: PageData } = $props();

	const cycleOptions = $derived<SelectOption[]>(
		data.cycles.map((cycle) => ({ value: cycle.code, label: cycle.title }))
	);
	const degreeOptions = $derived<SelectOption[]>(
		data.degrees.map((degree) => ({ value: degree.code, label: degree.label }))
	);
	const groupOptions = $derived<SelectOption[]>(data.groups.map((group) => ({ ...group })));
	const courseOptions = $derived<SelectOption[]>(data.courses.map((course) => ({ ...course })));
	const selectedCycle = $derived(
		data.cycles.find((cycle) => cycle.code === data.selection.cycleCode) ?? null
	);
	const selectedDegree = $derived(
		data.degrees.find((degree) => degree.code === data.selection.cycleDegreeCode) ?? null
	);
	const selectedGroupCode = $derived(data.selection.groupCode);
	const selectedCourse = $derived(
		data.courses.find((course) => course.value === data.selection.courseCode) ?? data.courses[0]
	);
	const academicContext = $derived(
		[
			selectedCycle?.title,
			selectedDegree ? formatAcademicDegreeLabel(selectedDegree.degree_name) : null,
			selectedGroupCode ? formatGroupCode(selectedGroupCode) : null
		]
			.filter(Boolean)
			.join(' · ')
	);
	const performanceTitle = $derived(
		selectedCourse?.value === 'general'
			? 'Promedio general del grupo'
			: `Promedio de ${selectedCourse?.label ?? 'curso'}`
	);

	function toSelection(value: SelectValue): string {
		if (typeof value === 'string' || typeof value === 'number') {
			return String(value);
		}

		return '';
	}

	function updateQuery(updates: Record<string, string | null>): void {
		const params = new SvelteURLSearchParams(page.url.searchParams);

		Object.entries(updates).forEach(([key, value]) => {
			if (value) {
				params.set(key, value);
				return;
			}

			params.delete(key);
		});

		const search = params.toString();
		void goto(resolve(`${page.url.pathname}${search ? `?${search}` : ''}` as '/'), {
			keepFocus: true,
			noScroll: true
		});
	}

	function selectCycle(value: SelectValue): void {
		const cycleCode = toSelection(value);
		if (!cycleCode || cycleCode === data.selection.cycleCode) return;

		updateQuery({ cycle_code: cycleCode, cycle_degree_code: null, course_code: null });
	}

	function selectDegree(value: SelectValue): void {
		const cycleDegreeCode = toSelection(value);
		if (!cycleDegreeCode || cycleDegreeCode === data.selection.cycleDegreeCode) return;

		updateQuery({ cycle_degree_code: cycleDegreeCode, course_code: null });
	}

	function selectGroup(value: SelectValue): void {
		const groupCode = toSelection(value);
		if (!groupCode || groupCode === data.selection.groupCode) return;

		updateQuery({ group_code: groupCode, course_code: null });
	}

	function selectCourse(value: SelectValue): void {
		const courseCode = toSelection(value);
		if (!courseCode || courseCode === data.selection.courseCode) return;

		updateQuery({ course_code: courseCode });
	}

	function formatScore(value: number): string {
		return new Intl.NumberFormat('es-PE', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(value);
	}
</script>

<div class="dashboard-home lumi-stack lumi-stack--xl">
	<PageHeader
		title="Dashboard"
		subtitle="Lectura académica por sede, ciclo, grado y grupo"
		size="xl"
		icon="house"
	/>

	{#if !data.canViewDashboard}
		<Card spaced>
			<EmptyState
				icon="shield"
				title="Dashboard restringido"
				description="Necesitas permiso de lectura del dashboard para consultar el rendimiento académico."
			/>
		</Card>
	{:else if !data.user?.current_branch}
		<Card spaced>
			<EmptyState
				icon="building"
				title="Sin sede de trabajo"
				description="Configura tu sede en Mi perfil o pide que te asignen a una sede activa. El administrador de sedes también puede fijar tu sede al asignarte a una de ellas."
			/>
		</Card>
	{:else}
		<div class="dashboard-home__context">
			{#if selectedCycle}
				<Chip color="info" size="sm">{selectedCycle.title}</Chip>
			{/if}
			{#if selectedDegree}
				<Chip color="secondary" size="sm">
					{formatAcademicDegreeLabel(selectedDegree.degree_name)}
				</Chip>
			{/if}
			{#if selectedGroupCode}
				<Chip color="success" size="sm">{formatGroupCode(selectedGroupCode)}</Chip>
			{/if}
		</div>

		<div class="dashboard-home__overview-grid">
			<DashboardSection
				title="Matrículas por ciclo"
				subtitle="Distribución de matrículas de la sede seleccionada"
				icon="chartBar"
			>
				<DashboardBarChart
					data={data.enrollmentsByCycle}
					color="primary"
					height={286}
					xLabelMaxLength={14}
					emptyMessage="Aún no hay matrículas asociadas a esta sede."
					aria-label="Matrículas por ciclo académico"
				/>
			</DashboardSection>

			<DashboardSection
				title="Últimos alumnos"
				subtitle="Diez registros más recientes de la sede"
				icon="graduationCap"
			>
				{#if data.recentStudents.length > 0}
					<div class="dashboard-home__student-list" role="list">
						{#each data.recentStudents as student, index (student.code)}
							<div class="dashboard-home__student-row" role="listitem">
								<span class="dashboard-home__row-index">{String(index + 1).padStart(2, '0')}</span>
								<div class="dashboard-home__row-copy">
									<span class="dashboard-home__row-title">{student.full_name}</span>
									<span class="dashboard-home__row-subtitle">{student.cycle_title}</span>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<EmptyState
						icon="graduationCap"
						title="Sin alumnos recientes"
						description="Los nuevos alumnos vinculados a esta sede aparecerán aquí."
					/>
				{/if}
			</DashboardSection>
		</div>

		<Card spaced class="dashboard-home__filters-card">
			<div class="dashboard-home__filters">
				<Select
					value={data.selection.cycleCode}
					options={cycleOptions}
					label="Ciclo"
					placeholder="Seleccionar ciclo"
					size="sm"
					clearable={false}
					disabled={cycleOptions.length === 0}
					onchange={selectCycle}
				/>
				<Select
					value={data.selection.cycleDegreeCode}
					options={degreeOptions}
					label="Grado"
					placeholder="Seleccionar grado"
					size="sm"
					clearable={false}
					disabled={degreeOptions.length === 0}
					onchange={selectDegree}
				/>
				<Select
					value={data.selection.groupCode}
					options={groupOptions}
					label="Grupo"
					placeholder="Seleccionar grupo"
					size="sm"
					clearable={false}
					disabled={groupOptions.length === 0}
					onchange={selectGroup}
				/>
			</div>
		</Card>

		<div class="dashboard-home__performance-grid">
			<DashboardSection
				title="Ranking de estudiantes"
				subtitle={academicContext || 'Selecciona ciclo, grado y grupo'}
				icon="award"
			>
				{#if data.studentRanking.length > 0}
					<div class="dashboard-home__ranking-list" role="list">
						{#each data.studentRanking as student, index (student.student_code)}
							<div class="dashboard-home__ranking-row" role="listitem">
								<span class="dashboard-home__ranking-place">{index + 1}</span>
								<div class="dashboard-home__ranking-main">
									<div class="dashboard-home__ranking-header">
										<span class="dashboard-home__row-title">{student.student_full_name}</span>
										<strong>{formatScore(student.average_score)}</strong>
									</div>
									<div class="dashboard-home__ranking-meta">
										<span>Lista {student.roll_code}</span>
										<span>{student.total_evaluations} evaluaciones</span>
									</div>
									<progress
										class="dashboard-home__score-progress"
										value={student.average_score}
										max="20"
									>
										{formatScore(student.average_score)}
									</progress>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<EmptyState
						icon="award"
						title="Sin ranking disponible"
						description="Guarda resultados generales de evaluaciones para calcular el promedio del grupo."
					/>
				{/if}
			</DashboardSection>

			<DashboardSection title={performanceTitle} subtitle={academicContext} icon="trendingUp">
				{#snippet actions()}
					<div class="dashboard-home__course-select">
						<Select
							value={data.selection.courseCode}
							options={courseOptions}
							placeholder="Curso"
							aria-label="Curso"
							size="sm"
							clearable={false}
							disabled={courseOptions.length <= 1 && data.selection.courseCode === 'general'}
							onchange={selectCourse}
						/>
					</div>
				{/snippet}

				<DashboardChart
					data={data.performanceTrend}
					color="secondary"
					height={286}
					valueFormat="score"
					xLabelMaxLength={13}
					emptyMessage="Aún no hay resultados guardados para esta selección."
					aria-label="Evolución de promedio de notas"
				/>
			</DashboardSection>
		</div>
	{/if}
</div>

<style>
	.dashboard-home {
		min-width: 0;
	}

	.dashboard-home__course-select {
		width: min(18rem, 100%);
	}

	.dashboard-home__context {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--lumi-space-xs);
		margin-top: calc(var(--lumi-space-md) * -1);
	}

	.dashboard-home__overview-grid,
	.dashboard-home__performance-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.65fr);
		gap: var(--lumi-space-lg);
		align-items: stretch;
	}

	.dashboard-home__performance-grid {
		grid-template-columns: minmax(18rem, 0.8fr) minmax(0, 1.2fr);
	}

	.dashboard-home__filters {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--lumi-space-md);
		align-items: end;
	}

	.dashboard-home__student-list,
	.dashboard-home__ranking-list {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
	}

	.dashboard-home__student-row,
	.dashboard-home__ranking-row {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		min-width: 0;
		padding: var(--lumi-space-sm);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-lg);
		background: color-mix(in srgb, var(--lumi-color-surface) 76%, transparent);
		transition: var(--lumi-transition-all);
	}

	.dashboard-home__student-row:hover,
	.dashboard-home__ranking-row:hover {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 24%, var(--lumi-color-border));
		background: color-mix(in srgb, var(--lumi-color-primary) 5%, var(--lumi-color-surface));
	}

	.dashboard-home__row-index,
	.dashboard-home__ranking-place {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 var(--lumi-space-xl);
		width: var(--lumi-space-xl);
		height: var(--lumi-space-xl);
		border-radius: var(--lumi-radius-lg);
		background: color-mix(in srgb, var(--lumi-color-primary) 10%, var(--lumi-color-surface));
		color: var(--lumi-color-primary);
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-bold);
	}

	.dashboard-home__ranking-place {
		background: color-mix(in srgb, var(--lumi-color-secondary) 12%, var(--lumi-color-surface));
		color: var(--lumi-color-secondary);
	}

	.dashboard-home__row-copy,
	.dashboard-home__ranking-main {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
		min-width: 0;
		flex: 1;
	}

	.dashboard-home__row-title {
		min-width: 0;
		color: var(--lumi-color-text);
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-semibold);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.dashboard-home__row-subtitle,
	.dashboard-home__ranking-meta {
		color: var(--lumi-color-text-muted);
		font-size: var(--lumi-font-size-xs);
	}

	.dashboard-home__ranking-header,
	.dashboard-home__ranking-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-sm);
		min-width: 0;
	}

	.dashboard-home__ranking-header strong {
		flex: 0 0 auto;
		color: var(--lumi-color-secondary);
		font-size: var(--lumi-font-size-sm);
	}

	.dashboard-home__score-progress {
		width: 100%;
		height: var(--lumi-space-xs);
		border: none;
		border-radius: var(--lumi-radius-full);
		overflow: hidden;
		background: var(--lumi-color-background-hover);
	}

	.dashboard-home__score-progress::-webkit-progress-bar {
		background: var(--lumi-color-background-hover);
		border-radius: var(--lumi-radius-full);
	}

	.dashboard-home__score-progress::-webkit-progress-value {
		background: linear-gradient(90deg, var(--lumi-color-secondary), var(--lumi-color-primary));
		border-radius: var(--lumi-radius-full);
	}

	.dashboard-home__score-progress::-moz-progress-bar {
		background: linear-gradient(90deg, var(--lumi-color-secondary), var(--lumi-color-primary));
		border-radius: var(--lumi-radius-full);
	}

	@media (max-width: 1100px) {
		.dashboard-home__overview-grid,
		.dashboard-home__performance-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 760px) {
		.dashboard-home__course-select {
			width: 100%;
		}

		.dashboard-home__filters {
			grid-template-columns: 1fr;
		}

		.dashboard-home__ranking-header,
		.dashboard-home__ranking-meta {
			align-items: flex-start;
			flex-direction: column;
			gap: var(--lumi-space-2xs);
		}
	}
</style>
