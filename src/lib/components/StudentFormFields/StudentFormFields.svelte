<script lang="ts">
	import Alert from '../Alert/Alert.svelte';
	import Fieldset from '../Fieldset/Fieldset.svelte';
	import Input from '../Input/Input.svelte';
	import StudentPhotoUploader from '../StudentPhotoUploader/StudentPhotoUploader.svelte';
	import Textarea from '../Textarea/Textarea.svelte';

	interface Props {
		photoUrl?: string;
		pendingPhotoFile?: File | null;
		firstName?: string;
		lastName?: string;
		phone?: string;
		address?: string;
		dni?: string;
		birthDate?: string;
		observation?: string;
		isEditing?: boolean;
	}

	let {
		photoUrl = $bindable(''),
		pendingPhotoFile = $bindable<File | null>(null),
		firstName = $bindable(''),
		lastName = $bindable(''),
		phone = $bindable(''),
		address = $bindable(''),
		dni = $bindable(''),
		birthDate = $bindable(''),
		observation = $bindable(''),
		isEditing = false
	}: Props = $props();
</script>

<input type="hidden" name="photo_url" value={photoUrl} />

<div class="lumi-stack lumi-stack--md">
	<StudentPhotoUploader bind:value={photoUrl} bind:pendingFile={pendingPhotoFile} />

	<Fieldset legend="Datos personales">
		<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-md">
			<Input
				bind:value={firstName}
				name="first_name"
				label="Nombres"
				placeholder="Ingrese los nombres"
				required
			/>
			<Input
				bind:value={lastName}
				name="last_name"
				label="Apellidos"
				placeholder="Ingrese los apellidos"
				required
			/>
			<Input bind:value={dni} name="dni" label="DNI" placeholder="12345678" />
			<Input bind:value={birthDate} name="birth_date" type="date" label="Fecha de nacimiento" />
		</div>
	</Fieldset>

	<Fieldset legend="Contacto">
		<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-md">
			<Input bind:value={phone} name="phone" label="Teléfono" placeholder="987652432" />
			<Input
				bind:value={address}
				name="address"
				label="Dirección"
				placeholder="Av., calle o referencia"
			/>
		</div>
	</Fieldset>

	<Textarea
		bind:value={observation}
		name="observation"
		label="Observaciones"
		placeholder="Información adicional del estudiante"
		rows={4}
	/>

	{#if !isEditing}
		<Alert type="info" closable={false}>
			La contraseña se generará automáticamente al registrar al alumno.
		</Alert>
	{/if}
</div>
