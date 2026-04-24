<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import {
		Alert,
		Button,
		Card,
		Dialog,
		Dropdown,
		DropdownItem,
		EmptyState,
		Fieldset,
		Input,
		List,
		ListHeader,
		ListItem,
		PageHeader,
		Progress,
		Select,
		StatusIndicator,
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
		formatEducationDateRange,
		getEducationDateProgress
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
	let formTurn2AttendanceTime = $state('');
	let formTurn2ToleranceMinutes = $state('0');
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
		formTurn2AttendanceTime = '';
		formTurn2ToleranceMinutes = '0';
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

	function getCycleTimeline(cycle: AcademicCycleOverview) {
		return getEducationDateProgress(cycle.start_date, cycle.end_date);
	}

	function getCycleProgressColor(
		cycle: AcademicCycleOverview
	): 'primary' | 'info' | 'success' | 'warning' {
		const timeline = getCycleTimeline(cycle);
		if (timeline.status === 'completed') return 'success';
		if (timeline.status === 'upcoming') return 'info';
		return cycle.is_active ? 'primary' : 'warning';
	}

	function getCycleProgressHeadline(cycle: AcademicCycleOverview): string {
		const timeline = getCycleTimeline(cycle);

		if (timeline.status === 'completed') {
			return `Finalizado en ${timeline.totalDays} día${timeline.totalDays === 1 ? '' : 's'}`;
		}

		if (timeline.status === 'upcoming') {
			if (timeline.daysUntilStart === 0) {
				return 'Empieza hoy';
			}

			return `Empieza en ${timeline.daysUntilStart} día${timeline.daysUntilStart === 1 ? '' : 's'}`;
		}

		return `Han transcurrido ${timeline.passedDays} de ${timeline.totalDays} día${timeline.totalDays === 1 ? '' : 's'}`;
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
		<div class="lumi-grid lumi-grid--dashboard-cards lumi-grid--gap-md">
			{#each data.cycles as cycle (cycle.code)}
				<Card spaced hoverable>
					{@const timeline = getCycleTimeline(cycle)}
					{#snippet header()}
						<div class="lumi-flex lumi-justify--between lumi-align-items--start lumi-flex--gap-sm">
							<div class="lumi-stack lumi-stack--2xs">
								<div class="lumi-flex lumi-align-items--center lumi-flex--gap-xs lumi-flex--wrap">
									<h3 class="lumi-margin--none">{cycle.title}</h3>
									<div
										class="lumi-flex lumi-align-items--center lumi-flex--gap-2xs lumi-text--xs lumi-text--muted"
									>
										<StatusIndicator active={cycle.is_active} pulse={cycle.is_active} />
										<span>{cycle.is_active ? 'Activo' : 'Inactivo'}</span>
									</div>
								</div>
								<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
									{cycle.branch_name} · {cycle.modality}
								</p>
							</div>

							<Dropdown position="bottom-end" aria-label={`Acciones para ${cycle.title}`}>
								{#snippet triggerContent()}
									<Button
										type="flat"
										size="sm"
										icon="moreVertical"
										aria-label={`Abrir acciones para ${cycle.title}`}
									/>
								{/snippet}

								{#snippet content()}
									<DropdownItem
										icon="edit"
										onclick={() => openEditModal(cycle)}
										disabled={!canUpdate}
									>
										Editar ciclo
									</DropdownItem>
									<DropdownItem
										icon="trash"
										color="danger"
										onclick={() => openDeleteModal(cycle)}
										disabled={!canDelete}
									>
										Eliminar ciclo
									</DropdownItem>
								{/snippet}
							</Dropdown>
						</div>
					{/snippet}

					<div class="lumi-stack lumi-stack--sm">
						<div class="lumi-flex lumi-flex--wrap lumi-flex--gap-sm lumi-text--sm lumi-text--muted">
							<span>{cycle.degree_count} grados</span>
							<span>{cycle.active_enrollment_count} activas / {cycle.enrollment_count} total</span>
							<span>{formatEducationCurrency(cycle.base_cost)}</span>
						</div>

						<div class="lumi-stack lumi-stack--2xs">
							<div
								class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--gap-sm lumi-flex--wrap"
							>
								<p class="lumi-margin--none lumi-font--medium">
									{formatEducationDateRange(cycle.start_date, cycle.end_date)}
								</p>
								<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
									{getCycleProgressHeadline(cycle)}
								</p>
							</div>

							<Progress
								value={timeline.percentage}
								color={getCycleProgressColor(cycle)}
								size="lg"
								striped={timeline.status === 'active'}
								animated={timeline.status === 'active'}
								showLabel
							/>
						</div>

						<Fieldset legend="Horario">
							<div class="lumi-stack lumi-stack--2xs">
								<span class="lumi-text--xs lumi-text--muted lumi-font--medium">Turno 1</span>
								<span class="lumi-font--medium">
									{cycle.turn_1_attendance_time || 'No configurado'}
								</span>
								<span class="lumi-text--sm lumi-text--muted">
									Tolerancia {cycle.turn_1_tolerance_minutes} min
								</span>
							</div>
							{#if cycle.turn_2_attendance_time}
								<div class="lumi-stack lumi-stack--2xs">
									<span class="lumi-text--xs lumi-text--muted lumi-font--medium">Turno 2</span>
									<span class="lumi-font--medium">{cycle.turn_2_attendance_time}</span>
									<span class="lumi-text--sm lumi-text--muted">
										Tolerancia {cycle.turn_2_tolerance_minutes} min
									</span>
								</div>
							{/if}
						</Fieldset>

						<div class="lumi-stack lumi-stack--2xs">
							<span class="lumi-text--xs lumi-text--muted lumi-font--medium">Grados</span>
							<p class="lumi-margin--none lumi-text--sm">
								{cycle.degrees_summary || 'Sin grados configurados'}
							</p>
						</div>

						{#if cycle.notes}
							<div class="lumi-stack lumi-stack--2xs">
								<span class="lumi-text--xs lumi-text--muted lumi-font--medium">Observaciones</span>
								<p class="lumi-margin--none lumi-text--sm lumi-text--muted">{cycle.notes}</p>
							</div>
						{/if}
					</div>
				</Card>
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
						label="Hora de asistencia turno 2 (opcional)"
					/>
					<Input
						bind:value={formTurn2ToleranceMinutes}
						name="turn_2_tolerance_minutes"
						type="number"
						label="Tolerancia turno 2 (minutos)"
						placeholder="0"
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
