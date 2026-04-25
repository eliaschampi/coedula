<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Snippet } from 'svelte';
	import { createEmptyStudentFormState, syncStudentPhotoFormData } from '$lib/utils';
	import type { StudentFormState } from '$lib/utils';
	import Alert from '../Alert/Alert.svelte';
	import StudentFormFields from '../StudentFormFields/StudentFormFields.svelte';

	interface FormActionResult {
		type: string;
		data?: Record<string, unknown>;
	}

	interface Props {
		formId?: string;
		action: string;
		mode?: 'create' | 'edit';
		studentCode?: string;
		form?: StudentFormState;
		errorMessage?: string;
		actions?: Snippet;
		onsuccess?: (result: FormActionResult) => Promise<void> | void;
	}

	let {
		formId = 'student-form',
		action,
		mode = 'create',
		studentCode = '',
		form = $bindable(createEmptyStudentFormState()),
		errorMessage = $bindable(''),
		actions,
		onsuccess
	}: Props = $props();

	const isEditing = $derived(mode === 'edit');

	function getActionError(result: FormActionResult): string | null {
		const error = result.data?.error;
		return typeof error === 'string' && error.length > 0 ? error : null;
	}
</script>

<form
	id={formId}
	method="POST"
	{action}
	enctype="multipart/form-data"
	use:enhance={({ formData }) => {
		syncStudentPhotoFormData(formData, form.pendingPhotoFile);

		return async ({ result }) => {
			const actionResult = result as FormActionResult;

			if (actionResult.type === 'success') {
				errorMessage = '';
				await onsuccess?.(actionResult);
				return;
			}

			if (actionResult.type === 'failure') {
				errorMessage = getActionError(actionResult) ?? 'Ocurrió un error';
			}
		};
	}}
>
	{#if isEditing && studentCode}
		<input type="hidden" name="code" value={studentCode} />
	{/if}

	{#if errorMessage}
		<Alert type="danger" closable onclose={() => (errorMessage = '')}>
			{errorMessage}
		</Alert>
	{/if}

	<StudentFormFields
		bind:photoUrl={form.photoUrl}
		bind:pendingPhotoFile={form.pendingPhotoFile}
		bind:firstName={form.firstName}
		bind:lastName={form.lastName}
		bind:phone={form.phone}
		bind:address={form.address}
		bind:dni={form.dni}
		bind:birthDate={form.birthDate}
		bind:observation={form.observation}
		{isEditing}
	/>

	{#if actions}
		<div class="lumi-flex lumi-justify--end lumi-margin-top--lg">
			{@render actions()}
		</div>
	{/if}
</form>
