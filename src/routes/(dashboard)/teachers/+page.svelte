<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto, invalidate } from '$app/navigation';
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
		PageHeader,
		Select,
		Table,
		type TableRow
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import {
		formatTeacherEntryTime,
		formatTeacherWeekdayShort,
		summarizeTeacherSchedules,
		TEACHER_WEEKDAY_OPTIONS
	} from '$lib/utils';
	import type { TeacherWeekday } from '$lib/types/teacher';
	import type { PageData } from './$types';

	type TeacherRow = PageData['teachers'][number];
	type ScheduleItem = TeacherRow['schedules'][number];

	const { data }: { data: PageData } = $props();

	const canRead = $derived(can('teachers:read'));
	const canCreate = $derived(can('teachers:create'));
	const canUpdate = $derived(can('teachers:update'));
	const canDelete = $derived(can('teachers:delete'));

	let searchValue = $derived(data.searchQuery);

	let showFormModal = $state(false);
	let isEditing = $state(false);
	let formCode = $state('');
	let formFirstName = $state('');
	let formLastName = $state('');
	let formPhone = $state('');
	let formError = $state('');

	let showDeleteModal = $state(false);
	let deleteTarget = $state<TeacherRow | null>(null);
	let deleteError = $state('');

	let showSchedulesModal = $state(false);
	let scheduleTargetCode = $state<string | null>(null);
	let scheduleError = $state('');
	let scheduleBranchCode = $state<string | null>(null);
	let scheduleWeekday = $state<string>('1');
	let scheduleEntryTime = $state('07:00');
	let scheduleTolerance = $state('15');

	const branchOptions = $derived(
		data.branches.map((branch) => ({ value: branch.code, label: branch.name }))
	);

	const teacherRows = $derived(data.teachers as unknown as TableRow[]);

	const scheduleTarget = $derived(
		scheduleTargetCode
			? (data.teachers.find((teacher) => teacher.code === scheduleTargetCode) ?? null)
			: null
	);

	$effect(() => {
		if (showSchedulesModal && scheduleBranchCode === null) {
			scheduleBranchCode = data.branches[0]?.code ?? null;
		}
	});

	$effect(() => {
		if (!showSchedulesModal) {
			scheduleBranchCode = null;
			scheduleWeekday = '1';
			scheduleEntryTime = '07:00';
			scheduleTolerance = '15';
			scheduleError = '';
		}
	});

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

	function applySearch(): void {
		const query = searchValue.trim();
		const target = query ? `/teachers?search=${encodeURIComponent(query)}` : '/teachers';
		void goto(resolve(target as '/'));
	}

	function clearSearch(): void {
		searchValue = '';
		void goto(resolve('/teachers' as '/'));
	}

	function openCreateModal(): void {
		if (!canCreate) return;
		isEditing = false;
		formCode = '';
		formFirstName = '';
		formLastName = '';
		formPhone = '';
		formError = '';
		showFormModal = true;
	}

	function openEditModal(teacher: TeacherRow): void {
		if (!canUpdate) return;
		isEditing = true;
		formCode = teacher.code;
		formFirstName = teacher.first_name;
		formLastName = teacher.last_name;
		formPhone = teacher.phone ?? '';
		formError = '';
		showFormModal = true;
	}

	function closeFormModal(): void {
		showFormModal = false;
		formError = '';
	}

	function openDeleteModal(teacher: TeacherRow): void {
		if (!canDelete) return;
		deleteTarget = teacher;
		deleteError = '';
		showDeleteModal = true;
	}

	function closeDeleteModal(): void {
		showDeleteModal = false;
		deleteTarget = null;
		deleteError = '';
	}

	function openSchedulesModal(teacher: TeacherRow): void {
		if (!canUpdate) return;
		scheduleTargetCode = teacher.code;
		scheduleError = '';
		showSchedulesModal = true;
	}

	function closeSchedulesModal(): void {
		showSchedulesModal = false;
		scheduleTargetCode = null;
	}

	function describeSchedule(schedule: ScheduleItem): string {
		const weekday = formatTeacherWeekdayShort(schedule.weekday as TeacherWeekday);
		const time = formatTeacherEntryTime(schedule.entry_time);
		return `${weekday} · ${time} · ${schedule.branch_name} (±${schedule.tolerance_minutes} min)`;
	}
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader
		title="Docentes"
		subtitle="Administra el plantel docente y sus horarios semanales por sede"
		icon="graduationCap"
	>
		{#snippet actions()}
			<Button
				type="filled"
				color="primary"
				icon="plus"
				onclick={openCreateModal}
				disabled={!canCreate}
			>
				Nuevo docente
			</Button>
		{/snippet}
	</PageHeader>

	<Card>
		{#if !canRead}
			<Alert type="warning" closable>No tienes permisos para consultar docentes.</Alert>
		{:else}
			<div class="lumi-stack lumi-stack--md">
				<form
					class="lumi-flex lumi-flex--gap-sm lumi-align-items--end"
					onsubmit={(event) => {
						event.preventDefault();
						applySearch();
					}}
				>
					<div class="lumi-flex-item--grow">
						<Input
							bind:value={searchValue}
							label="Buscar"
							placeholder="Nombre, número o teléfono"
							icon="search"
						/>
					</div>
					<Button type="filled" color="primary" button="submit" icon="search">Buscar</Button>
					{#if data.searchQuery}
						<Button type="border" icon="x" onclick={clearSearch}>Limpiar</Button>
					{/if}
				</form>

				{#if data.teachers.length === 0}
					<EmptyState
						title="Sin docentes registrados"
						description="Registra docentes para asignarles horarios y controlar su asistencia."
						icon="graduationCap"
					>
						{#snippet actions()}
							<Button
								type="filled"
								color="primary"
								icon="plus"
								onclick={openCreateModal}
								disabled={!canCreate}
							>
								Crear docente
							</Button>
						{/snippet}
					</EmptyState>
				{:else}
					<Table data={teacherRows} pagination hover itemsPerPage={15}>
						{#snippet thead()}
							<th>Número</th>
							<th>Docente</th>
							<th>Teléfono</th>
							<th>Horario semanal</th>
							<th>Acciones</th>
						{/snippet}

						{#snippet row({ row })}
							{@const teacher = row as unknown as TeacherRow}
							<td>
								<span class="lumi-font--medium">{teacher.teacher_number}</span>
							</td>
							<td>
								<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
									<span class="lumi-font--medium">{teacher.full_name}</span>
									<span class="lumi-text--xs lumi-text--muted">
										{teacher.schedules.length} horarios configurados
									</span>
								</div>
							</td>
							<td>
								<span class="lumi-text--sm">
									{teacher.phone || 'Sin teléfono'}
								</span>
							</td>
							<td>
								<span class="lumi-text--sm lumi-text--muted">
									{summarizeTeacherSchedules(teacher.schedules)}
								</span>
							</td>
							<td>
								<Dropdown position="bottom-end" aria-label={`Acciones para ${teacher.full_name}`}>
									{#snippet triggerContent()}
										<Button
											type="flat"
											size="sm"
											icon="moreVertical"
											aria-label={`Abrir acciones para ${teacher.full_name}`}
										/>
									{/snippet}

									{#snippet content()}
										<DropdownItem
											icon="clock"
											disabled={!canUpdate}
											onclick={() => openSchedulesModal(teacher)}
										>
											Gestionar horarios
										</DropdownItem>
										<DropdownItem
											icon="edit"
											disabled={!canUpdate}
											onclick={() => openEditModal(teacher)}
										>
											Editar docente
										</DropdownItem>
										<DropdownItem
											icon="trash"
											color="danger"
											disabled={!canDelete}
											onclick={() => openDeleteModal(teacher)}
										>
											Eliminar docente
										</DropdownItem>
									{/snippet}
								</Dropdown>
							</td>
						{/snippet}
					</Table>
				{/if}
			</div>
		{/if}
	</Card>
</div>

<Dialog bind:open={showFormModal} title={isEditing ? 'Editar docente' : 'Nuevo docente'} size="md">
	<form
		id="teacher-form"
		method="POST"
		action="?/{isEditing ? 'update' : 'create'}"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast(
						isEditing ? 'Docente actualizado exitosamente' : 'Docente creado exitosamente',
						'success'
					);
					await invalidate('teachers:load');
					closeFormModal();
					return;
				}
				if (result.type === 'failure') {
					formError = getActionError(result) ?? 'Ocurrió un error';
				}
			};
		}}
	>
		{#if isEditing}
			<input type="hidden" name="code" value={formCode} />
		{/if}

		{#if formError}
			<Alert type="danger" closable onclose={() => (formError = '')}>
				{formError}
			</Alert>
		{/if}

		<div class="lumi-stack lumi-stack--md">
			<Input
				bind:value={formFirstName}
				name="first_name"
				label="Nombres"
				placeholder="Ingrese los nombres"
				required
			/>
			<Input
				bind:value={formLastName}
				name="last_name"
				label="Apellidos"
				placeholder="Ingrese los apellidos"
				required
			/>
			<Input
				bind:value={formPhone}
				name="phone"
				label="Teléfono"
				placeholder="Opcional"
				icon="phone"
			/>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeFormModal}>Cancelar</Button>
		<Button type="filled" color="primary" onclick={() => submitForm('teacher-form')}>
			{isEditing ? 'Guardar cambios' : 'Crear docente'}
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showDeleteModal} title="Eliminar docente" size="sm">
	<form
		id="delete-teacher-form"
		method="POST"
		action="?/delete"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Docente eliminado exitosamente', 'success');
					await invalidate('teachers:load');
					closeDeleteModal();
					return;
				}
				if (result.type === 'failure') {
					deleteError = getActionError(result) ?? 'No se pudo eliminar el docente';
					showToast(deleteError, 'error');
				}
			};
		}}
	>
		{#if deleteTarget}
			<input type="hidden" name="code" value={deleteTarget.code} />
			{#if deleteError}
				<Alert type="danger" closable onclose={() => (deleteError = '')}>
					{deleteError}
				</Alert>
			{/if}
			<p class="lumi-margin--none">
				¿Estás seguro de eliminar al docente
				<strong>{deleteTarget.full_name}</strong>? Esta acción no se puede deshacer.
			</p>
		{/if}
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeDeleteModal}>Cancelar</Button>
		<Button
			type="filled"
			color="danger"
			disabled={!canDelete || !deleteTarget}
			onclick={() => submitForm('delete-teacher-form')}
		>
			Eliminar docente
		</Button>
	{/snippet}
</Dialog>

<Dialog
	bind:open={showSchedulesModal}
	title={scheduleTarget ? `Horarios · ${scheduleTarget.full_name}` : 'Horarios'}
	size="lg"
	scrollable
>
	{#if scheduleTarget}
		{#if scheduleError}
			<Alert type="danger" closable onclose={() => (scheduleError = '')}>
				{scheduleError}
			</Alert>
		{/if}

		<div class="lumi-stack lumi-stack--md">
			<Fieldset legend="Agregar horario">
				<form
					id="create-schedule-form"
					method="POST"
					action="?/create_schedule"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								showToast('Horario agregado exitosamente', 'success');
								await invalidate('teachers:load');
								scheduleEntryTime = '07:00';
								scheduleTolerance = '15';
								return;
							}
							if (result.type === 'failure') {
								scheduleError = getActionError(result) ?? 'No se pudo agregar el horario';
							}
						};
					}}
				>
					<input type="hidden" name="teacher_code" value={scheduleTarget.code} />
					<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
						<Select
							bind:value={scheduleBranchCode}
							name="branch_code"
							label="Sede"
							options={branchOptions}
							placeholder="Seleccione una sede"
							clearable={false}
						/>
						<Select
							bind:value={scheduleWeekday}
							name="weekday"
							label="Día"
							options={TEACHER_WEEKDAY_OPTIONS}
							clearable={false}
						/>
						<Input
							bind:value={scheduleEntryTime}
							name="entry_time"
							label="Hora de ingreso"
							type="time"
							required
						/>
						<Input
							bind:value={scheduleTolerance}
							name="tolerance_minutes"
							label="Tolerancia (min)"
							type="number"
							required
						/>
					</div>
					<div class="lumi-flex lumi-justify--end lumi-margin-top--sm">
						<Button
							type="filled"
							color="primary"
							icon="plus"
							button="submit"
							disabled={!scheduleBranchCode}
						>
							Agregar horario
						</Button>
					</div>
				</form>
			</Fieldset>

			<Fieldset legend="Horarios actuales">
				{#if scheduleTarget.schedules.length === 0}
					<EmptyState
						title="Sin horarios configurados"
						description="Agrega los horarios semanales del docente por sede para habilitar el control de asistencia."
						icon="clock"
					/>
				{:else}
					<div class="lumi-stack lumi-stack--xs">
						{#each scheduleTarget.schedules as schedule (schedule.code)}
							<div class="teacher-schedule-row">
								<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
									<span class="lumi-font--medium">{describeSchedule(schedule)}</span>
									<span class="lumi-text--xs lumi-text--muted">
										ID: {schedule.code.slice(0, 8)}…
									</span>
								</div>
								<form
									method="POST"
									action="?/delete_schedule"
									use:enhance={() => {
										return async ({ result }) => {
											if (result.type === 'success') {
												showToast('Horario eliminado', 'success');
												await invalidate('teachers:load');
												return;
											}
											if (result.type === 'failure') {
												scheduleError = getActionError(result) ?? 'No se pudo eliminar el horario';
												showToast(scheduleError, 'error');
											}
										};
									}}
								>
									<input type="hidden" name="schedule_code" value={schedule.code} />
									<Button
										type="flat"
										color="danger"
										size="sm"
										icon="trash"
										button="submit"
										disabled={!canUpdate}
										aria-label="Eliminar horario"
									/>
								</form>
							</div>
						{/each}
					</div>
				{/if}
			</Fieldset>
		</div>
	{/if}

	{#snippet footer()}
		<Button type="border" onclick={closeSchedulesModal}>Cerrar</Button>
	{/snippet}
</Dialog>

<style>
	.teacher-schedule-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-lg);
		background: var(--lumi-color-surface);
	}
</style>
