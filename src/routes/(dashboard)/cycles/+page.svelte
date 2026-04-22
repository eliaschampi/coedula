<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import {
		Alert,
		Button,
		Card,
		Chip,
		Dialog,
		EmptyState,
		Fieldset,
		InfoItem,
		Input,
		List,
		ListHeader,
		ListItem,
		PageHeader,
		Select,
		Switch,
		Textarea
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import type { AcademicCycleOverview } from '$lib/types/education';
	import {
		CYCLE_MODALITY_OPTIONS,
		formatDateInputValue,
		formatEducationCurrency,
		formatEducationDateRange
	} from '$lib/utils/education';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const canRead = $derived(can('cycles:read'));
	const canCreate = $derived(can('cycles:create'));
	const canUpdate = $derived(can('cycles:update'));
	const canDelete = $derived(can('cycles:delete'));

	let showModal = $state(false);
	let showDeleteModal = $state(false);
	let isEditing = $state(false);
	let errorMessage = $state('');
	let selectedCycle = $state<AcademicCycleOverview | null>(null);

	let formTitle = $state('');
	let formBranchCode = $state('');
	let formModality = $state('regular');
	let formStartDate = $state('');
	let formEndDate = $state('');
	let formBaseCost = $state('0');
	let formTurn1AttendanceTime = $state('07:00');
	let formTurn1ToleranceMinutes = $state('5');
	let formTurn2AttendanceTime = $state('16:00');
	let formTurn2ToleranceMinutes = $state('5');
	let formNotes = $state('');
	let formIsActive = $state(true);
	let selectedDegreeCode = $state<string | null>(null);
	let selectedDegreeCodes = $state<string[]>([]);

	const branchOptions = $derived(
		data.branches.map((branch) => ({
			value: branch.code,
			label: branch.name
		}))
	);

	const degreeOptions = $derived(
		data.degreeCatalog.map((degree) => ({
			value: degree.code,
			label: degree.label
		}))
	);

	const availableDegreeOptions = $derived(
		degreeOptions.filter((option) => !selectedDegreeCodes.includes(String(option.value)))
	);

	function getActionError(result: { data?: Record<string, unknown> }): string | null {
		const error = result.data?.error;
		return typeof error === 'string' && error.length > 0 ? error : null;
	}

	function submitForm(formId: string): void {
		const form = document.getElementById(formId);
		if (form instanceof HTMLFormElement) {
			form.requestSubmit();
		}
	}

	function resetForm(): void {
		formTitle = '';
		formBranchCode = data.branches[0]?.code ?? '';
		formModality = 'regular';
		formStartDate = '';
		formEndDate = '';
		formBaseCost = '0';
		formTurn1AttendanceTime = '07:00';
		formTurn1ToleranceMinutes = '5';
		formTurn2AttendanceTime = '16:00';
		formTurn2ToleranceMinutes = '5';
		formNotes = '';
		formIsActive = true;
		selectedDegreeCode = null;
		selectedDegreeCodes = [];
		errorMessage = '';
	}

	function openCreateModal(): void {
		if (!canCreate) return;
		isEditing = false;
		selectedCycle = null;
		resetForm();
		showModal = true;
	}

	function openEditModal(cycle: AcademicCycleOverview): void {
		if (!canUpdate) return;
		isEditing = true;
		selectedCycle = cycle;
		formTitle = cycle.title;
		formBranchCode = cycle.branch_code;
		formModality = cycle.modality;
		formStartDate = formatDateInputValue(cycle.start_date);
		formEndDate = formatDateInputValue(cycle.end_date);
		formBaseCost = String(cycle.base_cost ?? '0');
		formTurn1AttendanceTime = cycle.turn_1_attendance_time ?? '';
		formTurn1ToleranceMinutes = String(cycle.turn_1_tolerance_minutes ?? 0);
		formTurn2AttendanceTime = cycle.turn_2_attendance_time ?? '';
		formTurn2ToleranceMinutes = String(cycle.turn_2_tolerance_minutes ?? 0);
		formNotes = cycle.notes ?? '';
		formIsActive = cycle.is_active;
		selectedDegreeCode = null;
		selectedDegreeCodes = [...(data.cycleDegreeMap[cycle.code] ?? [])];
		errorMessage = '';
		showModal = true;
	}

	function openDeleteModal(cycle: AcademicCycleOverview): void {
		if (!canDelete) return;
		selectedCycle = cycle;
		showDeleteModal = true;
	}

	function closeModal(): void {
		showModal = false;
		errorMessage = '';
	}

	function closeDeleteModal(): void {
		showDeleteModal = false;
		selectedCycle = null;
	}

	function addDegree(): void {
		if (!selectedDegreeCode) return;
		if (!selectedDegreeCodes.includes(selectedDegreeCode)) {
			selectedDegreeCodes = [...selectedDegreeCodes, selectedDegreeCode];
		}
		selectedDegreeCode = null;
	}

	function removeDegree(degreeCode: string): void {
		selectedDegreeCodes = selectedDegreeCodes.filter((code) => code !== degreeCode);
	}

	function getDegreeLabel(degreeCode: string): string {
		return data.degreeCatalog.find((degree) => degree.code === degreeCode)?.label ?? 'Grado';
	}
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader
		title="Ciclos"
		subtitle="Configura periodos académicos, modalidades y grados habilitados"
		icon="bookOpen"
	>
		{#snippet actions()}
			<Button
				type="filled"
				color="primary"
				icon="plus"
				onclick={openCreateModal}
				disabled={!canCreate}
			>
				Nuevo ciclo
			</Button>
		{/snippet}
	</PageHeader>

	{#if !canRead}
		<Alert type="warning" closable>No tienes permisos para consultar ciclos.</Alert>
	{:else if data.cycles.length === 0}
		<EmptyState
			title="Aún no hay ciclos registrados"
			description="Cuando registres el primer ciclo, aparecerá aquí con su oferta académica y métricas."
			icon="bookOpen"
		/>
	{:else}
		<div class="cycles-grid">
			{#each data.cycles as cycle (cycle.code)}
				<div class="cycle-card">
					<Card>
						<div class="lumi-stack lumi-stack--md">
							<div
								class="lumi-flex lumi-justify--between lumi-align-items--start lumi-flex--gap-sm lumi-flex--wrap"
							>
								<div class="lumi-stack lumi-stack--2xs">
									<div class="lumi-flex lumi-align-items--center lumi-flex--gap-xs lumi-flex--wrap">
										<h3 class="lumi-margin--none">{cycle.title}</h3>
										<Chip color={cycle.is_active ? 'success' : 'danger'} size="sm">
											{cycle.is_active ? 'Activo' : 'Inactivo'}
										</Chip>
										<Chip color="info" size="sm">{cycle.modality}</Chip>
									</div>
									<p class="lumi-text--sm lumi-text--muted lumi-margin--none">
										{cycle.branch_name}
									</p>
								</div>

								<div class="lumi-flex lumi-flex--gap-xs">
									<Button
										type="flat"
										size="sm"
										icon="edit"
										onclick={() => openEditModal(cycle)}
										disabled={!canUpdate}
									/>
									<Button
										type="flat"
										size="sm"
										icon="trash"
										color="danger"
										onclick={() => openDeleteModal(cycle)}
										disabled={!canDelete}
									/>
								</div>
							</div>

							<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-sm cycle-card__meta">
								<Chip color="secondary" size="sm">{cycle.degree_count} grados</Chip>
								<Chip color="primary" size="sm">
									{cycle.active_enrollment_count} activas / {cycle.enrollment_count} total
								</Chip>
								<InfoItem
									icon="calendar"
									label="Rango"
									value={formatEducationDateRange(cycle.start_date, cycle.end_date)}
								/>
								<InfoItem
									icon="wallet"
									label="Costo base"
									value={formatEducationCurrency(cycle.base_cost)}
								/>
								<InfoItem
									icon="clock"
									label="Turno 1"
									value={`${cycle.turn_1_attendance_time || '07:00'} · Tol. ${cycle.turn_1_tolerance_minutes} min`}
								/>
								<InfoItem
									icon="clock"
									label="Turno 2"
									value={`${cycle.turn_2_attendance_time || '16:00'} · Tol. ${cycle.turn_2_tolerance_minutes} min`}
								/>
							</div>

							<div class="lumi-stack lumi-stack--2xs">
								<span class="lumi-text--xs lumi-text--muted lumi-font--medium">
									Oferta académica
								</span>
								<p class="lumi-text--sm lumi-margin--none">
									{cycle.degrees_summary || 'Sin grados configurados'}
								</p>
							</div>

							{#if cycle.notes}
								<div class="lumi-stack lumi-stack--2xs">
									<span class="lumi-text--xs lumi-text--muted lumi-font--medium">
										Observaciones
									</span>
									<p class="lumi-text--sm lumi-text--muted lumi-margin--none">{cycle.notes}</p>
								</div>
							{/if}
						</div>
					</Card>
				</div>
			{/each}
		</div>
	{/if}
</div>

<Dialog
	bind:open={showModal}
	title={isEditing ? 'Editar ciclo' : 'Nuevo ciclo'}
	size="lg"
	scrollable
>
	<form
		id="cycle-form"
		method="POST"
		action="?/{isEditing ? 'update' : 'create'}"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast(
						isEditing ? 'Ciclo actualizado exitosamente' : 'Ciclo creado exitosamente',
						'success'
					);
					await invalidate('cycles:load');
					closeModal();
				} else if (result.type === 'failure') {
					errorMessage = getActionError(result) ?? 'Ocurrió un error';
				}
			};
		}}
	>
		{#if isEditing && selectedCycle}
			<input type="hidden" name="code" value={selectedCycle.code} />
		{/if}

		{#if errorMessage}
			<Alert type="danger" closable onclose={() => (errorMessage = '')}>
				{errorMessage}
			</Alert>
		{/if}

		<div class="lumi-stack lumi-stack--md">
			<Fieldset legend="Información general">
				<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-md">
					<Input
						bind:value={formTitle}
						name="title"
						label="Título"
						placeholder="Ej: Verano 2026"
						required
					/>
					<Select
						bind:value={formBranchCode}
						name="branch_code"
						label="Sede"
						options={branchOptions}
						placeholder="Seleccione una sede"
					/>
					<Select
						bind:value={formModality}
						name="modality"
						label="Modalidad"
						options={CYCLE_MODALITY_OPTIONS}
						placeholder="Seleccione modalidad"
					/>
				</div>

				<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-md">
					<Input
						bind:value={formStartDate}
						name="start_date"
						type="date"
						label="Fecha inicio"
						required
					/>
					<Input bind:value={formEndDate} name="end_date" type="date" label="Fecha fin" required />
					<Input
						bind:value={formBaseCost}
						name="base_cost"
						type="number"
						label="Costo base"
						placeholder="0.00"
						required
					/>
				</div>
			</Fieldset>

			<Fieldset legend="Asistencia">
				<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
					<Input
						bind:value={formTurn1AttendanceTime}
						name="turn_1_attendance_time"
						type="time"
						label="Hora de asistencia turno 1"
						required
					/>
					<Input
						bind:value={formTurn1ToleranceMinutes}
						name="turn_1_tolerance_minutes"
						type="number"
						label="Tolerancia turno 1 (minutos)"
						placeholder="5"
						required
					/>
					<Input
						bind:value={formTurn2AttendanceTime}
						name="turn_2_attendance_time"
						type="time"
						label="Hora de asistencia turno 2"
						required
					/>
					<Input
						bind:value={formTurn2ToleranceMinutes}
						name="turn_2_tolerance_minutes"
						type="number"
						label="Tolerancia turno 2 (minutos)"
						placeholder="5"
						required
					/>
				</div>
			</Fieldset>

			<Fieldset legend="Grados habilitados">
				<div class="lumi-stack lumi-stack--sm">
					<div class="lumi-flex lumi-flex--gap-sm lumi-flex--mobile-column">
						<div class="lumi-flex-item--grow">
							<Select
								bind:value={selectedDegreeCode}
								options={availableDegreeOptions}
								placeholder="Seleccione un grado"
								clearable
								autocomplete
							/>
						</div>
						<Button type="border" icon="plus" onclick={addDegree} disabled={!selectedDegreeCode}>
							Agregar
						</Button>
					</div>

					{#if selectedDegreeCodes.length > 0}
						<List size="sm">
							<ListHeader title="Oferta académica del ciclo" icon="listChecks" />
							{#each selectedDegreeCodes as degreeCode (degreeCode)}
								<input type="hidden" name="degree_codes" value={degreeCode} />
								<ListItem title={getDegreeLabel(degreeCode)} icon="bookOpen">
									<Button
										type="flat"
										size="sm"
										icon="x"
										color="danger"
										aria-label={`Quitar ${getDegreeLabel(degreeCode)}`}
										onclick={() => removeDegree(degreeCode)}
									/>
								</ListItem>
							{/each}
						</List>
					{:else}
						<p class="lumi-text--sm lumi-text--muted">
							Agrega la oferta académica del ciclo. El catálogo se mantiene limpio con Unico y
							grados de 1ro a 6to.
						</p>
					{/if}
				</div>
			</Fieldset>

			<Textarea
				bind:value={formNotes}
				name="notes"
				label="Observaciones"
				placeholder="Indicaciones operativas, notas del periodo o detalles relevantes"
				rows={4}
			/>

			<Switch bind:checked={formIsActive} name="is_active" label="Ciclo activo" color="success" />
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeModal}>Cancelar</Button>
		<Button type="filled" color="primary" onclick={() => submitForm('cycle-form')}>
			{isEditing ? 'Actualizar' : 'Crear'}
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showDeleteModal} title="Eliminar ciclo" size="sm">
	<form
		id="delete-cycle-form"
		method="POST"
		action="?/delete"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Ciclo eliminado exitosamente', 'success');
					await invalidate('cycles:load');
					closeDeleteModal();
				} else if (result.type === 'failure') {
					showToast(getActionError(result) ?? 'No se pudo eliminar el ciclo', 'error');
				}
			};
		}}
	>
		{#if selectedCycle}
			<input type="hidden" name="code" value={selectedCycle.code} />
			<p class="lumi-text--sm">
				¿Deseas eliminar el ciclo <strong>{selectedCycle.title}</strong>? Esta acción solo está
				disponible cuando no existen matrículas relacionadas.
			</p>
		{/if}
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeDeleteModal}>Cancelar</Button>
		<Button type="filled" color="danger" onclick={() => submitForm('delete-cycle-form')}>
			Eliminar
		</Button>
	{/snippet}
</Dialog>

<style>
	.cycles-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 22rem));
		gap: var(--lumi-space-md);
		justify-content: center;
		align-items: start;
	}

	.cycle-card {
		width: min(100%, 22rem);
	}
</style>
