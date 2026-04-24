<script lang="ts">
	import { Button, Card, Chip, EmptyState, InfoItem, PageHeader, UserInfo } from '$lib/components';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const user = $derived.by(() => data.user ?? null);
	const permissionsCount = $derived.by(() => data.userPermissions?.length ?? 0);
	const accessTone = $derived.by(() => (user?.is_super_admin ? 'warning' : 'primary'));
	const accessLabel = $derived.by(() =>
		user?.is_super_admin ? 'Administrador total' : 'Usuario del sistema'
	);

	function formatDateTime(value: Date | string | null | undefined): string {
		if (!value) {
			return 'Sin registro';
		}

		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) {
			return 'Sin registro';
		}

		return new Intl.DateTimeFormat('es-PE', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(date);
	}

	function formatDate(value: Date | string | null | undefined): string {
		if (!value) {
			return 'Sin registro';
		}

		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) {
			return 'Sin registro';
		}

		return new Intl.DateTimeFormat('es-PE', {
			dateStyle: 'long'
		}).format(date);
	}
</script>

<div class="profile-page lumi-stack lumi-stack--xl">
	<PageHeader
		title="Mi perfil"
		subtitle="Resumen simple de tu cuenta y accesos dentro de Coedula"
		icon="userRound"
	>
		{#snippet actions()}
			<form action="/api/logout" method="POST">
				<Button button="submit" type="border" color="danger" icon="logOut">Cerrar sesión</Button>
			</form>
		{/snippet}
	</PageHeader>

	{#if user}
		<div class="profile-page__grid">
			<Card spaced class="profile-page__hero-card">
				<div class="lumi-stack lumi-stack--lg lumi-relative">
					<UserInfo
						name={user.name ?? ''}
						lastName={user.last_name ?? ''}
						description={user.email ?? 'Sin correo'}
						photoUrl={user.photo_url ?? ''}
						avatarSize="xl"
					/>

					<div class="lumi-flex lumi-flex--wrap lumi-flex--gap-xs">
						<Chip color={accessTone} icon={user.is_super_admin ? 'shieldCheck' : 'user'} size="sm">
							{accessLabel}
						</Chip>
						<Chip color="info" icon="key" size="sm">
							{permissionsCount} permisos activos
						</Chip>
					</div>

					<p class="profile-page__summary lumi-margin--none lumi-text--sm lumi-text--muted">
						Esta vista concentra tu información base de acceso para que puedas validar rápido quién
						está operando el sistema.
					</p>
				</div>
			</Card>

			<Card
				title="Datos personales"
				subtitle="Información principal visible dentro del sistema"
				spaced
			>
				<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
					<InfoItem icon="user" label="Nombres" value={user.name || 'Sin registro'} />
					<InfoItem icon="userRound" label="Apellidos" value={user.last_name || 'Sin registro'} />
					<InfoItem icon="mail" label="Correo" value={user.email || 'Sin correo'} />
					<InfoItem icon="hash" label="Código de usuario" value={user.code || 'Sin código'} />
				</div>
			</Card>
		</div>

		<Card title="Actividad de cuenta" subtitle="Fechas y nivel de acceso" spaced>
			<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-md">
				<InfoItem icon="shieldCheck" label="Nivel de acceso" value={accessLabel} />
				<InfoItem icon="calendar" label="Miembro desde" value={formatDate(user.created_at)} />
				<InfoItem icon="clock" label="Último acceso" value={formatDateTime(user.last_login)} />
				<InfoItem
					icon="badgeCheck"
					label="Estado"
					value={user.is_super_admin ? 'Acceso global habilitado' : 'Cuenta operativa activa'}
				/>
			</div>
		</Card>
	{:else}
		<Card spaced>
			<EmptyState
				icon="user"
				title="Perfil no disponible"
				description="No se pudo cargar la información de la sesión actual."
			/>
		</Card>
	{/if}
</div>

<style>
	.profile-page__grid {
		display: grid;
		grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
		gap: var(--lumi-space-lg);
	}

	:global(.profile-page__hero-card) {
		position: relative;
		overflow: hidden;
	}

	:global(.profile-page__hero-card)::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(
				circle at top right,
				rgba(var(--lumi-color-primary-rgb), 0.14),
				transparent 52%
			),
			linear-gradient(
				145deg,
				color-mix(in srgb, var(--lumi-color-primary-bg) 72%, transparent),
				transparent 62%
			);
		pointer-events: none;
	}

	.profile-page__summary {
		line-height: var(--lumi-line-height-relaxed);
		max-width: 58ch;
	}

	@media (max-width: 960px) {
		.profile-page__grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
