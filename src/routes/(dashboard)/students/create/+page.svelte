<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Alert, Button, Card, PageHeader, StudentFormFields } from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import { syncStudentPhotoFormData } from '$lib/utils';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const canCreate = $derived(can('students:create'));

	let errorMessage = $state('');

	let formFirstName = $state('');
	let formLastName = $state('');
	let formPhone = $state('');
	let formAddress = $state('');
	let formDni = $state('');
	let formBirthDate = $state('');
	let formObservation = $state('');
	let formPhotoUrl = $state('');
	let formPendingPhotoFile = $state<File | null>(null);
	let formIsActive = $state(true);

	function getActionError(result: { data?: Record<string, unknown> }): string | null {
		const error = result.data?.error;
		return typeof error === 'string' && error.length > 0 ? error : null;
	}

	function resetForm(): void {
		formFirstName = '';
		formLastName = '';
		formPhone = '';
		formAddress = '';
		formDni = '';
		formBirthDate = '';
		formObservation = '';
		formPhotoUrl = '';
		formPendingPhotoFile = null;
		formIsActive = true;
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
		<Alert type="info" closable={false}>
			Busca primero en el directorio de alumnos para evitar fichas duplicadas antes de registrar una
			nueva.
		</Alert>

		<Card
			title="Ficha del alumno"
			subtitle="La foto se adjuntará al registrar el formulario"
			spaced
		>
			<form
				method="POST"
				action="?/create"
				enctype="multipart/form-data"
				use:enhance={({ formData }) => {
					syncStudentPhotoFormData(formData, formPendingPhotoFile);

					return async ({ result }) => {
						if (result.type === 'success') {
							showToast('Alumno registrado exitosamente', 'success');
							resetForm();
							await goto(resolve('/students' as '/'));
							return;
						}

						if (result.type === 'failure') {
							errorMessage = getActionError(result) ?? 'Ocurrió un error';
						}
					};
				}}
			>
				{#if errorMessage}
					<Alert type="danger" closable onclose={() => (errorMessage = '')}>
						{errorMessage}
					</Alert>
				{/if}

				<StudentFormFields
					bind:photoUrl={formPhotoUrl}
					bind:pendingPhotoFile={formPendingPhotoFile}
					bind:firstName={formFirstName}
					bind:lastName={formLastName}
					bind:phone={formPhone}
					bind:address={formAddress}
					bind:dni={formDni}
					bind:birthDate={formBirthDate}
					bind:observation={formObservation}
					bind:isActive={formIsActive}
				/>

				<div class="lumi-flex lumi-justify--end lumi-margin-top--lg">
					<Button type="filled" color="primary" icon="save" button="submit">
						Registrar alumno
					</Button>
				</div>
			</form>
		</Card>
	{/if}
</div>
