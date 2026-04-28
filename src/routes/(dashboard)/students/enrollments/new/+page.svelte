<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto, invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import {
		Alert,
		Button,
		Card,
		EmptyState,
		EnrollmentWorkspaceForm,
		PageHeader
	} from '$lib/components';
	import { showToast } from '$lib/stores/Toast';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	let errorMessage = $state('');
</script>

<div class="lumi-stack lumi-stack--md">
	<PageHeader
		title="Nueva matrícula"
		subtitle="Completa la asignación académica en una vista dedicada"
		icon="clipboardPenLine"
	>
		{#snippet actions()}
			<Button type="border" icon="arrowLeft" onclick={() => void goto(resolve('/students' as '/'))}>
				Volver a alumnos
			</Button>
		{/snippet}
	</PageHeader>

	{#if data.forbidden}
		<Alert type="warning" closable={false}>No tienes permisos para crear matrículas.</Alert>
	{:else if data.noBranch}
		<Alert type="warning" closable={false}>
			Selecciona una sede de trabajo para listar ciclos y grados.
		</Alert>
	{:else if !data.student}
		<Card spaced>
			<EmptyState
				title="Seleccioná un alumno"
				description="En Alumnos abrí «Buscar alumno», elegí un resultado y usá «Nueva matrícula» en el menú de acciones para abrir el formulario con la ficha cargada."
				icon="userSearch"
			>
				{#snippet actions()}
					<Button
						type="filled"
						color="primary"
						onclick={() => void goto(resolve('/students' as '/'))}
					>
						Ir a alumnos
					</Button>
				{/snippet}
			</EmptyState>
		</Card>
	{:else}
		<Card spaced title="Datos de matrícula">
			<form
				method="POST"
				class="lumi-stack lumi-stack--md"
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success') {
							const d = result.data as { enrollmentNumber?: string; rollCode?: string } | undefined;
							showToast(
								`Matrícula ${d?.enrollmentNumber ?? ''} · Lista ${d?.rollCode ?? ''}`,
								'success'
							);
							await invalidate('students:hub:load');
							await invalidate('enrollments:load');
							await goto(resolve('/students' as '/'));
							return;
						}
						if (result.type === 'failure') {
							const err = result.data?.error;
							errorMessage = typeof err === 'string' ? err : 'No se pudo guardar';
						}
					};
				}}
			>
				{#if errorMessage}
					<Alert type="danger" closable onclose={() => (errorMessage = '')}>{errorMessage}</Alert>
				{/if}

				<EnrollmentWorkspaceForm
					student={{
						code: data.student.code,
						full_name: data.student.full_name,
						student_number: data.student.student_number,
						student_dni: data.student.dni
					}}
					cycles={data.cycles}
					cycleDegreeOptions={data.cycleDegreeOptions}
					initialCycleCode={data.selectedCycleCode}
					initialCycleDegreeCode={data.selectedCycleDegreeCode}
					initialGroupCode={data.selectedGroupCode}
					enrollment={null}
				/>

				<div class="lumi-flex lumi-flex--gap-sm lumi-justify--end">
					<Button type="border" onclick={() => void goto(resolve('/students' as '/'))}>
						Cancelar
					</Button>
					<Button type="filled" color="primary" button="submit">Guardar matrícula</Button>
				</div>
			</form>
		</Card>
	{/if}
</div>
