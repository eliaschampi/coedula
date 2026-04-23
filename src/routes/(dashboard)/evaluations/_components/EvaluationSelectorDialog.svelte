<script lang="ts">
	import { browser } from '$app/environment';
	import { Button, Card, Chip, Dialog, EmptyState, Select } from '$lib/components';
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
			<div class="evaluation-selector__filters">
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

		<div class="evaluation-selector__status">
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
			<Card spaced class="evaluation-selector__alert">
				<p class="lumi-margin--none lumi-text--sm">{loadError}</p>
			</Card>
		{/if}

		<Card spaced>
			{#if !cycleCode || !cycleDegreeCode}
				<EmptyState
					title="Selecciona un ciclo y un grado"
					description="Con eso cargamos las evaluaciones disponibles para este contexto."
					icon="bookOpen"
				/>
			{:else if isLoading}
				<div class="evaluation-selector__loading">
					<div class="evaluation-selector__spinner" aria-hidden="true"></div>
					<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
						Consultando evaluaciones disponibles…
					</p>
				</div>
			{:else if evaluations.length === 0}
				<EmptyState
					title="No hay evaluaciones para este filtro"
					description="Cambia el grupo o ajusta la búsqueda para encontrar otra evaluación."
					icon="clipboardPenLine"
				/>
			{:else}
				<div class="evaluation-selector__list" role="list">
					{#each evaluations as evaluation (evaluation.code)}
						<button
							type="button"
							class="evaluation-selector__item {selectedEvaluationCode === evaluation.code
								? 'evaluation-selector__item--active'
								: ''}"
							onclick={() => {
								selectedEvaluationCode = evaluation.code;
							}}
						>
							<div class="evaluation-selector__item-main">
								<div class="evaluation-selector__item-text">
									<strong>{evaluation.name}</strong>
									<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
										{formatEducationDate(evaluation.eval_date)}
									</p>
								</div>
							</div>

							<span class="evaluation-selector__item-action">
								{selectedEvaluationCode === evaluation.code ? 'Seleccionada' : 'Seleccionar'}
							</span>
						</button>
					{/each}
				</div>
			{/if}
		</Card>

		<div class="evaluation-selector__footer">
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
	.evaluation-selector__filters {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--lumi-space-md);
	}

	.evaluation-selector__status {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-md);
		flex-wrap: wrap;
	}

	:global(.evaluation-selector__alert) {
		border-color: color-mix(in srgb, var(--lumi-color-danger) 28%, var(--lumi-color-border));
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--lumi-color-danger) 10%, var(--lumi-color-surface)) 0%,
			var(--lumi-color-surface) 100%
		);
	}

	.evaluation-selector__loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-sm);
		min-height: 16rem;
	}

	.evaluation-selector__spinner {
		width: var(--lumi-space-xl);
		height: var(--lumi-space-xl);
		border-radius: var(--lumi-radius-full);
		border: var(--lumi-border-width-thick) solid
			color-mix(in srgb, var(--lumi-color-primary) 18%, transparent);
		border-top-color: var(--lumi-color-primary);
		animation: evaluation-selector-spin 0.9s linear infinite;
	}

	.evaluation-selector__list {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-sm);
		max-height: 24rem;
		overflow-y: auto;
		padding-right: var(--lumi-space-2xs);
	}

	.evaluation-selector__item {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--lumi-space-md);
		align-items: center;
		width: 100%;
		padding: var(--lumi-space-md);
		border-radius: var(--lumi-radius-xl);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--lumi-color-surface) 94%, var(--lumi-color-primary) 6%) 0%,
			var(--lumi-color-surface) 100%
		);
		cursor: pointer;
		text-align: left;
		transition:
			transform var(--lumi-duration-fast) var(--lumi-easing-default),
			border-color var(--lumi-duration-fast) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-fast) var(--lumi-easing-default);
	}

	.evaluation-selector__item:hover {
		transform: translateY(calc(var(--lumi-space-2xs) * -1));
		border-color: color-mix(in srgb, var(--lumi-color-primary) 26%, var(--lumi-color-border));
		box-shadow: var(--lumi-shadow-md);
	}

	.evaluation-selector__item:focus-visible {
		outline: none;
		box-shadow:
			0 0 0 var(--lumi-border-width-thick)
				color-mix(in srgb, var(--lumi-color-primary) 24%, transparent),
			var(--lumi-shadow-md);
	}

	.evaluation-selector__item--active {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 44%, var(--lumi-color-border));
		box-shadow: var(--lumi-shadow-md);
	}

	.evaluation-selector__item-main {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-sm);
		min-width: 0;
	}

	.evaluation-selector__item-text {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
		min-width: 0;
	}

	.evaluation-selector__item-text strong {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.evaluation-selector__item-action {
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-primary);
	}

	.evaluation-selector__footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--lumi-space-sm);
		flex-wrap: wrap;
	}

	@keyframes evaluation-selector-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 720px) {
		.evaluation-selector__filters {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.evaluation-selector__item {
			grid-template-columns: 1fr;
		}

		.evaluation-selector__item-action {
			justify-self: flex-start;
		}
	}

	@media (max-width: 560px) {
		.evaluation-selector__filters {
			grid-template-columns: 1fr;
		}
	}
</style>
