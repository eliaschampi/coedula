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
		InfoItem,
		Input,
		PageHeader,
		StatCard
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import { buildStudentPhotoUrl, formatEnrollmentStatus } from '$lib/utils';
	import type { PageData } from './$types';

	type StudentRow = PageData['students'][number];

	const { data }: { data: PageData } = $props();

	const canRead = $derived(can('students:read'));
	const canCreate = $derived(can('students:create'));
	const canUpdate = $derived(can('students:update'));
	const canDelete = $derived(can('students:delete'));
	const canReadAttendance = $derived(can('attendance:read'));

	let showDeleteModal = $state(false);
	let selectedStudent = $state<StudentRow | null>(null);

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

	function openEditPage(studentCode: string): void {
		if (!canUpdate) return;
		void goto(resolve(`/students/${studentCode}/edit` as '/'));
	}

	function openDeleteModal(student: StudentRow): void {
		if (!canDelete) return;
		selectedStudent = student;
		showDeleteModal = true;
	}

	function closeDeleteModal(): void {
		showDeleteModal = false;
		selectedStudent = null;
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

	<div class="lumi-grid lumi-grid--columns-3 lumi-grid--gap-md student-summary-grid">
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
			<div class="student-search-panel">
				<div class="student-search-panel__copy">
					<h2 class="student-search-panel__title">Panel de búsqueda previa</h2>
					<p class="student-search-panel__subtitle">
						Busca por nombre, DNI, teléfono o código institucional antes de crear una nueva ficha.
					</p>
				</div>

				<form method="GET" class="student-search-panel__form">
					<Input
						name="search"
						value={data.searchQuery}
						label="Buscar alumno"
						placeholder="Ej. María Torres, 12345678 o STU-001024"
					/>
					<div class="student-search-panel__buttons">
						<Button type="filled" color="primary" icon="search" button="submit">Buscar</Button>
						<Button type="border" onclick={() => void goto(resolve('/students' as '/'))}
							>Limpiar</Button
						>
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
								<div class="student-card__header">
									<div class="student-card__identity">
										<Avatar
											src={student.photo_url
												? buildStudentPhotoUrl(student.photo_url, 'thumb')
												: ''}
											text={student.full_name}
											size="xl"
											color="primary"
										/>
										<div>
											<div class="student-card__name-row">
												<h3 class="student-card__name">{student.full_name}</h3>
												<Chip color={student.is_active ? 'success' : 'danger'} size="sm">
													{student.is_active ? 'Activo' : 'Inactivo'}
												</Chip>
											</div>
											<p class="student-card__code">{student.student_number}</p>
										</div>
									</div>

									<div class="student-card__actions">
										<Dropdown
											position="bottom-end"
											aria-label={`Acciones para ${student.full_name}`}
										>
											{#snippet triggerContent()}
												<Button
													type="flat"
													size="sm"
													icon="moreVertical"
													aria-label={`Abrir acciones para ${student.full_name}`}
												/>
											{/snippet}

											{#snippet content()}
												<DropdownItem
													icon="eye"
													color="info"
													onclick={() => openStudentProfile(student.code)}
												>
													Ver perfil
												</DropdownItem>
												<DropdownItem
													icon="history"
													color="info"
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
												<DropdownItem
													icon="trash"
													color="danger"
													onclick={() => openDeleteModal(student)}
													disabled={!canDelete}
												>
													Eliminar alumno
												</DropdownItem>
											{/snippet}
										</Dropdown>
									</div>
								</div>

								<div class="student-card__body">
									<div class="student-card__details">
										<InfoItem icon="creditCard" label="DNI" value={student.dni || 'Sin DNI'} />
										<InfoItem
											icon="phone"
											label="Teléfono"
											value={student.phone || 'Sin teléfono'}
										/>
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
							</div>
						</Card>
					{/each}
				</div>
			{/if}
		</div>
	</Card>
</div>

<Dialog bind:open={showDeleteModal} title="Eliminar alumno" size="sm">
	<form
		id="delete-student-form"
		method="POST"
		action="?/delete"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Alumno eliminado exitosamente', 'success');
					await invalidate('students:load');
					closeDeleteModal();
				} else if (result.type === 'failure') {
					showToast(getActionError(result) ?? 'No se pudo eliminar el alumno', 'error');
				}
			};
		}}
	>
		{#if selectedStudent}
			<input type="hidden" name="code" value={selectedStudent.code} />
			<p class="lumi-text--sm">
				¿Deseas eliminar a <strong>{selectedStudent.full_name}</strong>? Esta acción solo está
				disponible si no tiene matrículas históricas.
			</p>
		{/if}
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeDeleteModal}>Cancelar</Button>
		<Button type="filled" color="danger" onclick={() => submitForm('delete-student-form')}>
			Eliminar
		</Button>
	{/snippet}
</Dialog>

<style>
	.student-summary-grid {
		--lumi-grid-columns: repeat(3, minmax(0, 1fr));
	}

	.student-search-panel {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
		gap: var(--lumi-space-lg);
		align-items: end;
		padding: var(--lumi-space-lg);
		border-radius: var(--lumi-radius-2xl);
		background:
			linear-gradient(
				135deg,
				color-mix(in srgb, var(--lumi-color-primary) 6%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-info) 8%, transparent) 100%
			),
			color-mix(in srgb, var(--lumi-color-surface) 72%, var(--lumi-color-background-hover) 28%);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		box-shadow: var(--lumi-shadow-sm);
	}

	.student-search-panel__copy,
	.student-search-panel__form,
	.student-search-panel__buttons,
	.student-card__identity,
	.student-card__actions,
	.student-card__header,
	.student-card__name-row {
		display: flex;
	}

	.student-search-panel__copy,
	.student-search-panel__form {
		flex-direction: column;
		gap: var(--lumi-space-sm);
	}

	.student-search-panel__buttons,
	.student-card__actions,
	.student-card__name-row {
		flex-wrap: wrap;
		gap: var(--lumi-space-xs);
	}

	.student-search-panel__title,
	.student-card__name {
		margin: 0;
		color: var(--lumi-color-text);
	}

	.student-search-panel__title {
		font-size: var(--lumi-font-size-xl);
	}

	.student-search-panel__subtitle,
	.student-card__code {
		color: var(--lumi-color-text-muted);
	}

	.student-search-panel__subtitle,
	.student-card__code {
		margin: 0;
		font-size: var(--lumi-font-size-sm);
	}

	.student-card__header {
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--lumi-space-md);
	}

	.student-card__identity {
		align-items: center;
		gap: var(--lumi-space-md);
	}

	.student-card__body,
	.student-card__details {
		display: grid;
		gap: var(--lumi-space-md);
	}

	.student-card__details {
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
	}

	@media (max-width: 900px) {
		.student-summary-grid,
		.student-search-panel {
			grid-template-columns: 1fr;
		}
	}
</style>
