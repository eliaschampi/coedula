<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { goto, invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import {
		Alert,
		Button,
		Card,
		Chip,
		Dialog,
		Divider,
		Dropdown,
		DropdownItem,
		EmptyState,
		Fieldset,
		InfoItem,
		Input,
		PageHeader,
		Select,
		Table,
		Textarea,
		type TableRow
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import {
		deriveTeacherAttendanceAutoState,
		formatEducationDate,
		formatEducationDateTime,
		formatTeacherAttendanceState,
		formatTeacherEntryTime,
		formatTeacherWeekday,
		getTeacherAttendanceStateColor,
		getTeacherWeekdayFromDate
	} from '$lib/utils';
	import {
		isTeacherAttendanceSlotWithinWindowAt,
		toTeacherAttendanceScheduleSlot
	} from '$lib/utils/teacherAttendanceWindow';
	import type { TeacherAttendanceState, TeacherWeekday } from '$lib/types/teacher';
	import type { PageData } from './$types';

	type AttendanceRow = PageData['rows'][number];
	type TeacherOption = PageData['teachers'][number];

	const STATE_OPTIONS = [
		{ value: 'presente', label: 'Presente' },
		{ value: 'tarde', label: 'Tarde' },
		{ value: 'permiso', label: 'Permiso' },
		{ value: 'falta', label: 'Falta' },
		{ value: 'justificado', label: 'Justificado' }
	];

	const { data }: { data: PageData } = $props();

	const canRead = $derived(can('teacher_attendance:read'));
	const canCreate = $derived(can('teacher_attendance:create'));
	const canUpdate = $derived(can('teacher_attendance:update'));
	const canDelete = $derived(can('teacher_attendance:delete'));

	// Editable copy of the URL-driven date; re-sync when `data` updates after navigation.
	// eslint-disable-next-line svelte/prefer-writable-derived -- need mutable bind + URL sync
	let filterDate = $state('');
	$effect(() => {
		filterDate = data.selectedDate;
	});

	let showFormModal = $state(false);
	let modalMode = $state<'create' | 'edit'>('create');
	let formError = $state('');
	let formAttendanceCode = $state('');
	let formTeacherCode = $state<string | null>(null);
	let formScheduleCode = $state<string | null>(null);
	let formState = $state<TeacherAttendanceState>('presente');
	let formObservation = $state('');

	let wallNowMs = $state(Date.now());

	function formatNowHhMmSs(date: Date): string {
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		const seconds = String(date.getSeconds()).padStart(2, '0');
		return `${hours}:${minutes}:${seconds}`;
	}

	function currentTimeValue(): string {
		return formatNowHhMmSs(new Date(wallNowMs)).slice(0, 5);
	}

	let formEntryTime = $state(currentTimeValue());

	let showDeleteModal = $state(false);
	let deleteTarget = $state<AttendanceRow | null>(null);
	let deleteError = $state('');

	const attendanceRows = $derived(data.rows as unknown as TableRow[]);

	const registeredScheduleCodes = $derived(new Set(data.rows.map((row) => row.schedule_code)));

	const isAttendanceDateToday = $derived(data.selectedDate === data.today);

	const teachersByCode = $derived(new Map(data.teachers.map((teacher) => [teacher.code, teacher])));

	const schedulesForSelectedTeacher = $derived(
		data.schedulesForDay.filter((schedule) => schedule.teacher_code === formTeacherCode)
	);

	const unregisteredSchedulesForSelectedTeacher = $derived(
		schedulesForSelectedTeacher.filter((schedule) => !registeredScheduleCodes.has(schedule.code))
	);

	/** Schedules still without attendance for the selected day, with today's window rule applied once. */
	const pendingSchedulesEligibleForCreate = $derived.by(() => {
		const pending = data.schedulesForDay.filter(
			(schedule) => !registeredScheduleCodes.has(schedule.code)
		);
		if (!isAttendanceDateToday) return pending;
		const now = new Date(wallNowMs);
		return pending.filter((schedule) =>
			isTeacherAttendanceSlotWithinWindowAt(toTeacherAttendanceScheduleSlot(schedule), now)
		);
	});

	const teacherOptionsForCreate = $derived(
		data.teachers
			.filter((teacher) =>
				pendingSchedulesEligibleForCreate.some((s) => s.teacher_code === teacher.code)
			)
			.map((teacher) => ({
				value: teacher.code,
				label: `${teacher.full_name} · ${teacher.teacher_number}`
			}))
	);

	const schedulesForCreateForm = $derived(
		pendingSchedulesEligibleForCreate.filter(
			(schedule) => schedule.teacher_code === formTeacherCode
		)
	);

	const scheduleOptionsForForm = $derived(
		schedulesForCreateForm.map((schedule) => ({
			value: schedule.code,
			label: `${formatTeacherEntryTime(schedule.entry_time)} · ±${schedule.tolerance_minutes} min`
		}))
	);

	const filterDateWeekdayLabel = $derived(
		formatTeacherWeekday(getTeacherWeekdayFromDate(filterDate || data.today))
	);
	const selectedDateLabel = $derived(
		filterDate === data.today ? 'Hoy' : formatEducationDate(filterDate)
	);

	const liveClockHhMmSs = $derived(formatNowHhMmSs(new Date(wallNowMs)));

	const createDerivedAttendanceState = $derived.by((): TeacherAttendanceState => {
		if (modalMode !== 'create' || !formScheduleCode) return 'presente';
		const schedule = data.schedulesForDay.find((s) => s.code === formScheduleCode);
		if (!schedule) return 'presente';
		return deriveTeacherAttendanceAutoState(
			liveClockHhMmSs.slice(0, 5),
			formatTeacherEntryTime(schedule.entry_time)
		);
	});

	$effect(() => {
		if (!browser || !canRead) {
			wallNowMs = Date.now();
			return;
		}
		const needsLiveClock =
			data.selectedDate === data.today || (showFormModal && modalMode === 'create');
		if (!needsLiveClock) {
			wallNowMs = Date.now();
			return;
		}
		const id = setInterval(() => {
			wallNowMs = Date.now();
		}, 1000);
		return () => clearInterval(id);
	});

	$effect(() => {
		if (modalMode !== 'create') return;
		if (formTeacherCode && schedulesForCreateForm.length === 1) {
			formScheduleCode = schedulesForCreateForm[0].code;
		} else if (
			formScheduleCode &&
			!schedulesForCreateForm.some((schedule) => schedule.code === formScheduleCode)
		) {
			formScheduleCode = null;
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

	function buildFilterUrl(): string {
		return filterDate
			? `/teacher-attendance?date=${encodeURIComponent(filterDate)}`
			: '/teacher-attendance';
	}

	function syncDateToUrl(): void {
		const target = buildFilterUrl();
		const current = `${page.url.pathname}${page.url.search}`;
		if (current === target) return;
		void goto(resolve(target as '/'));
	}

	function resetFormState(): void {
		formError = '';
		formAttendanceCode = '';
		formTeacherCode = null;
		formScheduleCode = null;
		formState = 'presente';
		formEntryTime = currentTimeValue();
		formObservation = '';
		wallNowMs = Date.now();
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

<div class="lumi-stack lumi-stack--lg">
	<PageHeader
		title="Asistencia docente"
		subtitle="Consulta por fecha y registra o edita la asistencia desde el mismo flujo"
		icon="clipboard"
	>
		{#snippet actions()}
			<Button
				type="gradient"
				color="primary"
				icon="plus"
				onclick={openCreateModal}
				disabled={!canCreate}
			>
				Registrar
			</Button>
		{/snippet}
	</PageHeader>

	<Card>
		{#if !canRead}
			<Alert type="warning" closable>
				No tienes permisos para consultar la asistencia docente.
			</Alert>
		{:else if !data.selectedBranchCode}
			<EmptyState
				title="Sin sede activa"
				description="Configura tu sede de trabajo en Mi perfil para ver y registrar asistencia docente."
				icon="building"
			/>
		{:else}
			<div class="lumi-stack lumi-stack--md">
				<div class="lumi-flex lumi-flex--gap-sm lumi-align-items--end">
					<div class="lumi-flex-item--grow">
						<Input
							bind:value={filterDate}
							label="Fecha"
							type="date"
							icon="calendar"
							oninput={syncDateToUrl}
						/>
					</div>
				</div>

				<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
					{filterDateWeekdayLabel} · {selectedDateLabel} · {data.rows.length}
					{data.rows.length === 1 ? 'registro' : 'registros'}
					{#if isAttendanceDateToday}
						· Registro manual hoy: solo horarios dentro de ventana entrada ± tolerancia
					{/if}
				</p>

				{#if data.rows.length === 0}
					<EmptyState
						title="Sin registros para esta vista"
						description="Aún no hay asistencias docentes registradas para la sede y fecha seleccionada. Puedes registrar una desde el botón Registrar."
						icon="clipboard"
					>
						{#snippet actions()}
							<Button
								type="filled"
								color="primary"
								icon="plus"
								onclick={openCreateModal}
								disabled={!canCreate}
							>
								Registrar asistencia
							</Button>
						{/snippet}
					</EmptyState>
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
										{attendanceRow.teacher_number} · {attendanceRow.teacher_phone || 'Sin teléfono'}
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
										? formatEducationDateTime(attendanceRow.attendance_created_at)
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
		{/if}
	</Card>
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
					const wasEdit = modalMode === 'edit';
					showToast(
						wasEdit
							? 'Asistencia actualizada exitosamente'
							: 'Asistencia registrada. Puedes continuar con el siguiente docente.',
						'success'
					);
					await invalidate('teacher_attendance:load');
					if (wasEdit) {
						closeFormModal();
					} else {
						formError = '';
						resetFormState();
					}
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
			<input type="hidden" name="entry_time" value={liveClockHhMmSs.slice(0, 5)} />
			<input type="hidden" name="state" value={createDerivedAttendanceState} />
		{/if}

		{#if formError}
			<Alert type="danger" closable onclose={() => (formError = '')}>{formError}</Alert>
		{/if}

		<div class="lumi-stack lumi-stack--md">
			{#if modalMode === 'create'}
				<InfoItem
					icon="calendar"
					iconColor="primary"
					label="Día de registro"
					layout="horizontal"
					class="lumi-width--full"
				>
					<span class="lumi-font--medium">{filterDateWeekdayLabel} · {selectedDateLabel}</span>
				</InfoItem>
				<Divider spaced={false} />
			{/if}

			{#if modalMode === 'create'}
				<Fieldset legend="Docente y horario">
					<div class="lumi-stack lumi-stack--md">
						{#if isAttendanceDateToday}
							<p class="lumi-margin--none lumi-text--xs lumi-text--muted">
								En la fecha de hoy solo se listan horarios cuya hora actual cae dentro de entrada ±
								tolerancia.
							</p>
						{/if}
						{#if teacherOptionsForCreate.length === 0}
							<Alert type="warning" closable={false}>
								No quedan horarios pendientes de registro para esta fecha en tu sede activa (o, si
								es hoy, ninguno en ventana de tolerancia).
							</Alert>
						{:else}
							<Select
								bind:value={formTeacherCode}
								label="Docente"
								options={teacherOptionsForCreate}
								placeholder="Buscar docente"
								autocomplete
								clearable={false}
							/>
							{#if formTeacherCode && schedulesForSelectedTeacher.length === 0}
								<Alert type="warning" closable={false}>
									Este docente no tiene horarios configurados para
									{filterDateWeekdayLabel.toLowerCase()} en tu sede activa.
								</Alert>
							{:else if formTeacherCode && schedulesForCreateForm.length === 0}
								{#if isAttendanceDateToday && unregisteredSchedulesForSelectedTeacher.length > 0}
									<Alert type="warning" closable={false}>
										Fuera de la ventana de registro: la hora actual no está dentro de entrada ±
										tolerancia de los horarios pendientes de este docente. Espera la próxima ventana
										o elige otra fecha en el filtro para correcciones.
									</Alert>
								{:else}
									<Alert type="info" closable={false}>
										Este docente ya tiene asistencia registrada para todos sus horarios de este día.
									</Alert>
								{/if}
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

			<Fieldset legend="Estado e ingreso">
				{#if modalMode === 'create'}
					<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
						<InfoItem
							icon="clock"
							iconColor="primary"
							label="Hora de registro"
							layout="horizontal"
							class="lumi-width--full"
						>
							<span class="lumi-font--medium">{liveClockHhMmSs}</span>
						</InfoItem>
						<InfoItem
							icon="clipboardCheck"
							iconColor="primary"
							label="Estado"
							layout="horizontal"
							class="lumi-width--full"
						>
							{#if formScheduleCode}
								<Chip
									color={getTeacherAttendanceStateColor(createDerivedAttendanceState)}
									size="sm"
								>
									{formatTeacherAttendanceState(createDerivedAttendanceState)}
								</Chip>
							{:else}
								<span class="lumi-text--sm lumi-text--muted">Selecciona un horario</span>
							{/if}
						</InfoItem>
					</div>
					<p class="lumi-margin--none lumi-text--xs lumi-text--muted">
						Valores de solo lectura: se fijan al enviar según el reloj y el horario de ingreso
						seleccionado (presente o tarde).
					</p>
				{:else}
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
				{/if}
			</Fieldset>

			<Fieldset legend="Observaciones (opcional)">
				<Textarea
					bind:value={formObservation}
					name="observation"
					label=""
					aria-label="Observaciones opcionales del registro"
					placeholder="Observación breve (opcional)"
					rows={3}
				/>
			</Fieldset>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeFormModal}>Cancelar</Button>
		<span
			title={modalMode === 'create' &&
			(!formTeacherCode || !formScheduleCode || !data.selectedBranchCode)
				? 'Selecciona docente y horario'
				: undefined}
		>
			<Button
				type="filled"
				color="primary"
				icon={modalMode === 'create' ? 'check' : undefined}
				onclick={() => submitForm('teacher-attendance-form')}
				disabled={modalMode === 'create' &&
					(!formTeacherCode || !formScheduleCode || !data.selectedBranchCode)}
			>
				{modalMode === 'edit' ? 'Guardar cambios' : 'Registrar'}
			</Button>
		</span>
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
