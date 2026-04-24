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
		InfoItem,
		Input,
		PageHeader,
		StatCard
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { buildStudentPhotoUrl, formatEnrollmentStatus } from '$lib/utils';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const canRead = $derived(can('students:read'));
	const canCreate = $derived(can('students:create'));
	const canUpdate = $derived(can('students:update'));
	const canReadAttendance = $derived(can('attendance:read'));

	function openEditPage(studentCode: string): void {
		if (!canUpdate) return;
		void goto(resolve(`/students/${studentCode}/edit` as '/'));
	}

	function openStudentProfile(studentCode: string): void {
		void goto(resolve(`/students/${studentCode}` as '/'));
	}

	function openStudentAttendance(studentCode: string): void {
		if (!canReadAttendance) return;
		void goto(resolve(`/students/${studentCode}/attendance` as '/'));
	}
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader
		title="Alumnos"
		subtitle="Busca antes de registrar, evita duplicados y trabaja cada ficha desde su perfil"
		icon="graduationCap"
	>
		{#snippet actions()}
			<Button
				type="filled"
				color="primary"
				icon="userPlus"
				onclick={() => void goto(resolve('/students/create' as '/'))}
				disabled={!canCreate}
			>
				Registrar alumno
			</Button>
		{/snippet}
	</PageHeader>

	<div class="lumi-grid lumi-grid--columns-3 lumi-grid--gap-md">
		<StatCard
			title="Alumnos activos"
			value={String(data.summary.activeStudents)}
			icon="users"
			color="primary"
			subtitle="Padrón actual habilitado"
		/>
		<StatCard
			title="Con historial"
			value={String(data.summary.studentsWithEnrollments)}
			icon="bookCopy"
			color="info"
			subtitle="Alumnos con matrículas registradas"
		/>
		<StatCard
			title="Matrículas acumuladas"
			value={String(data.summary.totalEnrollments)}
			icon="badgeCheck"
			color="success"
			subtitle="Base histórica disponible"
		/>
	</div>

	<Card>
		<div class="lumi-stack lumi-stack--md">
			<div class="lumi-search-panel">
				<div class="lumi-search-panel__copy">
					<h2 class="lumi-search-panel__title">Panel de búsqueda previa</h2>
					<p class="lumi-search-panel__subtitle">
						Busca por nombre, DNI, teléfono o código institucional antes de crear una nueva ficha.
					</p>
				</div>

				<form method="GET" class="lumi-search-panel__form">
					<Input
						name="search"
						value={data.searchQuery}
						label="Buscar alumno"
						placeholder="Ej. María Torres, 12345678 o STU-001024"
					/>
					<div class="lumi-search-panel__buttons">
						<Button type="filled" color="primary" icon="search" button="submit">Buscar</Button>
						<Button type="border" onclick={() => void goto(resolve('/students' as '/'))}
							>Limpiar
						</Button>
					</div>
				</form>
			</div>

			{#if !canRead}
				<Alert type="warning" closable>No tienes permisos para consultar alumnos.</Alert>
			{:else if data.searchQuery.length < 2}
				<EmptyState
					title="Empieza con una búsqueda"
					description="Usa la búsqueda para ubicar una ficha o validar si ya existe."
					icon="search"
				/>
			{:else if data.students.length === 0}
				<EmptyState
					title="No encontramos coincidencias"
					description="Si confirmaste que el alumno no existe, puedes registrarlo desde el botón superior."
					icon="userSearch"
				/>
			{:else}
				<div class="lumi-flex lumi-flex--column lumi-flex--gap-md">
					<Alert type="info" closable={false}>
						Se encontraron <strong>{data.students.length}</strong> coincidencias. Usa DNI, teléfono, matrícula
						actual y estado para distinguir alumnos con nombres similares.
					</Alert>

					{#each data.students as student (student.code)}
						<Card>
							<div class="lumi-stack lumi-stack--md">
								<div class="lumi-hero-panel">
									<div class="lumi-hero-panel__identity">
										<Avatar
											src={student.photo_url
												? buildStudentPhotoUrl(student.photo_url, 'thumb')
												: ''}
											text={student.full_name}
											size="xl"
											color="primary"
										/>
										<div class="lumi-hero-panel__copy">
											<div class="lumi-hero-panel__name-row">
												<h3 class="lumi-hero-panel__name">{student.full_name}</h3>
												<Chip color={student.is_active ? 'success' : 'danger'} size="sm">
													{student.is_active ? 'Activo' : 'Inactivo'}
												</Chip>
											</div>
											<p class="lumi-hero-panel__code">{student.student_number}</p>
										</div>
									</div>

									<Dropdown position="bottom-end" aria-label={`Acciones para ${student.full_name}`}>
										{#snippet triggerContent()}
											<Button
												type="flat"
												size="sm"
												icon="moreVertical"
												aria-label={`Abrir acciones para ${student.full_name}`}
											/>
										{/snippet}

										{#snippet content()}
											<DropdownItem icon="eye" onclick={() => openStudentProfile(student.code)}>
												Ver perfil
											</DropdownItem>
											<DropdownItem
												icon="history"
												onclick={() => openStudentAttendance(student.code)}
												disabled={!canReadAttendance}
											>
												Ver asistencia
											</DropdownItem>
											<DropdownItem
												icon="edit"
												onclick={() => openEditPage(student.code)}
												disabled={!canUpdate}
											>
												Editar alumno
											</DropdownItem>
										{/snippet}
									</Dropdown>
								</div>

								<div class="lumi-grid lumi-grid--auto-fit lumi-grid--gap-md">
									<InfoItem icon="creditCard" label="DNI" value={student.dni || 'Sin DNI'} />
									<InfoItem icon="phone" label="Teléfono" value={student.phone || 'Sin teléfono'} />
									<InfoItem
										icon="badgeCheck"
										label="Matrícula actual"
										value={student.current_cycle_title || 'Sin matrícula actual'}
									/>
									<InfoItem
										icon="activity"
										label="Estado académico"
										value={student.current_enrollment_status
											? formatEnrollmentStatus(student.current_enrollment_status)
											: 'Sin matrícula actual'}
									/>
								</div>
							</div>
						</Card>
					{/each}
				</div>
			{/if}
		</div>
	</Card>
</div>
