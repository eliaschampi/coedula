<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import {
		Alert,
		Avatar,
		Button,
		Card,
		Chip,
		Dropdown,
		DropdownItem,
		EmptyState,
		Input,
		PageHeader,
		PageSidebar,
		Select,
		StatCard,
		Table,
		StudentSearchModal,
		type TableRow
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import {
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

	const { data }: { data: PageData } = $props();

	const canRead = $derived(can('enrollments:read'));
	const canCreate = $derived(can('enrollments:create'));
	const canUpdate = $derived(can('enrollments:update'));
	const canReadStudents = $derived(can('students:read'));
	const canCreateStudent = $derived(can('students:create'));
	const canUpdateStudent = $derived(can('students:update'));
	const canReadAttendance = $derived(can('attendance:read'));

	const enrollmentRows = $derived(data.enrollments as unknown as TableRow[]);

	let filterCycleCode = $state<string | null>(null);
	let filterCycleDegreeCode = $state<string | null>(null);
	let filterGroupCode = $state<GroupCode>('A');
	let filterSearchQuery = $state('');
	let showMobileSidebar = $state(false);
	let studentSearchOpen = $state(false);

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

	const selectedDegreeOption = $derived(
		data.cycleDegreeOptions.find((option) => option.code === filterCycleDegreeCode) ?? null
	);

	const selectedDegreeChipLabel = $derived(
		selectedDegreeOption?.degree_name
			? formatAcademicDegreeLabel(selectedDegreeOption.degree_name)
			: 'Sin grado'
	);

	const totalEnrollments = $derived(data.enrollments.length);
	const activeEnrollments = $derived(data.enrollments.filter((e) => e.status === 'active').length);
	const finalizedEnrollments = $derived(
		data.enrollments.filter((e) => e.status === 'finalized').length
	);
	const inactiveEnrollments = $derived(
		data.enrollments.filter((e) => e.status === 'inactive').length
	);

	const enrollmentDefaultsQuery = $derived(() => {
		const parts: string[] = [];
		if (data.selectedCycleCode) parts.push(`cycle=${encodeURIComponent(data.selectedCycleCode)}`);
		if (data.selectedCycleDegreeCode) {
			parts.push(`degree=${encodeURIComponent(data.selectedCycleDegreeCode)}`);
		}
		if (data.selectedGroupCode) parts.push(`group=${encodeURIComponent(data.selectedGroupCode)}`);
		return parts.join('&');
	});

	function handleFilterCycleChange(value: string | number | object | null): void {
		filterCycleCode = value ? String(value) : null;
		const next = data.cycleDegreeOptions.filter((o) => o.cycle_code === filterCycleCode);
		filterCycleDegreeCode = next[0]?.code ?? null;
	}

	function buildListUrl(): string {
		const entries = [
			filterCycleCode ? `cycle=${encodeURIComponent(filterCycleCode)}` : '',
			filterCycleDegreeCode ? `degree=${encodeURIComponent(filterCycleDegreeCode)}` : '',
			filterGroupCode ? `group=${encodeURIComponent(filterGroupCode)}` : '',
			filterSearchQuery.trim() ? `search=${encodeURIComponent(filterSearchQuery.trim())}` : ''
		].filter(Boolean);
		return `/students${entries.length > 0 ? `?${entries.join('&')}` : ''}`;
	}

	function applyFilters(): void {
		void goto(resolve(buildListUrl() as '/'));
	}

	function applyFiltersAndCloseSidebar(): void {
		showMobileSidebar = false;
		applyFilters();
	}

	function clearFilters(): void {
		showMobileSidebar = false;
		void goto(resolve('/students' as '/'));
	}

	function newEnrollmentHref(studentCode: string): string {
		const q = enrollmentDefaultsQuery();
		const base = `/students/enrollments/new?student=${encodeURIComponent(studentCode)}`;
		return q ? `${base}&${q}` : base;
	}

	function openStudentProfile(studentCode: string): void {
		if (!canReadStudents) return;
		void goto(resolve(`/students/${studentCode}` as '/'));
	}

	function openStudentEdit(studentCode: string): void {
		if (!canUpdateStudent) return;
		void goto(resolve(`/students/${studentCode}/edit` as '/'));
	}

	function openAttendance(studentCode: string): void {
		if (!canReadAttendance) return;
		void goto(resolve(`/students/${studentCode}/attendance` as '/'));
	}

	$effect(() => {
		filterCycleCode = data.selectedCycleCode;
		filterCycleDegreeCode = data.selectedCycleDegreeCode;
		filterGroupCode = data.selectedGroupCode as GroupCode;
		filterSearchQuery = data.searchQuery;
	});

	function statusColor(status: EnrollmentRow['status']): 'success' | 'warning' | 'info' {
		if (status === 'active') return 'success';
		if (status === 'finalized') return 'info';
		return 'warning';
	}
</script>

<StudentSearchModal
	bind:open={studentSearchOpen}
	enrollmentDefaultsQuery={enrollmentDefaultsQuery()}
/>

<div class="lumi-stack lumi-stack--md">
	<PageHeader
		title="Alumnos"
		subtitle="Directorio, búsqueda y matrículas por ciclo. Las altas y ediciones de matrícula se abren en página dedicada."
		icon="userRound"
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
					aria-label="Abrir filtros"
				/>
				<Button
					type="border"
					icon="search"
					disabled={!canReadStudents}
					onclick={() => (studentSearchOpen = true)}
				>
					Buscar alumno
				</Button>
				<Button
					type="border"
					icon="userPlus"
					disabled={!canCreateStudent}
					onclick={() => void goto(resolve('/students/create' as '/'))}
				>
					Nuevo alumno
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<div class="lumi-layout--two-columns lumi-page-sidebar-layout enrollments-page__layout">
		<PageSidebar
			bind:mobileOpen={showMobileSidebar}
			variant="enrollments"
			mobileTitle="Ciclo y filtros"
			mobileAriaLabel="Cerrar filtros"
		>
			{#snippet sidebar()}
				<div class="lumi-page-sidebar__section">
					<div
						class="lumi-filter-summary lumi-filter-summary--compact lumi-filter-summary--secondary"
					>
						<p class="lumi-filter-summary__eyebrow">Vista de listado</p>
						<h2 class="lumi-filter-summary__title">{selectedCycleLabel}</h2>
						<p class="lumi-filter-summary__subtitle">
							Filtra matrículas por ciclo, grado, grupo y texto.
						</p>
					</div>
				</div>

				<div class="lumi-page-sidebar__section">
					<p class="lumi-page-sidebar__label">Ciclo y grado</p>
					<Select
						bind:value={filterCycleCode}
						label="Ciclo"
						options={cycleOptions}
						placeholder="Seleccione un ciclo"
						disabled={!canRead}
						onchange={handleFilterCycleChange}
					/>
					<Select
						bind:value={filterCycleDegreeCode}
						label="Grado"
						options={filteredCycleDegreeOptions}
						placeholder="Seleccione un grado"
						disabled={!filterCycleCode || !canRead}
					/>
					<Select bind:value={filterGroupCode} label="Grupo" options={GROUP_CODE_OPTIONS} />
				</div>

				<div class="lumi-page-sidebar__section">
					<Input
						bind:value={filterSearchQuery}
						label="Filtrar en el grupo"
						placeholder="Alumno, DNI o matrícula"
					/>
				</div>

				<div class="lumi-page-sidebar__section lumi-stack lumi-stack--xs">
					<Button
						type="gradient"
						color="primary"
						icon="search"
						onclick={applyFiltersAndCloseSidebar}
					>
						Aplicar filtros
					</Button>
					<Button type="border" onclick={clearFilters}>Limpiar</Button>
				</div>
			{/snippet}
		</PageSidebar>

		<section class="lumi-layout--content-right">
			<div class="lumi-stack lumi-stack--sm">
				<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-md">
					<StatCard
						title="Total"
						value={String(totalEnrollments)}
						icon="bookCopy"
						color="primary"
						subtitle="En la vista actual"
					/>
					<StatCard
						title="Activas"
						value={String(activeEnrollments)}
						icon="badgeCheck"
						color="success"
					/>
					<StatCard
						title="Finalizadas"
						value={String(finalizedEnrollments)}
						icon="graduationCap"
						color="info"
					/>
					<StatCard
						title="Inactivas"
						value={String(inactiveEnrollments)}
						icon="x"
						color="warning"
					/>
				</div>

				<Card spaced>
					<div class="lumi-stack lumi-stack--md">
						<div class="lumi-filter-summary lumi-filter-summary--secondary">
							<div class="lumi-filter-summary__copy">
								<p class="lumi-filter-summary__eyebrow">Matrículas</p>
								<h2 class="lumi-filter-summary__title">{selectedCycleLabel}</h2>
								<p class="lumi-filter-summary__subtitle">
									Abrí el menú de acciones de cada fila o buscá un alumno para crear una matrícula.
								</p>
							</div>
							<div class="lumi-filter-summary__meta">
								<Chip color="secondary" size="sm">{selectedDegreeChipLabel}</Chip>
								<Chip color="info" size="sm">{formatGroupCode(filterGroupCode)}</Chip>
								{#if filterSearchQuery.trim()}
									<Chip color="primary" size="sm" icon="search">{filterSearchQuery.trim()}</Chip>
								{/if}
							</div>
						</div>

						{#if !canRead}
							<Alert type="warning" closable>No tenés permisos para consultar matrículas.</Alert>
						{:else if !data.selectedCycleCode || !data.selectedCycleDegreeCode}
							<EmptyState
								title="Configura ciclo y grado"
								description="Usa el panel izquierdo para cargar el listado."
								icon="slidersHorizontal"
							/>
						{:else if data.enrollments.length === 0}
							<EmptyState
								title="Sin matrículas"
								description="Usá «Buscar alumno» para elegir un alumno y agregar su matrícula, o ajustá los filtros."
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
										<div class="lumi-person-cell">
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
										<div class="lumi-flex lumi-flex--column lumi-flex--gap-xs">
											<span class="lumi-text--sm lumi-font--medium">{enrollment.cycle_title}</span>
											<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
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
													disabled={!canReadStudents}
													onclick={() => openStudentProfile(enrollment.student_code)}
												>
													Ver perfil
												</DropdownItem>
												<DropdownItem
													icon="edit"
													disabled={!canUpdateStudent}
													onclick={() => openStudentEdit(enrollment.student_code)}
												>
													Editar alumno
												</DropdownItem>
												<DropdownItem
													icon="clipboardPenLine"
													disabled={!canUpdate}
													onclick={() =>
														void goto(
															resolve(`/students/enrollments/${enrollment.code}/edit` as '/')
														)}
												>
													Editar matrícula
												</DropdownItem>
												<DropdownItem
													icon="plus"
													disabled={!canCreate}
													onclick={() =>
														void goto(resolve(newEnrollmentHref(enrollment.student_code) as '/'))}
												>
													Nueva matrícula
												</DropdownItem>
												<DropdownItem
													icon="clipboard"
													disabled={!canReadAttendance}
													onclick={() => openAttendance(enrollment.student_code)}
												>
													Asistencia
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
