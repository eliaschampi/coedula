<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto, invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import {
		Alert,
		Avatar,
		Button,
		Card,
		Chip,
		Dialog,
		Dropdown,
		DropdownItem,
		EmptyState,
		Fieldset,
		Input,
		List,
		ListItem,
		PageHeader,
		PageSidebar,
		Select,
		Table,
		Textarea,
		type TableRow
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import type { AttendanceState } from '$lib/types/attendance';
	import type { EnrollmentTurn, GroupCode } from '$lib/types/education';
	import {
		ATTENDANCE_STATE_OPTIONS,
		formatAttendanceState,
		formatAttendanceTime,
		formatEducationDate,
		formatEnrollmentTurn,
		formatGroupCode,
		GROUP_CODE_OPTIONS,
		getAttendanceStateColor,
		getEnrollmentTurnColor,
		isTimedAttendanceState,
		summarizeAttendance
	} from '$lib/utils';
	import type { PageData } from './$types';

	type DailyRow = PageData['rows'][number];

	const { data }: { data: PageData } = $props();

	const canRead = $derived(can('attendance:read'));
	const canCreate = $derived(can('attendance:create'));
	const canUpdate = $derived(can('attendance:update'));
	const canReadStudents = $derived(can('students:read'));
	const attendanceRows = $derived(data.rows as unknown as TableRow[]);

	let filterCycleCode = $state<string | null>(null);
	let filterCycleDegreeCode = $state<string | null>(null);
	let filterGroupCode = $state<GroupCode>('A');
	let filterTurn = $state<EnrollmentTurn>('turn_1');
	let filterDate = $state('');
	let filterSearchQuery = $state('');
	let showMobileSidebar = $state(false);
	let showFormModal = $state(false);
	let attendanceModalMode = $state<'create' | 'edit'>('create');
	let errorMessage = $state('');
	let selectedManualRow = $state<DailyRow | null>(null);
	let manualSearchQuery = $state('');
	let formAttendanceCode = $state('');
	let formEnrollmentCode = $state('');
	let formState = $state<AttendanceState>('presente');
	let formEntryTime = $state(currentTimeValue());
	let formObservation = $state('');

	const cycleOptions = $derived(
		data.cycles.map((cycle) => ({
			value: cycle.code,
			label: cycle.label
		}))
	);

	const filteredCycleDegreeOptions = $derived(
		data.cycleDegreeOptions
			.filter((option) => option.cycle_code === filterCycleCode)
			.map((option) => ({
				value: option.code,
				label: option.label
			}))
	);

	const selectedCycleLabel = $derived(
		data.cycles.find((cycle) => cycle.code === filterCycleCode)?.label ?? 'Sin ciclo activo'
	);
	const selectedCycle = $derived(
		data.cycles.find((cycle) => cycle.code === filterCycleCode) ?? null
	);
	const availableTurnOptions = $derived(
		[
			selectedCycle?.turn_1_attendance_time ? { value: 'turn_1', label: 'Turno 1' } : null,
			selectedCycle?.turn_2_attendance_time ? { value: 'turn_2', label: 'Turno 2' } : null
		].filter(Boolean) as Array<{ value: EnrollmentTurn; label: string }>
	);

	const selectedDegreeLabel = $derived(
		data.cycleDegreeOptions.find((option) => option.code === filterCycleDegreeCode)?.label ??
			'Sin grado activo'
	);

	const attendanceSummary = $derived(summarizeAttendance(data.rows));
	const pendingCount = $derived(attendanceSummary.pending);

	const selectedDateLabel = $derived(
		filterDate === data.today ? 'Hoy' : formatEducationDate(filterDate)
	);
	const selectedTurnLabel = $derived(formatEnrollmentTurn(filterTurn));
	const needsEntryTime = $derived(isTimedAttendanceState(formState));
	const canCompleteMissing = $derived(filterDate === data.today && pendingCount > 0 && canCreate);
	const missingCandidates = $derived(data.rows.filter((row) => !row.attendance_code));
	const filteredMissingCandidates = $derived.by(() => {
		const query = manualSearchQuery.trim().toLowerCase();
		if (!query) return missingCandidates;

		return missingCandidates.filter((row) =>
			[
				row.student_full_name,
				row.student_number,
				row.student_dni ?? '',
				row.roll_code,
				row.enrollment_number
			]
				.join(' ')
				.toLowerCase()
				.includes(query)
		);
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

	function resetAttendanceForm(): void {
		selectedManualRow = null;
		manualSearchQuery = '';
		formAttendanceCode = '';
		formEnrollmentCode = '';
		formState = 'presente';
		formEntryTime = currentTimeValue();
		formObservation = '';
		errorMessage = '';
	}

	function handleFilterCycleChange(value: string | number | object | null): void {
		filterCycleCode = value ? String(value) : null;
		const nextOptions = data.cycleDegreeOptions.filter(
			(option) => option.cycle_code === filterCycleCode
		);
		filterCycleDegreeCode = nextOptions[0]?.code ?? null;
	}

	function buildFilterUrl(): string {
		const entries = [
			filterCycleCode ? `cycle=${encodeURIComponent(filterCycleCode)}` : '',
			filterCycleDegreeCode ? `degree=${encodeURIComponent(filterCycleDegreeCode)}` : '',
			filterGroupCode ? `group=${encodeURIComponent(filterGroupCode)}` : '',
			`turn=${encodeURIComponent(filterTurn)}`,
			filterDate ? `date=${encodeURIComponent(filterDate)}` : '',
			filterSearchQuery.trim() ? `search=${encodeURIComponent(filterSearchQuery.trim())}` : ''
		].filter(Boolean);

		return `/attendance${entries.length > 0 ? `?${entries.join('&')}` : ''}`;
	}

	function applyFilters(): void {
		void goto(resolve(buildFilterUrl() as '/'));
	}

	function applyFiltersAndCloseSidebar(): void {
		showMobileSidebar = false;
		applyFilters();
	}

	function clearFilters(): void {
		showMobileSidebar = false;
		void goto(resolve('/attendance' as '/'));
	}

	function selectManualRow(row: DailyRow): void {
		selectedManualRow = row;
		formEnrollmentCode = row.enrollment_code;
		manualSearchQuery = row.student_full_name;
	}

	function clearManualSelection(): void {
		selectedManualRow = null;
		formEnrollmentCode = '';
		manualSearchQuery = '';
	}

	function openCreateModal(row?: DailyRow): void {
		if (!canCreate) return;
		attendanceModalMode = 'create';
		resetAttendanceForm();
		if (row) {
			selectManualRow(row);
		}
		showFormModal = true;
	}

	function openEditModal(row: DailyRow): void {
		if (!canUpdate || !row.attendance_code || !row.attendance_state) return;
		attendanceModalMode = 'edit';
		selectedManualRow = row;
		manualSearchQuery = row.student_full_name;
		formAttendanceCode = row.attendance_code;
		formEnrollmentCode = row.enrollment_code;
		formState = row.attendance_state;
		formEntryTime = row.attendance_entry_time ? row.attendance_entry_time.slice(0, 5) : '';
		formObservation = row.attendance_observation ?? '';
		errorMessage = '';
		showFormModal = true;
	}

	function closeFormModal(): void {
		showFormModal = false;
		resetAttendanceForm();
	}

	function openStudentProfile(studentCode: string): void {
		if (!canReadStudents) return;
		void goto(resolve(`/students/${studentCode}` as '/'));
	}

	function openStudentAttendance(studentCode: string): void {
		void goto(resolve(`/students/${studentCode}/attendance` as '/'));
	}

	$effect(() => {
		if (!showFormModal) {
			filterCycleCode = data.selectedCycleCode;
			filterCycleDegreeCode = data.selectedCycleDegreeCode;
			filterGroupCode = data.selectedGroupCode as GroupCode;
			filterTurn = data.selectedTurn;
			filterDate = data.selectedDate;
			filterSearchQuery = data.searchQuery;
		}
	});

	$effect(() => {
		const availableTurns = availableTurnOptions.map((option) => option.value);
		if (!availableTurns.includes(filterTurn) && availableTurns[0]) {
			filterTurn = availableTurns[0];
		}
	});

	$effect(() => {
		if (!needsEntryTime) {
			formEntryTime = '';
		} else if (!formEntryTime) {
			formEntryTime = currentTimeValue();
		}
	});
</script>

<div class="lumi-stack lumi-stack--md">
	<PageHeader
		title="Asistencia"
		subtitle="Control diario por ciclo, grado, grupo y turno, con registro manual y escaneo QR"
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
					aria-label="Abrir filtros de asistencia"
				/>
				<Button
					type="border"
					color="info"
					icon="creditCard"
					onclick={() => void goto(resolve('/attendance/scan' as '/'))}
				>
					Escanear QR
				</Button>
				<Button type="filled" color="primary" icon="plus" onclick={() => openCreateModal()}>
					Registrar asistencia
				</Button>
				{#if canCompleteMissing}
					<Button
						type="flat"
						color="warning"
						icon="badgeCheck"
						onclick={() => submitForm('complete-attendance-form')}
					>
						Completar faltas
					</Button>
				{/if}
			</div>
		{/snippet}
	</PageHeader>

	<form
		id="complete-attendance-form"
		method="POST"
		action="?/complete_missing"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					const insertedCount =
						typeof result.data?.insertedCount === 'number' ? result.data.insertedCount : 0;
					await invalidate('attendance:load');
					showToast(
						insertedCount > 0
							? `${insertedCount} faltas se completaron automáticamente`
							: 'No había asistencias pendientes por completar',
						'success'
					);
					return;
				}

				if (result.type === 'failure') {
					showToast(getActionError(result) ?? 'No se pudieron completar las faltas', 'error');
				}
			};
		}}
	>
		<input type="hidden" name="cycle_code" value={filterCycleCode ?? ''} />
		<input type="hidden" name="cycle_degree_code" value={filterCycleDegreeCode ?? ''} />
		<input type="hidden" name="group_code" value={filterGroupCode} />
		<input type="hidden" name="turn" value={filterTurn} />
		<input type="hidden" name="attendance_date" value={filterDate} />
	</form>

	<div class="lumi-layout--two-columns lumi-page-sidebar-layout attendance-page__layout">
		<PageSidebar
			bind:mobileOpen={showMobileSidebar}
			variant="attendance"
			mobileTitle="Ciclo, turno y fecha"
			mobileAriaLabel="Cerrar filtros de asistencia"
		>
			{#snippet sidebar()}
				<div class="lumi-page-sidebar__section">
					<div class="attendance-sidebar__hero">
						<p class="lumi-page-sidebar__label">Resumen del día</p>
						<h2 class="attendance-sidebar__title">{selectedCycleLabel}</h2>
						<p class="attendance-sidebar__subtitle">
							{selectedDegreeLabel} · {formatGroupCode(filterGroupCode)}
						</p>
						<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
							<Chip color="primary" size="sm" icon="calendar">{selectedDateLabel}</Chip>
							<Chip color="info" size="sm">{formatGroupCode(filterGroupCode)}</Chip>
							<Chip color={getEnrollmentTurnColor(filterTurn)} size="sm">
								{selectedTurnLabel}
							</Chip>
							{#if filterSearchQuery.trim()}
								<Chip color="secondary" size="sm" icon="search">
									{filterSearchQuery.trim()}
								</Chip>
							{/if}
						</div>
					</div>
				</div>

				<div class="lumi-page-sidebar__section">
					<p class="lumi-page-sidebar__label">Filtros</p>
					<Select
						bind:value={filterCycleCode}
						label="Ciclo"
						options={cycleOptions}
						placeholder="Seleccione un ciclo"
						onchange={handleFilterCycleChange}
					/>
					<Select
						bind:value={filterCycleDegreeCode}
						label="Grado"
						options={filteredCycleDegreeOptions}
						placeholder="Seleccione un grado"
						disabled={!filterCycleCode}
					/>
					<Select bind:value={filterGroupCode} label="Grupo" options={GROUP_CODE_OPTIONS} />
					<Select
						bind:value={filterTurn}
						label="Turno"
						options={availableTurnOptions}
						clearable={false}
					/>
					<Input bind:value={filterDate} label="Fecha" type="date" />
					<Input
						bind:value={filterSearchQuery}
						label="Buscar alumno"
						placeholder="Nombre, DNI, matrícula o lista"
					/>
				</div>

				<div class="lumi-page-sidebar__section">
					<p class="lumi-page-sidebar__label">Acciones</p>
					<div class="lumi-stack lumi-stack--xs">
						<Button
							type="filled"
							color="primary"
							icon="search"
							onclick={applyFiltersAndCloseSidebar}
						>
							Aplicar filtros
						</Button>
						<Button type="border" onclick={clearFilters}>Limpiar</Button>
					</div>
				</div>
			{/snippet}
		</PageSidebar>

		<section class="lumi-layout--content-right">
			<div class="lumi-stack lumi-stack--sm">
				<Card spaced>
					<div class="lumi-stack lumi-stack--md">
						<div class="attendance-page__spotlight">
							<div class="attendance-page__spotlight-copy">
								<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Resumen operativo</p>
								<h2 class="attendance-page__spotlight-title">{selectedCycleLabel}</h2>
								<p class="attendance-page__spotlight-subtitle">
									{selectedDegreeLabel} · {formatGroupCode(filterGroupCode)} · {selectedDateLabel}
								</p>
							</div>

							<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
								<Chip color="primary" size="sm" icon="calendar">{selectedDateLabel}</Chip>
								<Chip color="info" size="sm">{formatGroupCode(filterGroupCode)}</Chip>
								<Chip color={getEnrollmentTurnColor(filterTurn)} size="sm">
									{selectedTurnLabel}
								</Chip>
								<Chip color="warning" size="sm" icon="clock">{pendingCount} pendientes</Chip>
							</div>
						</div>

						{#if !canRead}
							<Alert type="warning" closable>No tienes permisos para consultar asistencia.</Alert>
						{:else if !data.selectedCycleCode || !data.selectedCycleDegreeCode}
							<EmptyState
								title="Configura ciclo, grado, grupo y turno"
								description="Selecciona ciclo, grado y grupo para cargar el control diario."
								icon="slidersHorizontal"
							/>
						{:else if data.rows.length === 0}
							<EmptyState
								title="No hay alumnos activos en esta vista"
								description="Cuando existan matrículas activas en el grupo y turno seleccionados, aparecerán aquí para registrar asistencia."
								icon="users"
							/>
						{:else}
							<Table data={attendanceRows} pagination hover itemsPerPage={25}>
								{#snippet thead()}
									<th>Lista</th>
									<th>Alumno</th>
									<th>Turno</th>
									<th>Ingreso</th>
									<th>Estado</th>
									<th>Observación</th>
									<th>Acciones</th>
								{/snippet}

								{#snippet row({ row })}
									{@const attendanceRow = row as unknown as DailyRow}
									<td>
										<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
											<span class="lumi-font--medium">{attendanceRow.roll_code}</span>
											<span class="lumi-text--xs lumi-text--muted">
												{attendanceRow.enrollment_number}
											</span>
										</div>
									</td>
									<td>
										<div class="attendance-page__student-cell">
											<Avatar
												src={attendanceRow.student_photo_url || ''}
												text={attendanceRow.student_full_name}
												size="sm"
												color="primary"
											/>
											<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
												<span class="lumi-font--medium">{attendanceRow.student_full_name}</span>
												<span class="lumi-text--xs lumi-text--muted">
													{attendanceRow.student_number} · {attendanceRow.student_dni || 'Sin DNI'}
												</span>
											</div>
										</div>
									</td>
									<td>
										<Chip color={getEnrollmentTurnColor(attendanceRow.turn)} size="sm">
											{formatEnrollmentTurn(attendanceRow.turn)}
										</Chip>
									</td>
									<td>
										<span class="lumi-font--medium">
											{formatAttendanceTime(attendanceRow.attendance_entry_time)}
										</span>
									</td>
									<td>
										<Chip
											color={getAttendanceStateColor(attendanceRow.attendance_state ?? 'pending')}
											size="sm"
										>
											{attendanceRow.attendance_state
												? formatAttendanceState(attendanceRow.attendance_state)
												: 'Pendiente'}
										</Chip>
									</td>
									<td>
										<span class="lumi-text--sm attendance-page__observation">
											{attendanceRow.attendance_observation || 'Sin observación'}
										</span>
									</td>
									<td>
										<Dropdown
											position="bottom-end"
											aria-label={`Acciones para ${attendanceRow.student_full_name}`}
										>
											{#snippet triggerContent()}
												<Button
													type="flat"
													size="sm"
													icon="moreVertical"
													aria-label={`Abrir acciones para ${attendanceRow.student_full_name}`}
												/>
											{/snippet}

											{#snippet content()}
												{#if attendanceRow.attendance_code}
													<DropdownItem
														icon="edit"
														disabled={!canUpdate}
														onclick={() => openEditModal(attendanceRow)}
													>
														Editar asistencia
													</DropdownItem>
												{:else}
													<DropdownItem
														icon="plus"
														disabled={!canCreate}
														onclick={() => openCreateModal(attendanceRow)}
													>
														Registrar asistencia
													</DropdownItem>
												{/if}
												<DropdownItem
													icon="history"
													color="info"
													onclick={() => openStudentAttendance(attendanceRow.student_code)}
												>
													Ver historial
												</DropdownItem>
												<DropdownItem
													icon="eye"
													color="info"
													disabled={!canReadStudents}
													onclick={() => openStudentProfile(attendanceRow.student_code)}
												>
													Ver alumno
												</DropdownItem>
											{/snippet}
										</Dropdown>
									</td>
								{/snippet}
							</Table>
						{/if}
					</div>
				</Card>
			</div>
		</section>
	</div>
</div>

<Dialog
	bind:open={showFormModal}
	title={attendanceModalMode === 'edit' ? 'Editar asistencia' : 'Registrar asistencia'}
	size="lg"
	scrollable
>
	<form
		id="attendance-form"
		method="POST"
		action="?/{attendanceModalMode === 'edit' ? 'update' : 'create'}"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					await invalidate('attendance:load');
					showToast(
						attendanceModalMode === 'edit'
							? 'Asistencia actualizada exitosamente'
							: 'Asistencia registrada exitosamente',
						'success'
					);
					closeFormModal();
					return;
				}

				if (result.type === 'failure') {
					errorMessage = getActionError(result) ?? 'Ocurrió un error';
				}
			};
		}}
	>
		{#if attendanceModalMode === 'edit'}
			<input type="hidden" name="code" value={formAttendanceCode} />
		{/if}
		<input type="hidden" name="enrollment_code" value={formEnrollmentCode} />
		<input type="hidden" name="attendance_date" value={filterDate} />

		{#if errorMessage}
			<Alert type="danger" closable onclose={() => (errorMessage = '')}>
				{errorMessage}
			</Alert>
		{/if}

		<div class="lumi-stack lumi-stack--md">
			<Fieldset legend="Alumno">
				{#if attendanceModalMode === 'create'}
					<div class="lumi-stack lumi-stack--sm">
						<Input
							bind:value={manualSearchQuery}
							label="Buscar por nombre, DNI o matrícula"
							placeholder="Escribe para localizar al alumno"
							oninput={() => {
								if (
									selectedManualRow &&
									selectedManualRow.student_full_name !== manualSearchQuery
								) {
									formEnrollmentCode = '';
									selectedManualRow = null;
								}
							}}
						/>

						{#if selectedManualRow}
							<div class="attendance-page__selected-row">
								<div class="attendance-page__student-cell">
									<Avatar
										src={selectedManualRow.student_photo_url || ''}
										text={selectedManualRow.student_full_name}
										size="sm"
										color="primary"
									/>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<strong>{selectedManualRow.student_full_name}</strong>
										<span class="lumi-text--xs lumi-text--muted">
											{selectedManualRow.student_number} · {selectedManualRow.student_dni ||
												'Sin DNI'}
										</span>
									</div>
								</div>
								<Button type="flat" color="danger" icon="x" onclick={clearManualSelection}>
									Cambiar
								</Button>
							</div>
						{:else if manualSearchQuery.trim().length > 0}
							<List size="sm">
								{#each filteredMissingCandidates.slice(0, 8) as candidate (candidate.enrollment_code)}
									<ListItem
										clickable
										title={candidate.student_full_name}
										subtitle={`${candidate.student_number} · ${candidate.student_dni || 'Sin DNI'}`}
										onclick={() => selectManualRow(candidate)}
									>
										{#snippet avatar()}
											<Avatar
												src={candidate.student_photo_url || ''}
												text={candidate.student_full_name}
											/>
										{/snippet}
									</ListItem>
								{/each}
							</List>
						{/if}
					</div>
				{:else if selectedManualRow}
					<div class="attendance-page__selected-row">
						<div class="attendance-page__student-cell">
							<Avatar
								src={selectedManualRow.student_photo_url || ''}
								text={selectedManualRow.student_full_name}
								size="sm"
								color="primary"
							/>
							<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
								<strong>{selectedManualRow.student_full_name}</strong>
								<span class="lumi-text--xs lumi-text--muted">
									{selectedManualRow.student_number} · {selectedManualRow.student_dni || 'Sin DNI'}
								</span>
							</div>
						</div>
						<Chip color="info" size="sm">{selectedDateLabel}</Chip>
					</div>
				{/if}
			</Fieldset>

			<Fieldset legend="Registro">
				<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md attendance-page__form-grid">
					<Select
						bind:value={formState}
						name="state"
						label="Estado"
						options={ATTENDANCE_STATE_OPTIONS}
					/>
					<Input
						bind:value={formEntryTime}
						name="entry_time"
						type="time"
						label="Hora de ingreso"
						disabled={!needsEntryTime}
						required={needsEntryTime}
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
			onclick={() => submitForm('attendance-form')}
			disabled={!formEnrollmentCode || (needsEntryTime && !formEntryTime)}
		>
			{attendanceModalMode === 'edit' ? 'Guardar cambios' : 'Registrar'}
		</Button>
	{/snippet}
</Dialog>

<style>
	.attendance-sidebar__hero {
		display: grid;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-lg);
		border-radius: var(--lumi-radius-2xl);
		background:
			linear-gradient(
				145deg,
				color-mix(in srgb, var(--lumi-color-primary) 8%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-info) 8%, transparent) 68%,
				color-mix(in srgb, var(--lumi-color-warning) 6%, transparent) 100%
			),
			color-mix(in srgb, var(--lumi-color-surface) 92%, transparent);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		box-shadow: var(--lumi-shadow-sm);
	}

	.attendance-sidebar__title,
	.attendance-page__spotlight-title {
		margin: 0;
		color: var(--lumi-color-text);
	}

	.attendance-sidebar__title {
		font-size: var(--lumi-font-size-xl);
	}

	.attendance-sidebar__subtitle,
	.attendance-page__spotlight-subtitle {
		margin: 0;
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-text-muted);
	}

	.attendance-page__spotlight {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-lg);
		border-radius: var(--lumi-radius-2xl);
		background:
			linear-gradient(
				140deg,
				color-mix(in srgb, var(--lumi-color-primary) 6%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-warning) 8%, transparent) 100%
			),
			color-mix(in srgb, var(--lumi-color-surface) 84%, var(--lumi-color-background-hover) 16%);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
	}

	.attendance-page__spotlight-copy {
		display: grid;
		gap: var(--lumi-space-2xs);
	}

	.attendance-page__student-cell,
	.attendance-page__selected-row {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
	}

	.attendance-page__selected-row {
		justify-content: space-between;
		padding: var(--lumi-space-md);
		border-radius: var(--lumi-radius-xl);
		background:
			linear-gradient(
				135deg,
				color-mix(in srgb, var(--lumi-color-info) 6%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-primary) 8%, transparent) 100%
			),
			var(--lumi-color-surface);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
	}

	.attendance-page__observation {
		color: var(--lumi-color-text-muted);
	}

	@media (max-width: 768px) {
		.attendance-page__spotlight,
		.attendance-page__selected-row {
			flex-direction: column;
			align-items: flex-start;
		}

		.attendance-page__form-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
