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
		InfoItem,
		Input,
		List,
		ListItem,
		PageHeader,
		PageSidebar,
		Select,
		StatCard,
		Table,
		type TableRow,
		Textarea
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import {
		ENROLLMENT_STATUS_OPTIONS,
		GROUP_CODE_OPTIONS,
		formatAcademicDegreeLabel,
		formatEducationCurrency,
		formatEnrollmentStatus,
		formatEnrollmentTurn,
		formatGroupCode
	} from '$lib/utils';
	import type { GroupCode } from '$lib/types/education';
	import type { PageData } from './$types';

	type EnrollmentRow = PageData['enrollments'][number];

	interface StudentSearchItem {
		code: string;
		full_name: string;
		student_number: string;
		dni: string | null;
		photo_url: string | null;
		current_cycle_title: string | null;
		current_degree_name: string | null;
	}

	interface CreateEnrollmentSuccessPayload {
		enrollmentNumber?: string;
		rollCode?: string;
	}

	const { data }: { data: PageData } = $props();

	const canRead = $derived(can('enrollments:read'));
	const canCreate = $derived(can('enrollments:create'));
	const canUpdate = $derived(can('enrollments:update'));
	const canDelete = $derived(can('enrollments:delete'));
	const canReadStudents = $derived(can('students:read'));
	const enrollmentRows = $derived(data.enrollments as unknown as TableRow[]);

	let filterCycleCode = $state<string | null>(null);
	let filterCycleDegreeCode = $state<string | null>(null);
	let filterGroupCode = $state<GroupCode>('A');
	let filterSearchQuery = $state('');
	let showMobileSidebar = $state(false);
	let showModal = $state(false);
	let showDeleteModal = $state(false);
	let showGeneratedCodeModal = $state(false);
	let isEditing = $state(false);
	let errorMessage = $state('');
	let selectedEnrollment = $state<EnrollmentRow | null>(null);
	let generatedEnrollmentNumber = $state('');
	let generatedRollCode = $state('');

	let formStudentCode = $state<string | null>(null);
	let formCycleCode = $state<string | null>(null);
	let formCycleDegreeCode = $state<string | null>(null);
	let formPayCost = $state('');
	let formTurn = $state<'turn_1' | 'turn_2'>('turn_1');
	let formStatus = $state<'active' | 'finalized' | 'inactive'>('active');
	let formGroupCode = $state<GroupCode>('A');
	let formObservation = $state('');

	let studentSearchQuery = $state('');
	let studentSearchLoading = $state(false);
	let studentSearchResults = $state<StudentSearchItem[]>([]);
	let selectedStudentPreview = $state<StudentSearchItem | null>(null);

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

	const formCycleDegreeOptions = $derived(
		data.cycleDegreeOptions
			.filter((option) => option.cycle_code === formCycleCode)
			.map((option) => ({
				value: option.code,
				label: option.label
			}))
	);
	const selectedFormCycle = $derived(
		data.cycles.find((cycle) => cycle.code === formCycleCode) ?? null
	);
	const formTurnOptions = $derived(
		[
			selectedFormCycle?.turn_1_attendance_time ? { value: 'turn_1', label: 'Turno 1' } : null,
			selectedFormCycle?.turn_2_attendance_time ? { value: 'turn_2', label: 'Turno 2' } : null
		].filter(Boolean) as Array<{ value: 'turn_1' | 'turn_2'; label: string }>
	);

	const selectedCycleLabel = $derived(
		data.cycles.find((cycle) => cycle.code === filterCycleCode)?.label ?? 'Sin ciclo activo'
	);

	const selectedDegreeOption = $derived(
		data.cycleDegreeOptions.find((option) => option.code === filterCycleDegreeCode) ?? null
	);

	const selectedDegreeLabel = $derived(selectedDegreeOption?.label ?? 'Sin grado activo');
	const selectedDegreeChipLabel = $derived(
		selectedDegreeOption?.degree_name
			? formatAcademicDegreeLabel(selectedDegreeOption.degree_name)
			: 'Sin grado'
	);

	const totalEnrollments = $derived(data.enrollments.length);
	const activeEnrollments = $derived(
		data.enrollments.filter((enrollment) => enrollment.status === 'active').length
	);
	const finalizedEnrollments = $derived(
		data.enrollments.filter((enrollment) => enrollment.status === 'finalized').length
	);
	const inactiveEnrollments = $derived(
		data.enrollments.filter((enrollment) => enrollment.status === 'inactive').length
	);
	const currentCohortCaption = $derived(
		`${selectedDegreeLabel} · ${formatGroupCode(filterGroupCode)}`
	);

	function getActionError(result: { data?: Record<string, unknown> }): string | null {
		const error = result.data?.error;
		return typeof error === 'string' && error.length > 0 ? error : null;
	}

	function getCreateSuccessPayload(
		result: { data?: Record<string, unknown> } | undefined
	): CreateEnrollmentSuccessPayload {
		return {
			enrollmentNumber:
				typeof result?.data?.enrollmentNumber === 'string' ? result.data.enrollmentNumber : '',
			rollCode: typeof result?.data?.rollCode === 'string' ? result.data.rollCode : ''
		};
	}

	function submitForm(formId: string): void {
		const form = document.getElementById(formId);
		if (form instanceof HTMLFormElement) {
			form.requestSubmit();
		}
	}

	function resetForm(): void {
		formStudentCode = null;
		formCycleCode = data.selectedCycleCode;
		formCycleDegreeCode = data.selectedCycleDegreeCode;
		formPayCost = '';
		formTurn = 'turn_1';
		formStatus = 'active';
		formGroupCode = data.selectedGroupCode as GroupCode;
		formObservation = '';
		studentSearchQuery = '';
		studentSearchResults = [];
		selectedStudentPreview = null;
		errorMessage = '';
	}

	function handleFilterCycleChange(value: string | number | object | null): void {
		filterCycleCode = value ? String(value) : null;
		const nextOptions = data.cycleDegreeOptions.filter(
			(option) => option.cycle_code === filterCycleCode
		);
		filterCycleDegreeCode = nextOptions[0]?.code ?? null;
	}

	function handleFormCycleChange(value: string | number | object | null): void {
		formCycleCode = value ? String(value) : null;
		const nextOptions = data.cycleDegreeOptions.filter(
			(option) => option.cycle_code === formCycleCode
		);
		formCycleDegreeCode = nextOptions[0]?.code ?? null;
		const activeOption = data.cycleDegreeOptions.find(
			(option) => option.code === formCycleDegreeCode
		);
		formPayCost = activeOption ? String(activeOption.base_cost ?? '0') : '';
	}

	function handleCycleDegreeChange(value: string | number | object | null): void {
		formCycleDegreeCode = value ? String(value) : null;
		const option = data.cycleDegreeOptions.find((item) => item.code === formCycleDegreeCode);
		formPayCost = option ? String(option.base_cost ?? '0') : '';
	}

	function openCreateModal(): void {
		if (!canCreate) return;
		isEditing = false;
		selectedEnrollment = null;
		resetForm();
		showModal = true;
	}

	function openEditModal(enrollment: EnrollmentRow): void {
		if (!canUpdate) return;
		isEditing = true;
		selectedEnrollment = enrollment;
		formStudentCode = enrollment.student_code;
		formCycleCode = enrollment.cycle_code;
		formCycleDegreeCode = enrollment.cycle_degree_code;
		formPayCost = String(enrollment.pay_cost ?? '0');
		formTurn = enrollment.turn;
		formStatus = enrollment.status;
		formGroupCode = enrollment.group_code;
		formObservation = enrollment.observation ?? '';
		studentSearchQuery = enrollment.student_full_name;
		studentSearchResults = [];
		selectedStudentPreview = {
			code: enrollment.student_code,
			full_name: enrollment.student_full_name,
			student_number: enrollment.student_number,
			dni: enrollment.student_dni,
			photo_url: null,
			current_cycle_title: enrollment.cycle_title,
			current_degree_name: enrollment.degree_name
		};
		errorMessage = '';
		showModal = true;
	}

	function openDeleteModal(enrollment: EnrollmentRow): void {
		if (!canDelete) return;
		selectedEnrollment = enrollment;
		showDeleteModal = true;
	}

	function closeModal(): void {
		showModal = false;
		errorMessage = '';
	}

	function closeDeleteModal(): void {
		showDeleteModal = false;
		selectedEnrollment = null;
	}

	function buildFilterUrl(): string {
		const entries = [
			filterCycleCode ? `cycle=${encodeURIComponent(filterCycleCode)}` : '',
			filterCycleDegreeCode ? `degree=${encodeURIComponent(filterCycleDegreeCode)}` : '',
			filterGroupCode ? `group=${encodeURIComponent(filterGroupCode)}` : '',
			filterSearchQuery.trim() ? `search=${encodeURIComponent(filterSearchQuery.trim())}` : ''
		].filter(Boolean);

		return `/enrollments${entries.length > 0 ? `?${entries.join('&')}` : ''}`;
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
		void goto(resolve('/enrollments' as '/'));
	}

	function selectStudent(student: StudentSearchItem): void {
		formStudentCode = student.code;
		selectedStudentPreview = student;
		studentSearchQuery = student.full_name;
		studentSearchResults = [];
	}

	function openStudentProfile(studentCode: string): void {
		if (!canReadStudents) return;
		void goto(resolve(`/students/${studentCode}` as '/'));
	}

	$effect(() => {
		if (!showModal) {
			filterCycleCode = data.selectedCycleCode;
			filterCycleDegreeCode = data.selectedCycleDegreeCode;
			filterGroupCode = data.selectedGroupCode as GroupCode;
			filterSearchQuery = data.searchQuery;
		}

		if (!showModal && !isEditing) {
			formCycleCode = data.selectedCycleCode;
			formCycleDegreeCode = data.selectedCycleDegreeCode;
			formGroupCode = data.selectedGroupCode as GroupCode;
		}
	});

	$effect(() => {
		const availableTurns = formTurnOptions.map((option) => option.value);
		if (!availableTurns.includes(formTurn) && availableTurns[0]) {
			formTurn = availableTurns[0];
		}
	});

	$effect(() => {
		if (!showModal || studentSearchQuery.trim().length < 2) {
			studentSearchLoading = false;
			if (!showModal || studentSearchQuery.trim().length === 0) {
				studentSearchResults = [];
			}
			return;
		}

		const controller = new AbortController();
		const timer = window.setTimeout(async () => {
			studentSearchLoading = true;

			try {
				const response = await fetch(
					`/api/students/search?q=${encodeURIComponent(studentSearchQuery)}`,
					{
						signal: controller.signal
					}
				);
				const payload = (await response.json()) as {
					message?: string;
					items?: StudentSearchItem[];
				};

				if (!response.ok) {
					throw new Error(payload.message || 'No se pudo buscar alumnos');
				}

				studentSearchResults = payload.items ?? [];
			} catch (caught) {
				if (!controller.signal.aborted) {
					errorMessage = caught instanceof Error ? caught.message : 'No se pudo buscar alumnos';
				}
			} finally {
				if (!controller.signal.aborted) {
					studentSearchLoading = false;
				}
			}
		}, 280);

		return () => {
			controller.abort();
			window.clearTimeout(timer);
		};
	});

	function statusColor(status: EnrollmentRow['status']): 'success' | 'warning' | 'info' {
		if (status === 'active') return 'success';
		if (status === 'finalized') return 'info';
		return 'warning';
	}
</script>

<div class="lumi-stack lumi-stack--md">
	<PageHeader
		title="Matrículas"
		subtitle="Vista operativa por ciclo, grado y grupo, con filtros persistentes y registro rápido"
		icon="clipboardPenLine"
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
					aria-label="Abrir filtros de matrículas"
				/>
				<Button
					type="filled"
					color="primary"
					icon="plus"
					onclick={openCreateModal}
					disabled={!canCreate}
				>
					Nueva matrícula
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<div class="lumi-layout--two-columns lumi-page-sidebar-layout enrollments-page__layout">
		<PageSidebar
			bind:mobileOpen={showMobileSidebar}
			variant="enrollments"
			mobileTitle="Ciclo y filtros"
			mobileAriaLabel="Cerrar filtros de matrículas"
		>
			{#snippet sidebar()}
				<div class="lumi-page-sidebar__section">
					<div class="enrollments-sidebar__hero">
						<p class="lumi-page-sidebar__label">Vista actual</p>
						<h2 class="enrollments-sidebar__title">{selectedCycleLabel}</h2>
						<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
							<Chip color="secondary" size="sm">{selectedDegreeChipLabel}</Chip>
							<Chip color="info" size="sm">{formatGroupCode(filterGroupCode)}</Chip>
							{#if filterSearchQuery.trim()}
								<Chip color="primary" size="sm" icon="search">{filterSearchQuery.trim()}</Chip>
							{/if}
						</div>
					</div>
				</div>

				<div class="lumi-page-sidebar__section">
					<p class="lumi-page-sidebar__label">Seleccionar ciclo</p>
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
				</div>

				<div class="lumi-page-sidebar__section">
					<p class="lumi-page-sidebar__label">Buscar dentro del grupo</p>
					<Input
						bind:value={filterSearchQuery}
						label="Alumno, DNI o matrícula"
						placeholder="Escribe para filtrar matrículas"
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
				<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-md enrollments-page__stats-grid">
					<StatCard
						title="Total"
						value={String(totalEnrollments)}
						icon="bookCopy"
						color="primary"
						subtitle="Registros cargados en la vista actual"
					/>
					<StatCard
						title="Activas"
						value={String(activeEnrollments)}
						icon="badgeCheck"
						color="success"
						subtitle="Alumnos actualmente en curso"
					/>
					<StatCard
						title="Finalizadas"
						value={String(finalizedEnrollments)}
						icon="flag"
						color="info"
						subtitle="Cierres ya consolidados"
					/>
					<StatCard
						title="Inactivas"
						value={String(inactiveEnrollments)}
						icon="pauseCircle"
						color="warning"
						subtitle="Casos en espera o suspendidos"
					/>
				</div>

				<Card spaced>
					<div class="lumi-stack lumi-stack--md">
						<div class="enrollments-page__spotlight">
							<div class="enrollments-page__spotlight-copy">
								<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Panel operativo</p>
								<h2 class="enrollments-page__spotlight-title">{selectedCycleLabel}</h2>
								<p class="enrollments-page__spotlight-subtitle">
									{currentCohortCaption}
									{#if filterSearchQuery.trim()}
										· Búsqueda activa: "{filterSearchQuery.trim()}"
									{/if}
								</p>
							</div>

							<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
								<Chip color="secondary" size="sm">{selectedDegreeChipLabel}</Chip>
								<Chip color="info" size="sm">{formatGroupCode(filterGroupCode)}</Chip>
								{#if filterSearchQuery.trim()}
									<Chip color="primary" size="sm" icon="search">{filterSearchQuery.trim()}</Chip>
								{/if}
							</div>
						</div>

						{#if !canRead}
							<Alert type="warning" closable>No tienes permisos para consultar matrículas.</Alert>
						{:else if !data.selectedCycleCode || !data.selectedCycleDegreeCode}
							<EmptyState
								title="Configura ciclo, grado y grupo"
								description="Selecciona un ciclo y un grado para empezar a trabajar los registros."
								icon="slidersHorizontal"
							/>
						{:else if data.enrollments.length === 0}
							<EmptyState
								title="No hay matrículas para esta vista"
								description="Cuando registres alumnos en este grupo, aparecerán aquí con su código de lista generado automáticamente."
								icon="bookOpenCheck"
							/>
						{:else}
							<Table data={enrollmentRows} pagination hover itemsPerPage={25}>
								{#snippet thead()}
									<th>Lista</th>
									<th class="lumi-min-w--xl">Alumno</th>
									<th>Asignación</th>
									<th>Turno</th>
									<th>Costo</th>
									<th>Estado</th>
									<th>Acciones</th>
								{/snippet}

								{#snippet row({ row })}
									{@const enrollment = row as unknown as EnrollmentRow}
									<td>
										<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
											<span class="lumi-font--medium">{enrollment.roll_code}</span>
											<span class="lumi-text--xs lumi-text--muted">
												{enrollment.enrollment_number}
											</span>
										</div>
									</td>
									<td class="lumi-min-w--xl">
										<div class="enrollment-student-cell">
											<Avatar text={enrollment.student_full_name} size="sm" color="primary" />
											<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
												<span class="lumi-font--medium">{enrollment.student_full_name}</span>
												<span class="lumi-text--xs lumi-text--muted">
													{enrollment.student_number} · {enrollment.student_dni || 'Sin DNI'}
												</span>
											</div>
										</div>
									</td>
									<td>
										<div class="enrollment-assignment-cell">
											<span class="lumi-text--sm lumi-font--medium">{enrollment.cycle_title}</span>
											<div class="enrollment-assignment-cell__chips">
												<Chip color="secondary" size="sm">
													{formatAcademicDegreeLabel(enrollment.degree_name)}
												</Chip>
												<Chip color="info" size="sm">
													{formatGroupCode(enrollment.group_code)}
												</Chip>
											</div>
										</div>
									</td>
									<td>
										<Chip color="secondary" size="sm">
											{formatEnrollmentTurn(enrollment.turn)}
										</Chip>
									</td>
									<td>
										<span class="lumi-font--medium">
											{formatEducationCurrency(enrollment.pay_cost)}
										</span>
									</td>
									<td>
										<Chip color={statusColor(enrollment.status)} size="sm">
											{formatEnrollmentStatus(enrollment.status)}
										</Chip>
									</td>
									<td>
										<Dropdown
											position="bottom-end"
											aria-label={`Acciones para ${enrollment.student_full_name}`}
										>
											{#snippet triggerContent()}
												<Button
													type="flat"
													size="sm"
													icon="moreVertical"
													aria-label={`Abrir acciones para ${enrollment.student_full_name}`}
												/>
											{/snippet}

											{#snippet content()}
												<DropdownItem
													icon="eye"
													color="info"
													onclick={() => openStudentProfile(enrollment.student_code)}
													disabled={!canReadStudents}
												>
													Ver perfil
												</DropdownItem>
												<DropdownItem
													icon="edit"
													onclick={() => openEditModal(enrollment)}
													disabled={!canUpdate}
												>
													Editar matrícula
												</DropdownItem>
												<DropdownItem
													icon="trash"
													color="danger"
													onclick={() => openDeleteModal(enrollment)}
													disabled={!canDelete}
												>
													Eliminar matrícula
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
	bind:open={showModal}
	title={isEditing ? 'Editar matrícula' : 'Registrar matrícula'}
	size="lg"
	scrollable
>
	<form
		id="enrollment-form"
		method="POST"
		action="?/{isEditing ? 'update' : 'create'}"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					await invalidate('enrollments:load');
					if (isEditing) {
						showToast('Matrícula actualizada exitosamente', 'success');
						closeModal();
						return;
					}

					const payload = getCreateSuccessPayload(result);
					generatedEnrollmentNumber = payload.enrollmentNumber ?? '';
					generatedRollCode = payload.rollCode ?? '';
					showToast('Matrícula registrada exitosamente', 'success');
					closeModal();
					showGeneratedCodeModal = true;
					return;
				}

				if (result.type === 'failure') {
					errorMessage = getActionError(result) ?? 'Ocurrió un error';
				}
			};
		}}
	>
		{#if isEditing && selectedEnrollment}
			<input type="hidden" name="code" value={selectedEnrollment.code} />
		{/if}

		<input type="hidden" name="student_code" value={formStudentCode ?? ''} />

		{#if errorMessage}
			<Alert type="danger" closable onclose={() => (errorMessage = '')}>
				{errorMessage}
			</Alert>
		{/if}

		<div class="lumi-stack lumi-stack--md">
			<Fieldset legend="Alumno">
				<div class="lumi-stack lumi-stack--sm">
					<Input
						bind:value={studentSearchQuery}
						label="Buscar alumno"
						placeholder="Escribe nombre, DNI o código"
						oninput={() => {
							if (!formStudentCode || selectedStudentPreview?.full_name !== studentSearchQuery) {
								formStudentCode = null;
							}
						}}
					/>

					{#if selectedStudentPreview}
						<div class="enrollment-student-preview">
							<div class="enrollment-student-preview__identity">
								<Avatar
									src={selectedStudentPreview.photo_url || ''}
									text={selectedStudentPreview.full_name}
									size="lg"
									color="primary"
								/>
								<div class="lumi-stack lumi-stack--2xs">
									<strong>{selectedStudentPreview.full_name}</strong>
									<span class="lumi-text--xs lumi-text--muted">
										{selectedStudentPreview.student_number} ·
										{selectedStudentPreview.dni || 'Sin DNI'}
									</span>
								</div>
							</div>
							<Button
								type="flat"
								color="danger"
								icon="x"
								onclick={() => {
									formStudentCode = null;
									selectedStudentPreview = null;
									studentSearchQuery = '';
								}}
							>
								Cambiar
							</Button>
						</div>
					{/if}

					{#if studentSearchLoading}
						<p class="lumi-text--sm lumi-text--muted">Buscando alumnos…</p>
					{:else if studentSearchQuery.trim().length >= 2 && studentSearchResults.length > 0}
						<List size="sm">
							{#each studentSearchResults as student (student.code)}
								<ListItem
									clickable
									title={student.full_name}
									subtitle={`${student.student_number} · ${student.dni || 'Sin DNI'}`}
									onclick={() => selectStudent(student)}
								>
									{#snippet avatar()}
										<Avatar src={student.photo_url || ''} text={student.full_name} />
									{/snippet}
								</ListItem>
							{/each}
						</List>
					{:else if studentSearchQuery.trim().length >= 2 && !selectedStudentPreview}
						<p class="lumi-text--sm lumi-text--muted">
							No hay coincidencias. Revisa primero el panel de alumnos si necesitas registrar una
							ficha nueva.
						</p>
					{/if}
				</div>
			</Fieldset>

			<Fieldset legend="Asignación académica">
				<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md enrollment-form-grid">
					<Select
						bind:value={formCycleCode}
						label="Ciclo"
						options={cycleOptions}
						placeholder="Seleccione un ciclo"
						onchange={handleFormCycleChange}
					/>
					<Select
						bind:value={formCycleDegreeCode}
						name="cycle_degree_code"
						label="Grado"
						options={formCycleDegreeOptions}
						placeholder="Seleccione un grado"
						disabled={!formCycleCode}
						onchange={handleCycleDegreeChange}
					/>
					<Select
						bind:value={formTurn}
						name="turn"
						label="Turno"
						options={formTurnOptions}
						clearable={false}
					/>
					<Select
						bind:value={formGroupCode}
						name="group_code"
						label="Grupo"
						options={GROUP_CODE_OPTIONS}
					/>
					<Select
						bind:value={formStatus}
						name="status"
						label="Estado"
						options={ENROLLMENT_STATUS_OPTIONS}
					/>
					<Input
						bind:value={formPayCost}
						name="pay_cost"
						type="number"
						label="Costo a pagar"
						placeholder="0.00"
						required
					/>
				</div>
			</Fieldset>

			{#if !isEditing}
				<Alert type="info" closable={false}>
					El código de lista se generará automáticamente con secuencia de 4 dígitos para el año.
				</Alert>
			{/if}

			<Textarea
				bind:value={formObservation}
				name="observation"
				label="Observaciones"
				placeholder="Notas administrativas, acuerdos o excepciones"
				rows={4}
			/>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeModal}>Cancelar</Button>
		<Button
			type="filled"
			color="primary"
			onclick={() => submitForm('enrollment-form')}
			disabled={!formStudentCode}
		>
			{isEditing ? 'Actualizar' : 'Registrar'}
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showDeleteModal} title="Eliminar matrícula" size="sm">
	<form
		id="delete-enrollment-form"
		method="POST"
		action="?/delete"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Matrícula eliminada exitosamente', 'success');
					await invalidate('enrollments:load');
					closeDeleteModal();
				} else if (result.type === 'failure') {
					showToast(getActionError(result) ?? 'No se pudo eliminar la matrícula', 'error');
				}
			};
		}}
	>
		{#if selectedEnrollment}
			<input type="hidden" name="code" value={selectedEnrollment.code} />
			<p class="lumi-text--sm">
				¿Deseas eliminar la matrícula <strong>{selectedEnrollment.enrollment_number}</strong> de
				<strong>{selectedEnrollment.student_full_name}</strong>?
			</p>
		{/if}
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeDeleteModal}>Cancelar</Button>
		<Button type="filled" color="danger" onclick={() => submitForm('delete-enrollment-form')}>
			Eliminar
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showGeneratedCodeModal} title="Matrícula registrada" size="sm">
	<div class="lumi-stack lumi-stack--md">
		<Alert type="success" closable={false}>
			La matrícula fue creada y el código de lista quedó asignado automáticamente.
		</Alert>
		<InfoItem icon="badgeCheck" label="Matrícula" value={generatedEnrollmentNumber} />
		<InfoItem icon="hash" label="Lista" value={generatedRollCode} />
	</div>

	{#snippet footer()}
		<Button type="filled" color="primary" onclick={() => (showGeneratedCodeModal = false)}>
			Cerrar
		</Button>
	{/snippet}
</Dialog>

<style>
	.enrollments-sidebar__hero {
		display: grid;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-lg);
		border-radius: var(--lumi-radius-2xl);
		background:
			linear-gradient(
				145deg,
				color-mix(in srgb, var(--lumi-color-primary) 8%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-secondary) 8%, transparent) 68%,
				color-mix(in srgb, var(--lumi-color-info) 6%, transparent) 100%
			),
			color-mix(in srgb, var(--lumi-color-surface) 92%, transparent);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		box-shadow: var(--lumi-shadow-sm);
	}

	.enrollments-sidebar__title,
	.enrollments-page__spotlight-title {
		margin: 0;
		color: var(--lumi-color-text);
	}

	.enrollments-sidebar__title {
		font-size: var(--lumi-font-size-xl);
	}

	.enrollments-page__spotlight-subtitle {
		margin: 0;
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-text-muted);
	}

	.enrollments-page__stats-grid {
		--lumi-grid-columns: repeat(4, minmax(0, 1fr));
	}

	.enrollments-page__spotlight,
	.enrollment-student-preview,
	.enrollment-student-preview__identity {
		display: flex;
	}

	.enrollments-page__spotlight {
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-lg);
		border-radius: var(--lumi-radius-2xl);
		background:
			linear-gradient(
				140deg,
				color-mix(in srgb, var(--lumi-color-primary) 6%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-info) 8%, transparent) 100%
			),
			color-mix(in srgb, var(--lumi-color-surface) 82%, var(--lumi-color-background-hover) 18%);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
	}

	.enrollments-page__spotlight-copy {
		display: grid;
		gap: var(--lumi-space-2xs);
	}

	.enrollment-student-preview {
		justify-content: space-between;
		align-items: center;
		gap: var(--lumi-space-md);
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

	.enrollment-student-preview__identity,
	.enrollment-student-cell,
	.enrollment-assignment-cell,
	.enrollment-assignment-cell__chips {
		display: flex;
	}

	.enrollment-student-preview__identity,
	.enrollment-student-cell {
		align-items: center;
		gap: var(--lumi-space-md);
	}

	.enrollment-assignment-cell,
	.enrollment-assignment-cell__chips {
		flex-wrap: wrap;
		gap: var(--lumi-space-xs);
	}

	.enrollment-assignment-cell {
		flex-direction: column;
		align-items: flex-start;
	}

	@media (max-width: 1100px) {
		.enrollments-page__stats-grid {
			--lumi-grid-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 768px) {
		.enrollments-page__stats-grid {
			--lumi-grid-columns: 1fr;
		}

		.enrollments-page__spotlight,
		.enrollment-student-preview {
			flex-direction: column;
			align-items: flex-start;
		}

		.enrollment-form-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
