<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto, invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import {
		Alert,
		Button,
		Card,
		Chip,
		Dialog,
		Dropdown,
		DropdownItem,
		EmptyState,
		Fieldset,
		Input,
		PageHeader,
		PageSidebar,
		Select,
		Table,
		Textarea,
		type TableRow
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import {
		formatEducationDate,
		formatTeacherAttendanceState,
		formatTeacherEntryTime,
		formatTeacherWeekday,
		getTeacherAttendanceStateColor,
		getTeacherWeekdayFromDate
	} from '$lib/utils';
	import type { TeacherAttendanceState, TeacherWeekday } from '$lib/types/teacher';
	import type { PageData } from './$types';

	type AttendanceRow = PageData['rows'][number];
	type TeacherOption = PageData['teachers'][number];

	const STATE_OPTIONS = [
		{ value: 'presente', label: 'Presente' },
		{ value: 'tarde', label: 'Tarde' }
	];

	const { data }: { data: PageData } = $props();

	const canRead = $derived(can('teacher_attendance:read'));
	const canCreate = $derived(can('teacher_attendance:create'));
	const canUpdate = $derived(can('teacher_attendance:update'));
	const canDelete = $derived(can('teacher_attendance:delete'));

	let filterBranchCode: string | null = $derived(data.selectedBranchCode);
	let filterDate: string = $derived(data.selectedDate);
	let showMobileSidebar = $state(false);

	let showFormModal = $state(false);
	let modalMode = $state<'create' | 'edit'>('create');
	let formError = $state('');
	let formAttendanceCode = $state('');
	let formTeacherCode = $state<string | null>(null);
	let formScheduleCode = $state<string | null>(null);
	let formState = $state<TeacherAttendanceState>('presente');
	let formEntryTime = $state(currentTimeValue());
	let formObservation = $state('');

	let showDeleteModal = $state(false);
	let deleteTarget = $state<AttendanceRow | null>(null);
	let deleteError = $state('');

	const branchOptions = $derived(
		data.branches.map((branch) => ({ value: branch.code, label: branch.name }))
	);

	const attendanceRows = $derived(data.rows as unknown as TableRow[]);

	const teacherOptions = $derived(
		data.teachers.map((teacher) => ({
			value: teacher.code,
			label: `${teacher.full_name} · ${teacher.teacher_number}`
		}))
	);

	const teachersByCode = $derived(new Map(data.teachers.map((teacher) => [teacher.code, teacher])));

	const schedulesForSelectedTeacher = $derived(
		data.schedulesForDay.filter((schedule) => schedule.teacher_code === formTeacherCode)
	);

	const scheduleOptionsForForm = $derived(
		schedulesForSelectedTeacher.map((schedule) => ({
			value: schedule.code,
			label: `${formatTeacherEntryTime(schedule.entry_time)} · ±${schedule.tolerance_minutes} min`
		}))
	);

	const filterDateWeekdayLabel = $derived(
		formatTeacherWeekday(getTeacherWeekdayFromDate(filterDate || data.today))
	);
	const selectedBranchLabel = $derived(
		data.branches.find((branch) => branch.code === filterBranchCode)?.name ?? 'Sin sede activa'
	);
	const selectedDateLabel = $derived(
		filterDate === data.today ? 'Hoy' : formatEducationDate(filterDate)
	);

	$effect(() => {
		if (formTeacherCode && schedulesForSelectedTeacher.length === 1) {
			formScheduleCode = schedulesForSelectedTeacher[0].code;
		} else if (
			formScheduleCode &&
			!schedulesForSelectedTeacher.some((schedule) => schedule.code === formScheduleCode)
		) {
			formScheduleCode = null;
		}
	});

	function currentTimeValue(): string {
		const now = new Date();
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		return `${hours}:${minutes}`;
	}

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

	function buildFilterUrl(): string {
		const params = [
			filterBranchCode ? `branch=${encodeURIComponent(filterBranchCode)}` : '',
			filterDate ? `date=${encodeURIComponent(filterDate)}` : ''
		].filter(Boolean);

		return `/teacher-attendance${params.length > 0 ? `?${params.join('&')}` : ''}`;
	}

	function applyFilters(): void {
		showMobileSidebar = false;
		void goto(resolve(buildFilterUrl() as '/'));
	}

	function clearFilters(): void {
		showMobileSidebar = false;
		void goto(resolve('/teacher-attendance' as '/'));
	}

	function resetFormState(): void {
		formError = '';
		formAttendanceCode = '';
		formTeacherCode = null;
		formScheduleCode = null;
		formState = 'presente';
		formEntryTime = currentTimeValue();
		formObservation = '';
	}

	function openCreateModal(): void {
		if (!canCreate) return;
		modalMode = 'create';
		resetFormState();
		showFormModal = true;
	}

	function openEditModal(row: AttendanceRow): void {
		if (!canUpdate) return;
		modalMode = 'edit';
		formError = '';
		formAttendanceCode = row.attendance_code;
		formTeacherCode = row.teacher_code;
		formScheduleCode = row.schedule_code;
		formState = row.attendance_state;
		formEntryTime = row.attendance_entry_time.slice(0, 5);
		formObservation = row.attendance_observation ?? '';
		showFormModal = true;
	}

	function closeFormModal(): void {
		showFormModal = false;
		resetFormState();
	}

	function openDeleteModal(row: AttendanceRow): void {
		if (!canDelete) return;
		deleteTarget = row;
		deleteError = '';
		showDeleteModal = true;
	}

	function closeDeleteModal(): void {
		showDeleteModal = false;
		deleteTarget = null;
		deleteError = '';
	}

	function describeSchedule(row: AttendanceRow): string {
		return `${formatTeacherWeekday(row.schedule_weekday as TeacherWeekday)} · ${formatTeacherEntryTime(row.schedule_entry_time)}`;
	}
</script>

<div class="lumi-stack lumi-stack--md">
	<PageHeader
		title="Asistencia docente"
		subtitle="Control diario de asistencia docente con registro manual y escaneo QR"
		icon="clipboard"
	>
		{#snippet actions()}
			<div
				class="lumi-flex lumi-flex--gap-sm lumi-align-items--center lumi-page-sidebar__header-actions"
			>
				<Button
					type="ghost"
					size="sm"
					icon="slidersHorizontal"
					class="lumi-page-sidebar__mobile-trigger"
					onclick={() => (showMobileSidebar = true)}
					aria-label="Abrir filtros de asistencia docente"
				/>
				<Button
					type="flat"
					color="secondary"
					onclick={() => void goto(resolve('/teacher-attendance/scan' as '/'))}
				>
					Escanear
				</Button>
				<Button type="gradient" color="primary" onclick={openCreateModal} disabled={!canCreate}>
					Registrar
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<div class="lumi-layout--two-columns lumi-page-sidebar-layout">
		<PageSidebar
			bind:mobileOpen={showMobileSidebar}
			variant="attendance"
			mobileTitle="Sede y fecha"
			mobileAriaLabel="Cerrar filtros de asistencia docente"
		>
			{#snippet sidebar()}
				<div class="lumi-page-sidebar__section">
					<div
						class="lumi-filter-summary lumi-filter-summary--compact lumi-filter-summary--warning"
					>
						<p class="lumi-filter-summary__eyebrow">Filtros del día</p>
						<h2 class="lumi-filter-summary__title">{selectedBranchLabel}</h2>
						<p class="lumi-filter-summary__subtitle">
							{filterDateWeekdayLabel} · {selectedDateLabel}
						</p>
					</div>
				</div>

				<div class="lumi-page-sidebar__section">
					<p class="lumi-page-sidebar__label">Filtros</p>
					<Select
						bind:value={filterBranchCode}
						label="Sede"
						options={branchOptions}
						placeholder="Seleccione una sede"
						clearable={false}
					/>
					<Input bind:value={filterDate} label="Fecha" type="date" />
				</div>

				<div class="lumi-page-sidebar__section lumi-stack lumi-stack--xs">
					<Button type="gradient" color="primary" icon="search" onclick={applyFilters}>
						Aplicar filtros
					</Button>
					<Button type="border" onclick={clearFilters}>Limpiar</Button>
				</div>
			{/snippet}
		</PageSidebar>

		<section class="lumi-layout--content-right">
			<Card spaced>
				<div class="lumi-stack lumi-stack--md">
					<div class="lumi-filter-summary lumi-filter-summary--warning">
						<div class="lumi-filter-summary__copy">
							<p class="lumi-filter-summary__eyebrow">Resumen operativo</p>
							<h2 class="lumi-filter-summary__title">{selectedBranchLabel}</h2>
							<p class="lumi-filter-summary__subtitle">
								Registros de asistencia para {filterDateWeekdayLabel.toLowerCase()},
								{selectedDateLabel.toLowerCase()}.
							</p>
						</div>
						<div class="lumi-filter-summary__meta">
							<Chip color="primary" size="sm" icon="calendar">{selectedDateLabel}</Chip>
							<Chip color="info" size="sm">{filterDateWeekdayLabel}</Chip>
							<Chip color="secondary" size="sm" icon="users">
								{data.rows.length} registros
							</Chip>
						</div>
					</div>

					{#if !canRead}
						<Alert type="warning" closable>
							No tienes permisos para consultar la asistencia docente.
						</Alert>
					{:else if !data.selectedBranchCode}
						<EmptyState
							title="Sin sede activa"
							description="Selecciona una sede en el panel de filtros para visualizar la asistencia docente."
							icon="building"
						/>
					{:else if data.rows.length === 0}
						<EmptyState
							title="Sin registros para esta vista"
							description="Aún no hay asistencias docentes registradas para la sede y fecha seleccionada."
							icon="clipboard"
						/>
					{:else}
						<Table data={attendanceRows} pagination hover itemsPerPage={20}>
							{#snippet thead()}
								<th class="lumi-min-w--xl">Docente</th>
								<th>Horario</th>
								<th>Ingreso</th>
								<th>Estado</th>
								<th>Observación</th>
								<th>Registrado</th>
								<th>Acciones</th>
							{/snippet}

							{#snippet row({ row })}
								{@const attendanceRow = row as unknown as AttendanceRow}
								<td class="lumi-min-w--xl">
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<span class="lumi-font--medium">{attendanceRow.teacher_full_name}</span>
										<span class="lumi-text--xs lumi-text--muted">
											{attendanceRow.teacher_number} · {attendanceRow.teacher_phone ||
												'Sin teléfono'}
										</span>
									</div>
								</td>
								<td>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<span class="lumi-font--medium">{describeSchedule(attendanceRow)}</span>
										<span class="lumi-text--xs lumi-text--muted">
											Tolerancia ±{attendanceRow.schedule_tolerance_minutes} min
										</span>
									</div>
								</td>
								<td>
									<span class="lumi-font--medium">
										{formatTeacherEntryTime(attendanceRow.attendance_entry_time)}
									</span>
								</td>
								<td>
									<Chip
										color={getTeacherAttendanceStateColor(attendanceRow.attendance_state)}
										size="sm"
									>
										{formatTeacherAttendanceState(attendanceRow.attendance_state)}
									</Chip>
								</td>
								<td>
									<span class="lumi-text--sm lumi-text--muted">
										{attendanceRow.attendance_observation || 'Sin observación'}
									</span>
								</td>
								<td>
									<span class="lumi-text--sm lumi-text--muted">
										{attendanceRow.attendance_created_at
											? formatEducationDate(attendanceRow.attendance_created_at)
											: '—'}
									</span>
								</td>
								<td>
									<Dropdown
										position="bottom-end"
										aria-label={`Acciones para ${attendanceRow.teacher_full_name}`}
									>
										{#snippet triggerContent()}
											<Button
												type="flat"
												size="sm"
												icon="moreVertical"
												aria-label={`Abrir acciones para ${attendanceRow.teacher_full_name}`}
											/>
										{/snippet}

										{#snippet content()}
											<DropdownItem
												icon="edit"
												disabled={!canUpdate}
												onclick={() => openEditModal(attendanceRow)}
											>
												Editar registro
											</DropdownItem>
											<DropdownItem
												icon="trash"
												color="danger"
												disabled={!canDelete}
												onclick={() => openDeleteModal(attendanceRow)}
											>
												Eliminar registro
											</DropdownItem>
										{/snippet}
									</Dropdown>
								</td>
							{/snippet}
						</Table>
					{/if}
				</div>
			</Card>
		</section>
	</div>
</div>

<Dialog
	bind:open={showFormModal}
	title={modalMode === 'edit' ? 'Editar asistencia docente' : 'Registrar asistencia docente'}
	size="lg"
	scrollable
>
	<form
		id="teacher-attendance-form"
		method="POST"
		action="?/{modalMode === 'edit' ? 'update' : 'create'}"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast(
						modalMode === 'edit'
							? 'Asistencia actualizada exitosamente'
							: 'Asistencia registrada exitosamente',
						'success'
					);
					await invalidate('teacher_attendance:load');
					closeFormModal();
					return;
				}
				if (result.type === 'failure') {
					formError = getActionError(result) ?? 'Ocurrió un error';
				}
			};
		}}
	>
		{#if modalMode === 'edit'}
			<input type="hidden" name="code" value={formAttendanceCode} />
		{:else}
			<input type="hidden" name="branch_code" value={data.selectedBranchCode ?? ''} />
			<input type="hidden" name="schedule_code" value={formScheduleCode ?? ''} />
			<input type="hidden" name="teacher_code" value={formTeacherCode ?? ''} />
			<input type="hidden" name="attendance_date" value={data.selectedDate} />
		{/if}

		{#if formError}
			<Alert type="danger" closable onclose={() => (formError = '')}>{formError}</Alert>
		{/if}

		<div class="lumi-stack lumi-stack--md">
			{#if modalMode === 'create'}
				<Fieldset legend="Docente y horario">
					<div class="lumi-stack lumi-stack--sm">
						<Select
							bind:value={formTeacherCode}
							label="Docente"
							options={teacherOptions}
							placeholder="Buscar docente"
							autocomplete
							clearable={false}
						/>
						{#if formTeacherCode && schedulesForSelectedTeacher.length === 0}
							<Alert type="warning" closable={false}>
								Este docente no tiene horarios configurados en la sede {selectedBranchLabel} para
								{filterDateWeekdayLabel.toLowerCase()}.
							</Alert>
						{:else}
							<Select
								bind:value={formScheduleCode}
								label="Horario"
								options={scheduleOptionsForForm}
								placeholder={formTeacherCode
									? 'Seleccione un horario'
									: 'Seleccione primero un docente'}
								disabled={!formTeacherCode || scheduleOptionsForForm.length === 0}
								clearable={false}
							/>
						{/if}
					</div>
				</Fieldset>
			{:else if formTeacherCode && teachersByCode.has(formTeacherCode)}
				{@const teacher = teachersByCode.get(formTeacherCode) as TeacherOption}
				<Fieldset legend="Docente">
					<div class="lumi-stack lumi-stack--2xs">
						<strong>{teacher.full_name}</strong>
						<span class="lumi-text--xs lumi-text--muted">
							{teacher.teacher_number} · {teacher.phone || 'Sin teléfono'}
						</span>
					</div>
				</Fieldset>
			{/if}

			<Fieldset legend="Registro">
				<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
					<Select
						bind:value={formState}
						name="state"
						label="Estado"
						options={STATE_OPTIONS}
						clearable={false}
					/>
					<Input
						bind:value={formEntryTime}
						name="entry_time"
						type="time"
						label="Hora de ingreso"
						required
					/>
				</div>
			</Fieldset>

			<Textarea
				bind:value={formObservation}
				name="observation"
				label="Observaciones"
				placeholder="Notas breves del registro"
				rows={4}
			/>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeFormModal}>Cancelar</Button>
		<Button
			type="filled"
			color="primary"
			onclick={() => submitForm('teacher-attendance-form')}
			disabled={modalMode === 'create' &&
				(!formTeacherCode || !formScheduleCode || !data.selectedBranchCode)}
		>
			{modalMode === 'edit' ? 'Guardar cambios' : 'Registrar'}
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showDeleteModal} title="Eliminar asistencia" size="sm">
	<form
		id="delete-teacher-attendance-form"
		method="POST"
		action="?/delete"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Asistencia eliminada exitosamente', 'success');
					await invalidate('teacher_attendance:load');
					closeDeleteModal();
					return;
				}
				if (result.type === 'failure') {
					deleteError = getActionError(result) ?? 'No se pudo eliminar la asistencia';
					showToast(deleteError, 'error');
				}
			};
		}}
	>
		{#if deleteTarget}
			<input type="hidden" name="code" value={deleteTarget.attendance_code} />
			{#if deleteError}
				<Alert type="danger" closable onclose={() => (deleteError = '')}>
					{deleteError}
				</Alert>
			{/if}
			<p class="lumi-margin--none">
				¿Confirmas eliminar la asistencia de
				<strong>{deleteTarget.teacher_full_name}</strong> del horario
				<strong>{describeSchedule(deleteTarget)}</strong>?
			</p>
		{/if}
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeDeleteModal}>Cancelar</Button>
		<Button
			type="filled"
			color="danger"
			disabled={!canDelete || !deleteTarget}
			onclick={() => submitForm('delete-teacher-attendance-form')}
		>
			Eliminar
		</Button>
	{/snippet}
</Dialog>
