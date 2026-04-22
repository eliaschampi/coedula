<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { Alert, Button, Card, PageHeader, StudentForm } from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import { createEmptyStudentFormState } from '$lib/utils';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const canCreate = $derived(can('students:create'));

	let errorMessage = $state('');
	let form = $state(createEmptyStudentFormState());

	function resetForm(): void {
		form = createEmptyStudentFormState();
		errorMessage = '';
	}
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader
		title={data.title}
		subtitle="Completa la ficha y guarda la foto junto con el registro principal"
		icon="userPlus"
	>
		{#snippet actions()}
			<Button type="border" icon="arrowLeft" onclick={() => void goto(resolve('/students' as '/'))}>
				Volver
			</Button>
		{/snippet}
	</PageHeader>

	{#if !canCreate}
		<Alert type="warning" closable>No tienes permisos para crear alumnos.</Alert>
	{:else}
		<Alert type="warning" closable={false}>
			Busca primero en el directorio de alumnos para evitar registros duplicados.
		</Alert>

		<Card
			title="Ficha del alumno"
			subtitle="La foto se adjuntará al registrar el formulario"
			spaced
		>
			<StudentForm
				formId="student-create-form"
				action="?/create"
				mode="create"
				bind:form
				bind:errorMessage
				onsuccess={async () => {
					showToast('Alumno registrado exitosamente', 'success');
					resetForm();
					await goto(resolve('/students' as '/'));
				}}
			>
				{#snippet actions()}
					<Button type="filled" color="primary" icon="save" button="submit">
						Registrar alumno
					</Button>
				{/snippet}
			</StudentForm>
		</Card>
	{/if}
</div>
