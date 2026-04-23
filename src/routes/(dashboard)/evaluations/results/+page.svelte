<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		Button,
		Card,
		Chip,
		Dropdown,
		DropdownItem,
		EmptyState,
		Input,
		PageHeader,
		Table,
		type TableRow
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { formatEducationDate, formatGroupCode } from '$lib/utils';
	import type { GroupCode } from '$lib/types/education';
	import EvaluationSelectorDialog from '../_components/EvaluationSelectorDialog.svelte';
	import {
		buildEvaluationSelectionUrl,
		type EvaluationSelectionValue
	} from '../_components/selection';
	import type { PageData } from './$types';

	type ResultRow = PageData['results'][number];

	const { data }: { data: PageData } = $props();

	const canUpdate = $derived(can('evaluations:update'));
	const currentEvaluation = $derived(data.selectedEvaluation);
	const filterCycleDegreeCode = $derived(data.selectedCycleDegreeCode);
	const filterGroupCode = $derived(data.selectedGroupCode as GroupCode);

	let resultsSearchQuery = $state('');
	let showFilterDialog = $state(false);

	const filteredResults = $derived.by(() => {
		const query = resultsSearchQuery.trim().toLowerCase();

		if (!query) {
			return data.results;
		}

		return data.results.filter((result) => {
			return (
				result.student_full_name.toLowerCase().includes(query) ||
				result.student_number.toLowerCase().includes(query) ||
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

	function openResultDetail(resultCode: string): void {
		const returnTo = encodeURIComponent(`${page.url.pathname}${page.url.search}`);
		void goto(resolve(`/evaluations/results/${resultCode}?returnTo=${returnTo}` as '/'));
	}

	function openStudentResults(): void {
		void goto(resolve('/evaluations/results/student' as '/'));
	}

	function openProcessPage(): void {
		if (!currentEvaluation) {
			return;
		}

		void goto(
			resolve(
				buildEvaluationSelectionUrl('/evaluations/process', {
					cycleCode: data.selectedCycleCode,
					cycleDegreeCode: data.selectedCycleDegreeCode,
					groupCode: data.selectedGroupCode as GroupCode,
					searchQuery: '',
					evaluationCode: currentEvaluation.code
				}) as '/'
			)
		);
	}

	function exportDetailedResults(): void {
		if (!currentEvaluation || data.results.length === 0) {
			return;
		}

		window.open(
			`/api/evaluations/${currentEvaluation.code}/results/export-detailed`,
			'_blank',
			'noopener,noreferrer'
		);
	}

	function applyDialogSelection(selection: EvaluationSelectionValue): void {
		void goto(resolve(buildEvaluationSelectionUrl('/evaluations/results', selection) as '/'));
	}
</script>

<div class="lumi-stack lumi-stack--md">
	<PageHeader
		title="Resultados de evaluaciones"
		subtitle="Consulta notas guardadas por evaluación y exporta el consolidado sin recargar la pantalla con paneles extra."
		icon="badgeCheck"
	>
		{#snippet actions()}
			<Dropdown position="bottom-end" aria-label="Acciones de resultados">
				{#snippet triggerContent()}
					<Button type="flat" color="primary" icon="moreVertical" />
				{/snippet}

				{#snippet content()}
					<DropdownItem icon="slidersHorizontal" onclick={() => (showFilterDialog = true)}>
						Seleccionar evaluación
					</DropdownItem>
					<DropdownItem
						icon="download"
						onclick={exportDetailedResults}
						disabled={!currentEvaluation || data.results.length === 0}
					>
						Exportar CSV
					</DropdownItem>
					<DropdownItem icon="userRound" onclick={openStudentResults}>Por alumno</DropdownItem>
					{#if currentEvaluation && canUpdate}
						<DropdownItem icon="imagePlus" onclick={openProcessPage}>Procesar hojas</DropdownItem>
					{/if}
				{/snippet}
			</Dropdown>
			<Button
				type="border"
				icon="arrowLeft"
				onclick={() => void goto(resolve('/evaluations' as '/'))}
			/>
		{/snippet}
	</PageHeader>

	<div class="lumi-filter-summary">
		<div class="lumi-filter-summary__copy">
			<p class="lumi-filter-summary__eyebrow">Evaluación activa</p>
			<h2 class="lumi-filter-summary__title">
				{currentEvaluation?.name ?? 'Selecciona una evaluación con claves'}
			</h2>
			<p class="lumi-filter-summary__subtitle">
				{#if currentEvaluation}
					{currentEvaluation.cycle_title} · {formatEducationDate(currentEvaluation.eval_date)}
				{:else}
					Usa el selector para abrir una evaluación ya configurada.
				{/if}
			</p>
		</div>

		<div class="lumi-filter-summary__meta">
			{#if filterCycleDegreeCode}
				<Chip color="secondary" size="sm">
					{data.cycleDegreeOptions.find((option) => option.code === filterCycleDegreeCode)?.label}
				</Chip>
			{/if}
			<Chip color="info" size="sm">{formatGroupCode(filterGroupCode)}</Chip>
			{#if currentEvaluation}
				<Chip color="primary" size="sm">{totalResults} resultados</Chip>
				{#if totalResults > 0}
					<Chip color="success" size="sm">{approvedResults} aprobados</Chip>
					<Chip color="secondary" size="sm">Mejor {bestScore.toFixed(2)}</Chip>
					<Chip color="warning" size="sm">Promedio {averageScore.toFixed(2)}</Chip>
				{/if}
			{/if}
		</div>
	</div>

	{#if !currentEvaluation}
		<Card spaced>
			<EmptyState
				title="Selecciona una evaluación"
				description="Abre el diálogo para elegir ciclo, grado, grupo y la evaluación que quieres revisar."
				icon="clipboardPenLine"
			>
				{#snippet actions()}
					<Button
						type="filled"
						color="primary"
						icon="slidersHorizontal"
						onclick={() => (showFilterDialog = true)}
					>
						Seleccionar evaluación
					</Button>
				{/snippet}
			</EmptyState>
		</Card>
	{:else if data.results.length === 0}
		<Card spaced>
			<EmptyState
				title="Todavía no hay resultados guardados"
				description="Procesa hojas OMR y guarda los válidos para consolidar esta evaluación."
				icon="imagePlus"
			>
				{#snippet actions()}
					<div class="lumi-flex lumi-flex--gap-sm lumi-flex--wrap">
						<Button
							type="border"
							icon="slidersHorizontal"
							onclick={() => (showFilterDialog = true)}
						>
							Cambiar evaluación
						</Button>
						{#if canUpdate}
							<Button type="filled" color="primary" icon="imagePlus" onclick={openProcessPage}>
								Ir a procesamiento
							</Button>
						{/if}
					</div>
				{/snippet}
			</EmptyState>
		</Card>
	{:else}
		<Card spaced>
			<div class="lumi-stack lumi-stack--md">
				<div class="lumi-toolbar-field">
					<Input
						bind:value={resultsSearchQuery}
						label="Buscar alumno"
						placeholder="Nombre, código de lista o nota"
						icon="search"
					/>
				</div>

				<Table data={resultRows} pagination hover itemsPerPage={20}>
					{#snippet thead()}
						<th class="lumi-min-w--xl">Alumno</th>
						<th>Lista</th>
						<th>Correctas</th>
						<th>Incorrectas</th>
						<th>Blanco</th>
						<th>Nota</th>
						<th>Calculado</th>
						<th>Acciones</th>
					{/snippet}

					{#snippet row({ row })}
						{@const result = row as unknown as ResultRow}
						<td class="lumi-min-w--xl">
							<div class="lumi-stack lumi-stack--2xs">
								<span class="lumi-font--medium">{result.student_full_name}</span>
								<span class="lumi-text--xs lumi-text--muted">
									{result.student_number}
									{#if result.student_dni}
										· DNI {result.student_dni}
									{/if}
								</span>
							</div>
						</td>
						<td>
							<div class="lumi-stack lumi-stack--2xs">
								<span class="lumi-font--medium">{result.roll_code}</span>
								<span class="lumi-text--xs lumi-text--muted">
									{result.enrollment_number}
								</span>
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
						<td>{formatEducationDate(result.calculated_at)}</td>
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
</div>

<EvaluationSelectorDialog
	bind:open={showFilterDialog}
	title="Seleccionar evaluación con resultados"
	description="Usa el mismo diálogo del módulo para cambiar de ciclo, grado y evaluación sin recargar la interfaz."
	cycles={data.cycles}
	cycleDegreeOptions={data.cycleDegreeOptions}
	initialCycleCode={data.selectedCycleCode}
	initialCycleDegreeCode={data.selectedCycleDegreeCode}
	initialGroupCode={data.selectedGroupCode as GroupCode}
	initialEvaluationCode={data.selectedEvaluationCode}
	configuredOnly
	evaluationRequired
	applyLabel="Ver resultados"
	onapply={applyDialogSelection}
/>
