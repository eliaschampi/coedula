<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto, invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import {
		Alert,
		Button,
		Card,
		Dialog,
		EnrollmentWorkspaceForm,
		PageHeader
	} from '$lib/components';
	import { showToast } from '$lib/stores/Toast';
	import { can } from '$lib/stores/permissions';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const canDelete = $derived(can('enrollments:delete'));

	let errorMessage = $state('');
	let showDeleteDialog = $state(false);

	const studentBlock = $derived(
		data.student
			? {
					code: data.student.code,
					full_name: data.student.full_name,
					student_number: data.student.student_number,
					student_dni: data.student.dni
				}
			: {
					code: data.enrollment.student_code,
					full_name: data.enrollment.student_full_name,
					student_number: data.enrollment.student_number,
					student_dni: data.enrollment.student_dni
				}
	);
</script>

<div class="lumi-stack lumi-stack--md">
	<PageHeader
		title="Editar matrícula"
		subtitle={data.enrollment.enrollment_number}
		icon="clipboardPenLine"
	>
		{#snippet actions()}
			<Button type="border" icon="arrowLeft" onclick={() => void goto(resolve('/students' as '/'))}>
				Volver a alumnos
			</Button>
		{/snippet}
	</PageHeader>

	{#if data.noBranch}
		<Alert type="warning" closable={false}>
			Selecciona una sede de trabajo para validar ciclos y grados.
		</Alert>
	{/if}

	<Card spaced title="Matrícula">
		<form
			method="POST"
			class="lumi-stack lumi-stack--md"
			use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success') {
						showToast('Matrícula actualizada', 'success');
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
				student={studentBlock}
				cycles={data.cycles}
				cycleDegreeOptions={data.cycleDegreeOptions}
				initialCycleCode={data.enrollment.cycle_code}
				initialCycleDegreeCode={data.enrollment.cycle_degree_code}
				initialGroupCode={data.enrollment.group_code}
				enrollment={data.enrollment}
				disabled={data.noBranch}
			/>

			<div class="lumi-flex lumi-flex--gap-sm lumi-justify--between lumi-flex--wrap">
				<Button
					type="flat"
					color="danger"
					icon="trash"
					disabled={!canDelete || data.noBranch}
					onclick={() => (showDeleteDialog = true)}
				>
					Eliminar matrícula
				</Button>
				<div class="lumi-flex lumi-flex--gap-sm">
					<Button type="border" onclick={() => void goto(resolve('/students' as '/'))}>
						Cancelar
					</Button>
					<Button type="filled" color="primary" button="submit" disabled={data.noBranch}>
						Guardar cambios
					</Button>
				</div>
			</div>
		</form>
	</Card>
</div>

<Dialog bind:open={showDeleteDialog} title="Eliminar matrícula" size="sm">
	<form
		id="delete-enrollment-form"
		method="POST"
		action="?/delete"
		class="lumi-stack lumi-stack--md"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Matrícula eliminada', 'success');
					showDeleteDialog = false;
					await invalidate('students:hub:load');
					await invalidate('enrollments:load');
					await goto(resolve('/students' as '/'));
				} else if (result.type === 'failure') {
					showToast(String(result.data?.error ?? 'No se pudo eliminar'), 'error');
				}
			};
		}}
	>
		<input type="hidden" name="code" value={data.enrollment.code} />
		<p class="lumi-text--sm">
			¿Eliminar la matrícula <strong>{data.enrollment.enrollment_number}</strong> de
			<strong>{data.enrollment.student_full_name}</strong>?
		</p>
		<div class="lumi-flex lumi-flex--gap-sm lumi-justify--end">
			<Button type="border" onclick={() => (showDeleteDialog = false)}>Cancelar</Button>
			<Button type="filled" color="danger" button="submit">Eliminar</Button>
		</div>
	</form>
</Dialog>
