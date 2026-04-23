<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert, Button, Card, Chip, Icon, Input } from '$lib/components';
	import type { ActionData } from './$types';

	const { form }: { form: ActionData } = $props();

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let isLoading = $state(false);

	const isFormValid = $derived(email.includes('@') && password.length >= 6);
	const highlights = [
		{
			icon: 'graduationCap',
			title: 'Control académico',
			description: 'Gestiona alumnos, matrículas, asistencia y evaluaciones desde un mismo panel.'
		},
		{
			icon: 'wallet',
			title: 'Caja operativa',
			description:
				'Registra ingresos, egresos y rendiciones con una experiencia simple y consistente.'
		},
		{
			icon: 'shieldCheck',
			title: 'Acceso seguro',
			description: 'La sesión usa validación robusta y control de acceso por permisos.'
		}
	];
</script>

<svelte:head>
	<title>Iniciar Sesión | Coedula</title>
</svelte:head>

<div class="auth-login">
	<div class="auth-login__glow auth-login__glow--primary"></div>
	<div class="auth-login__glow auth-login__glow--secondary"></div>

	<div class="auth-login__shell">
		<section class="auth-login__hero">
			<div class="auth-login__hero-copy">
				<div class="auth-login__chips">
					<Chip color="primary" icon="sparkles" size="sm">Plataforma educativa</Chip>
					<Chip color="info" icon="shieldCheck" size="sm">Acceso seguro</Chip>
				</div>

				<div class="auth-login__headline">
					<p class="auth-login__brand">Coedula</p>
					<h1 class="auth-login__title">
						Gestión educativa clara, moderna y lista para operar cada día.
					</h1>
					<p class="auth-login__description">
						Trabaja alumnos, matrículas, evaluaciones, asistencia y caja desde una sola experiencia
						consistente.
					</p>
				</div>
			</div>

			<Card class="auth-login__feature-card" spaced>
				{#each highlights as highlight (highlight.title)}
					<div class="auth-login__feature">
						<div class="auth-login__feature-icon">
							<Icon icon={highlight.icon} size="18px" />
						</div>
						<div class="auth-login__feature-copy">
							<p class="auth-login__feature-title">{highlight.title}</p>
							<p class="auth-login__feature-description">{highlight.description}</p>
						</div>
					</div>
				{/each}
			</Card>
		</section>

		<Card class="auth-login__form-card">
			<div class="auth-login__form-shell">
				<div class="auth-login__form-heading">
					<p class="auth-login__form-kicker">Bienvenido</p>
					<h2 class="auth-login__form-title">Iniciar sesión</h2>
					<p class="auth-login__form-description">
						Ingresa tus credenciales para acceder al panel administrativo.
					</p>
				</div>

				{#if form?.error}
					<Alert type="danger" title="Error de acceso" closable>
						{form.error}
					</Alert>
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
						type="gradient"
						color="primary"
						size="lg"
						class="auth-login__submit"
						disabled={isLoading || !isFormValid}
						loading={isLoading}
					>
						{isLoading ? 'Procesando...' : 'Entrar al sistema'}
					</Button>
				</form>

				<p class="auth-login__footnote">
					Coedula © {new Date().getFullYear()} · Gestión educativa profesional
				</p>
			</div>
		</Card>
	</div>
</div>

<style>
	.auth-login {
		position: relative;
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(var(--lumi-space-lg), 4vw, var(--lumi-space-4xl));
		background:
			radial-gradient(
				circle at top left,
				rgba(var(--lumi-color-primary-rgb), 0.14),
				transparent 34%
			),
			linear-gradient(
				145deg,
				var(--lumi-color-primary-50) 0%,
				color-mix(in srgb, var(--lumi-color-background) 82%, white) 48%,
				var(--lumi-color-background) 100%
			);
		overflow: hidden;
	}

	.auth-login__glow {
		position: absolute;
		width: min(34rem, 48vw);
		aspect-ratio: 1;
		border-radius: 50%;
		filter: blur(28px);
		opacity: 0.7;
		pointer-events: none;
	}

	.auth-login__glow--primary {
		top: -18%;
		left: -10%;
		background: rgba(var(--lumi-color-primary-rgb), 0.16);
	}

	.auth-login__glow--secondary {
		right: -12%;
		bottom: -24%;
		background: rgba(var(--lumi-color-info-rgb), 0.12);
	}

	.auth-login__shell {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: minmax(0, 1.08fr) minmax(22rem, 28rem);
		gap: clamp(var(--lumi-space-xl), 4vw, var(--lumi-space-4xl));
		align-items: center;
		width: min(100%, 1100px);
	}

	.auth-login__hero,
	.auth-login__form-shell {
		display: flex;
		flex-direction: column;
	}

	.auth-login__hero {
		gap: var(--lumi-space-xl);
	}

	.auth-login__chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--lumi-space-xs);
	}

	.auth-login__headline {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-md);
		max-width: 34rem;
	}

	.auth-login__brand,
	.auth-login__feature-title,
	.auth-login__feature-description,
	.auth-login__form-kicker,
	.auth-login__form-title,
	.auth-login__form-description,
	.auth-login__footnote {
		margin: 0;
	}

	.auth-login__brand {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-semibold);
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--lumi-color-primary);
	}

	.auth-login__title {
		margin: 0;
		font-size: clamp(var(--lumi-font-size-3xl), 4vw, 3.6rem);
		line-height: 1.04;
		letter-spacing: var(--lumi-letter-spacing-tight);
		color: var(--lumi-color-text);
	}

	.auth-login__description {
		margin: 0;
		font-size: var(--lumi-font-size-base);
		line-height: var(--lumi-line-height-relaxed);
		color: var(--lumi-color-text-muted);
	}

	:global(.auth-login__feature-card) {
		max-width: 34rem;
	}

	.auth-login__feature {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: var(--lumi-space-md);
		align-items: start;
	}

	.auth-login__feature + .auth-login__feature {
		padding-top: var(--lumi-space-md);
		border-top: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
	}

	.auth-login__feature-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: var(--lumi-radius-xl);
		background: color-mix(in srgb, var(--lumi-color-primary) 12%, transparent);
		border: var(--lumi-border-width-thin) solid
			color-mix(in srgb, var(--lumi-color-primary) 18%, transparent);
		color: var(--lumi-color-primary);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.36);
	}

	.auth-login__feature-copy {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
	}

	.auth-login__feature-title {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
	}

	.auth-login__feature-description {
		font-size: var(--lumi-font-size-sm);
		line-height: var(--lumi-line-height-relaxed);
		color: var(--lumi-color-text-muted);
	}

	:global(.auth-login__form-card) {
		position: relative;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.96)),
			var(--lumi-color-surface);
		border-color: color-mix(in srgb, var(--lumi-color-primary) 12%, var(--lumi-color-border));
		box-shadow:
			0 28px 42px -34px rgba(var(--lumi-color-primary-rgb), 0.35),
			var(--lumi-shadow-lg);
		backdrop-filter: blur(var(--lumi-blur-lg));
		-webkit-backdrop-filter: blur(var(--lumi-blur-lg));
	}

	.auth-login__form-shell {
		gap: var(--lumi-space-lg);
	}

	.auth-login__form-heading {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
	}

	.auth-login__form-kicker {
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-semibold);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--lumi-color-primary);
	}

	.auth-login__form-title {
		font-size: var(--lumi-font-size-2xl);
		font-weight: var(--lumi-font-weight-bold);
		line-height: var(--lumi-line-height-tight);
		color: var(--lumi-color-text);
	}

	.auth-login__form-description {
		font-size: var(--lumi-font-size-sm);
		line-height: var(--lumi-line-height-relaxed);
		color: var(--lumi-color-text-muted);
	}

	:global(.auth-login__submit) {
		width: 100%;
	}

	.auth-login__footnote {
		font-size: var(--lumi-font-size-xs);
		line-height: var(--lumi-line-height-normal);
		color: var(--lumi-color-text-muted);
		text-align: center;
	}

	@media (max-width: 960px) {
		.auth-login__shell {
			grid-template-columns: minmax(0, 1fr);
		}

		.auth-login__hero {
			order: 2;
		}

		:global(.auth-login__feature-card) {
			max-width: none;
		}
	}

	@media (max-width: 640px) {
		.auth-login {
			padding: var(--lumi-space-md);
		}

		.auth-login__title {
			font-size: clamp(2rem, 9vw, 2.5rem);
		}

		.auth-login__feature {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	:global([data-theme='dark'] .auth-login) {
		background:
			radial-gradient(
				circle at top left,
				rgba(var(--lumi-color-primary-rgb), 0.18),
				transparent 34%
			),
			linear-gradient(
				145deg,
				color-mix(in srgb, var(--lumi-color-background) 92%, black) 0%,
				var(--lumi-color-background) 52%,
				color-mix(in srgb, var(--lumi-color-background) 78%, black) 100%
			);
	}

	:global([data-theme='dark'] .auth-login__form-card) {
		background:
			linear-gradient(180deg, rgba(var(--lumi-color-primary-rgb), 0.08), rgba(0, 0, 0, 0.12)),
			var(--lumi-color-surface);
	}
</style>
