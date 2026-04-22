<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { Alert, Button, Card, PageHeader, StudentForm } from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import { createStudentFormStateFromSource } from '$lib/utils';
	import type { PageData } from './$types';

	const props = $props<{ data: PageData }>();
	const data = $derived(props.data);

	const canUpdate = $derived(can('students:update'));

	let errorMessage = $state('');
	let form = $state(createStudentFormStateFromSource(untrack(() => props.data.student)));
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader
		title={data.title}
		subtitle="Actualiza la ficha del alumno desde una vista dedicada y reutilizable"
		icon="userCog"
	>
		{#snippet actions()}
			<Button
				type="border"
				icon="arrowLeft"
				onclick={() => void goto(resolve(`/students/${data.student.code}` as '/'))}
			>
				Volver
			</Button>
		{/snippet}
	</PageHeader>

	{#if !canUpdate}
		<Alert type="warning" closable>No tienes permisos para editar alumnos.</Alert>
	{:else}
		<Card
			title="Ficha del alumno"
			subtitle="Los cambios se guardarán sobre el registro actual sin abrir modales"
			spaced
		>
			<StudentForm
				formId="student-edit-form"
				action="?/update"
				mode="edit"
				studentCode={data.student.code}
				bind:form
				bind:errorMessage
				onsuccess={async () => {
					showToast('Alumno actualizado exitosamente', 'success');
					await goto(resolve(`/students/${data.student.code}` as '/'));
				}}
			>
				{#snippet actions()}
					<Button type="filled" color="primary" icon="save" button="submit">Guardar cambios</Button>
				{/snippet}
			</StudentForm>
		</Card>
	{/if}
</div>
