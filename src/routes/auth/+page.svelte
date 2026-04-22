<script lang="ts">
	import { enhance } from '$app/forms';
	import Card from '$lib/components/Card/Card.svelte';
	import Input from '$lib/components/Input/Input.svelte';
	import Button from '$lib/components/Button/Button.svelte';
	import Alert from '$lib/components/Alert/Alert.svelte';
	import type { ActionData } from './$types';

	const { form }: { form: ActionData } = $props();

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let isLoading = $state(false);

	const isFormValid = $derived(email.includes('@') && password.length >= 6);
</script>

<svelte:head>
	<title>Iniciar Sesión | Coedula</title>
</svelte:head>

<div
	class="lumi-centered-layout"
	style="background: linear-gradient(135deg, var(--lumi-color-primary-50) 0%, var(--lumi-color-background) 100%);"
>
	<div class="lumi-centered-card">
		<Card>
			<div class="lumi-padding--xl">
				<div class="lumi-text--center lumi-margin-bottom--lg">
					<h2 class="lumi-text--2xl lumi-font--bold lumi-margin--none lumi-margin-bottom--xs">
						Coedula
					</h2>
					<p class="lumi-text--sm lumi-text--muted lumi-margin--none">
						Ingresa tus credenciales para continuar
					</p>
				</div>

				{#if form?.error}
					<div class="lumi-margin-bottom--lg">
						<Alert type="danger" title="Error" closable>
							{form.error}
						</Alert>
					</div>
				{/if}

				<form
					method="POST"
					action="?/login"
					use:enhance={() => {
						isLoading = true;
						return async ({ update }) => {
							await update();
							isLoading = false;
						};
					}}
					class="lumi-stack lumi-stack--lg"
				>
					<Input
						bind:value={email}
						icon="mail"
						name="email"
						type="email"
						label="Correo electrónico"
						placeholder="tu@correo.com"
						required
					/>

					<Input
						bind:value={password}
						name="password"
						type={showPassword ? 'text' : 'password'}
						label="Contraseña"
						placeholder="••••••••"
						icon="lock"
						actionIcon={showPassword ? 'eyeOff' : 'eye'}
						actionLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
						onaction-click={() => (showPassword = !showPassword)}
						required
					/>

					<Button
						button="submit"
						type="filled"
						color="primary"
						size="lg"
						class="lumi-width--full"
						disabled={isLoading || !isFormValid}
						loading={isLoading}
					>
						{isLoading ? 'Procesando...' : 'Iniciar sesión'}
					</Button>
				</form>
			</div>
		</Card>

		<p class="lumi-margin-top--lg lumi-text--sm lumi-text--muted lumi-text--center">
			Coedula © {new Date().getFullYear()} - Gestión educativa
		</p>
	</div>
</div>
