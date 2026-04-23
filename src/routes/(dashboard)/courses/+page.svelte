<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import {
		Alert,
		Button,
		Card,
		Dialog,
		EmptyState,
		Input,
		PageHeader,
		Table
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import type { PageData } from './$types';

	type CourseRow = PageData['courses'][number];

	const { data }: { data: PageData } = $props();

	const canRead = $derived(can('courses:read'));
	const canCreate = $derived(can('courses:create'));
	const canUpdate = $derived(can('courses:update'));
	const canDelete = $derived(can('courses:delete'));

	let showModal = $state(false);
	let showDeleteModal = $state(false);
	let isEditing = $state(false);
	let errorMessage = $state('');
	let deleteErrorMessage = $state('');
	let selectedCourse = $state<CourseRow | null>(null);

	let formName = $state('');

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

	function openCreateModal(): void {
		if (!canCreate) return;
		isEditing = false;
		selectedCourse = null;
		formName = '';
		errorMessage = '';
		showModal = true;
	}

	function openEditModal(course: CourseRow): void {
		if (!canUpdate) return;
		isEditing = true;
		selectedCourse = course;
		formName = course.name;
		errorMessage = '';
		showModal = true;
	}

	function openDeleteModal(course: CourseRow): void {
		if (!canDelete) return;
		selectedCourse = course;
		deleteErrorMessage = '';
		showDeleteModal = true;
	}

	function closeModal(): void {
		showModal = false;
		errorMessage = '';
	}

	function closeDeleteModal(): void {
		showDeleteModal = false;
		deleteErrorMessage = '';
		selectedCourse = null;
	}
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader
		title="Cursos"
		subtitle="Administra el catálogo base de cursos con el mismo flujo operativo del resto del sistema"
		icon="bookOpenCheck"
	>
		{#snippet actions()}
			<Button
				type="filled"
				color="primary"
				icon="plus"
				onclick={openCreateModal}
				disabled={!canCreate}
			>
				Nuevo curso
			</Button>
		{/snippet}
	</PageHeader>

	<Card>
		{#if !canRead}
			<Alert type="warning" closable>No tienes permisos para consultar cursos.</Alert>
		{:else if data.courses.length === 0}
			<EmptyState
				title="Sin cursos registrados"
				description="Crea el primer curso para empezar a organizar el catálogo académico."
				icon="bookOpenCheck"
			>
				{#snippet actions()}
					<Button
						type="filled"
						color="primary"
						icon="plus"
						onclick={openCreateModal}
						disabled={!canCreate}
					>
						Crear curso
					</Button>
				{/snippet}
			</EmptyState>
		{:else}
			<Table data={data.courses} search pagination hover itemsPerPage={10}>
				{#snippet thead()}
					<th>Nombre</th>
					<th>Acciones</th>
				{/snippet}

				{#snippet row({ row })}
					{@const course = row as unknown as CourseRow}
					<td>
						<span class="lumi-font--medium">{course.name}</span>
					</td>
					<td>
						<div class="lumi-flex lumi-flex--gap-xs">
							<Button
								type="flat"
								size="sm"
								icon="edit"
								onclick={() => openEditModal(course)}
								disabled={!canUpdate}
							/>
							<Button
								type="flat"
								size="sm"
								icon="trash"
								color="danger"
								onclick={() => openDeleteModal(course)}
								disabled={!canDelete}
							/>
						</div>
					</td>
				{/snippet}
			</Table>
		{/if}
	</Card>
</div>

<Dialog bind:open={showModal} title={isEditing ? 'Editar curso' : 'Nuevo curso'} size="md">
	<form
		id="course-form"
		method="POST"
		action="?/{isEditing ? 'update' : 'create'}"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast(
						isEditing ? 'Curso actualizado exitosamente' : 'Curso creado exitosamente',
						'success'
					);
					await invalidate('courses:load');
					closeModal();
				} else if (result.type === 'failure') {
					errorMessage = getActionError(result) ?? 'Ocurrió un error';
				}
			};
		}}
	>
		{#if isEditing && selectedCourse}
			<input type="hidden" name="code" value={selectedCourse.code} />
		{/if}

		{#if errorMessage}
			<Alert type="danger" closable onclose={() => (errorMessage = '')}>
				{errorMessage}
			</Alert>
		{/if}

		<div class="lumi-stack lumi-stack--md">
			<Input
				bind:value={formName}
				name="name"
				label="Nombre del curso"
				placeholder="Ingrese el nombre"
				required
			/>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeModal}>Cancelar</Button>
		<Button type="filled" color="primary" onclick={() => submitForm('course-form')}>
			{isEditing ? 'Actualizar' : 'Crear'}
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showDeleteModal} title="Confirmar eliminación" size="sm">
	<form
		id="delete-course-form"
		method="POST"
		action="?/delete"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Curso eliminado exitosamente', 'success');
					await invalidate('courses:load');
					closeDeleteModal();
				} else if (result.type === 'failure') {
					deleteErrorMessage = getActionError(result) ?? 'Error al eliminar';
					showToast(deleteErrorMessage, 'error');
				}
			};
		}}
	>
		{#if selectedCourse}
			<input type="hidden" name="code" value={selectedCourse.code} />
			{#if deleteErrorMessage}
				<Alert type="danger" closable onclose={() => (deleteErrorMessage = '')}>
					{deleteErrorMessage}
				</Alert>
			{/if}
			<p class="lumi-margin--none">
				¿Estás seguro de que deseas eliminar el curso <strong>{selectedCourse.name}</strong>? Esta
				acción no se puede deshacer.
			</p>
		{/if}
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeDeleteModal}>Cancelar</Button>
		<Button
			type="filled"
			color="danger"
			disabled={!canDelete || !selectedCourse}
			onclick={() => submitForm('delete-course-form')}
		>
			Eliminar
		</Button>
	{/snippet}
</Dialog>
