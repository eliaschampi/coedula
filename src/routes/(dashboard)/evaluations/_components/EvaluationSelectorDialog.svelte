<script lang="ts">
	import { browser } from '$app/environment';
	import { Button, Card, Chip, Dialog, EmptyState, Loading, Select } from '$lib/components';
	import type { GroupCode } from '$lib/types/education';
	import { formatEducationDate, formatGroupCode, GROUP_CODE_OPTIONS } from '$lib/utils';
	import type { EvaluationSelectionValue } from './selection';

	interface CycleItem {
		code: string;
		label: string;
	}

	interface CycleDegreeItem {
		code: string;
		cycle_code: string;
		label: string;
	}

	interface EvaluationDialogItem {
		code: string;
		name: string;
		eval_date: string;
	}

	interface Props {
		open?: boolean;
		title?: string;
		description?: string;
		cycles: CycleItem[];
		cycleDegreeOptions: CycleDegreeItem[];
		initialCycleCode: string | null;
		initialCycleDegreeCode: string | null;
		initialGroupCode: GroupCode;
		initialEvaluationCode?: string | null;
		configuredOnly?: boolean;
		evaluationRequired?: boolean;
		applyLabel?: string;
		onapply?: (selection: EvaluationSelectionValue) => void;
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		title = 'Seleccionar evaluación',
		description = 'Cambia el contexto con pocos filtros y elige una evaluación de la lista.',
		cycles,
		cycleDegreeOptions,
		initialCycleCode,
		initialCycleDegreeCode,
		initialGroupCode,
		initialEvaluationCode = null,
		configuredOnly = false,
		evaluationRequired = false,
		applyLabel = 'Aplicar',
		onapply,
		onclose
	}: Props = $props();

	let cycleCode = $state<string | null>(null);
	let cycleDegreeCode = $state<string | null>(null);
	let groupCode = $state<GroupCode>('A');
	let selectedEvaluationCode = $state<string | null>(null);
	let evaluations = $state<EvaluationDialogItem[]>([]);
	let isLoading = $state(false);
	let loadError = $state('');
	let lastOpenState = $state(false);

	const cycleOptions = $derived(
		cycles.map((cycle) => ({
			value: cycle.code,
			label: cycle.label
		}))
	);

	const filteredCycleDegreeOptions = $derived(
		cycleDegreeOptions
			.filter((option) => option.cycle_code === cycleCode)
			.map((option) => ({
				value: option.code,
				label: option.label
			}))
	);

	const canApply = $derived(
		Boolean(cycleCode) &&
			Boolean(cycleDegreeCode) &&
			(!evaluationRequired || Boolean(selectedEvaluationCode))
	);

	function handleCycleChange(value: string | number | object | null): void {
		cycleCode = value ? String(value) : null;
		const nextDegreeOptions = cycleDegreeOptions.filter(
			(option) => option.cycle_code === cycleCode
		);
		cycleDegreeCode =
			nextDegreeOptions.find((option) => option.code === cycleDegreeCode)?.code ??
			nextDegreeOptions[0]?.code ??
			null;
	}

	function closeDialog(): void {
		open = false;
		onclose?.();
	}

	function applySelection(): void {
		if (!canApply) {
			return;
		}

		onapply?.({
			cycleCode,
			cycleDegreeCode,
			groupCode,
			searchQuery: '',
			evaluationCode: selectedEvaluationCode
		});
		closeDialog();
	}

	async function fetchEvaluations(signal: AbortSignal): Promise<void> {
		if (!browser || !open) {
			return;
		}

		if (!cycleCode || !cycleDegreeCode) {
			evaluations = [];
			selectedEvaluationCode = null;
			loadError = '';
			isLoading = false;
			return;
		}

		isLoading = true;
		loadError = '';

		try {
			const query = [
				`cycle=${encodeURIComponent(cycleCode)}`,
				`degree=${encodeURIComponent(cycleDegreeCode)}`,
				`group=${encodeURIComponent(groupCode)}`,
				configuredOnly ? 'configuredOnly=true' : ''
			]
				.filter(Boolean)
				.join('&');

			const response = await fetch(`/api/evaluations/search?${query}`, { signal });
			const payload = (await response.json().catch(() => ({}))) as {
				items?: EvaluationDialogItem[];
				error?: string;
			};

			if (!response.ok) {
				throw new Error(payload.error || 'No se pudieron cargar las evaluaciones');
			}

			evaluations = Array.isArray(payload.items) ? payload.items : [];

			if (!evaluations.some((evaluation) => evaluation.code === selectedEvaluationCode)) {
				selectedEvaluationCode = evaluations[0]?.code ?? null;
			}
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				return;
			}

			evaluations = [];
			selectedEvaluationCode = null;
			loadError = error instanceof Error ? error.message : 'No se pudieron cargar las evaluaciones';
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if (open && !lastOpenState) {
			cycleCode = initialCycleCode;
			cycleDegreeCode = initialCycleDegreeCode;
			groupCode = initialGroupCode;
			selectedEvaluationCode = initialEvaluationCode;
		}

		lastOpenState = open;
	});

	$effect(() => {
		if (!browser || !open) {
			return;
		}

		const requestKey = [
			cycleCode ?? '',
			cycleDegreeCode ?? '',
			groupCode,
			configuredOnly ? 'configured' : 'all'
		].join(':');
		void requestKey;

		const controller = new AbortController();
		const timeoutId = window.setTimeout(() => {
			void fetchEvaluations(controller.signal);
		}, 180);

		return () => {
			controller.abort();
			window.clearTimeout(timeoutId);
		};
	});
</script>

<Dialog bind:open size="lg" {title} scrollable onclose={closeDialog}>
	<div class="lumi-stack lumi-stack--md">
		<div class="lumi-stack lumi-stack--2xs">
			<p class="lumi-margin--none lumi-text--sm lumi-text--muted">{description}</p>
		</div>

		<Card spaced>
			<div class="lumi-grid lumi-grid--columns-3 lumi-grid--gap-md">
				<Select
					bind:value={cycleCode}
					label="Ciclo"
					options={cycleOptions}
					placeholder="Seleccione un ciclo"
					clearable={false}
					onchange={handleCycleChange}
				/>
				<Select
					bind:value={cycleDegreeCode}
					label="Grado"
					options={filteredCycleDegreeOptions}
					placeholder="Seleccione un grado"
					clearable={false}
					disabled={!cycleCode}
				/>
				<Select
					bind:value={groupCode}
					label="Grupo"
					options={GROUP_CODE_OPTIONS}
					clearable={false}
				/>
			</div>
		</Card>

		<div class="lumi-section-toolbar">
			<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
				{#if cycleCode}
					<Chip color="primary" size="sm">
						{cycles.find((cycle) => cycle.code === cycleCode)?.label ?? 'Sin ciclo'}
					</Chip>
				{/if}
				{#if cycleDegreeCode}
					<Chip color="secondary" size="sm">
						{cycleDegreeOptions.find((option) => option.code === cycleDegreeCode)?.label ??
							'Sin grado'}
					</Chip>
				{/if}
				<Chip color="info" size="sm">{formatGroupCode(groupCode)}</Chip>
			</div>
			<p class="lumi-margin--none lumi-text--xs lumi-text--muted">
				{isLoading ? 'Buscando evaluaciones…' : `${evaluations.length} evaluación(es) encontradas`}
			</p>
		</div>

		{#if loadError}
			<div class="evaluation-selector__alert">
				<p class="lumi-margin--none lumi-text--sm">{loadError}</p>
			</div>
		{/if}

		<Card spaced>
			{#if !cycleCode || !cycleDegreeCode}
				<EmptyState
					title="Selecciona un ciclo y un grado"
					description="Con eso cargamos las evaluaciones disponibles para este contexto."
					icon="bookOpen"
				/>
			{:else if isLoading}
				<div class="lumi-flex lumi-flex--center evaluation-selector__loading">
					<Loading color="primary" text="Consultando evaluaciones disponibles…" />
				</div>
			{:else if evaluations.length === 0}
				<EmptyState
					title="No hay evaluaciones para este filtro"
					description="Cambia el grupo o ajusta la búsqueda para encontrar otra evaluación."
					icon="clipboardPenLine"
				/>
			{:else}
				<div class="lumi-item-list evaluation-selector__list" role="list">
					{#each evaluations as evaluation (evaluation.code)}
						<button
							type="button"
							class="lumi-item-row lumi-item-row--interactive {selectedEvaluationCode ===
							evaluation.code
								? 'lumi-item-row--active'
								: ''}"
							onclick={() => {
								selectedEvaluationCode = evaluation.code;
							}}
						>
							<div class="lumi-item-row__copy">
								<strong class="lumi-text-ellipsis">{evaluation.name}</strong>
								<span class="lumi-text--sm lumi-text--muted">
									{formatEducationDate(evaluation.eval_date)}
								</span>
							</div>

							<span class="lumi-text--xs lumi-font--medium lumi-text--primary">
								{selectedEvaluationCode === evaluation.code ? 'Seleccionada' : 'Seleccionar'}
							</span>
						</button>
					{/each}
				</div>
			{/if}
		</Card>

		<div class="lumi-flex lumi-justify--end lumi-flex--gap-sm lumi-flex--wrap">
			<Button type="border" onclick={closeDialog}>Cancelar</Button>
			<Button
				type="filled"
				color="primary"
				icon="check"
				disabled={!canApply}
				onclick={applySelection}
			>
				{applyLabel}
			</Button>
		</div>
	</div>
</Dialog>

<style>
	.evaluation-selector__alert {
		padding: var(--lumi-space-md);
		border-radius: var(--lumi-radius-xl);
		border: var(--lumi-border-width-thin) solid
			color-mix(in srgb, var(--lumi-color-danger) 28%, var(--lumi-color-border));
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--lumi-color-danger) 10%, var(--lumi-color-surface)) 0%,
			var(--lumi-color-surface) 100%
		);
	}

	.evaluation-selector__loading {
		min-height: 16rem;
	}

	.evaluation-selector__list {
		max-height: 24rem;
		overflow-y: auto;
		padding-right: var(--lumi-space-2xs);
	}
</style>
