<script lang="ts">
	import { browser } from '$app/environment';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Navbar from '$lib/components/Navbar/Navbar.svelte';
	import Sidebar from '$lib/components/Sidebar/Sidebar.svelte';
	import SidebarItem from '$lib/components/Sidebar/SidebarItem.svelte';
	import { Icon, Divider, Button } from '$lib/components';
	import Notification from '$lib/components/Notification/Notification.svelte';
	import Avatar from '$lib/components/Avatar/Avatar.svelte';
	import Dropdown from '$lib/components/Dropdown/Dropdown.svelte';
	import DropdownItem from '$lib/components/Dropdown/DropdownItem.svelte';
	import { can, initializePermissions } from '$lib/stores/permissions';
	import { hasSuperUserAccess } from '$lib/permissions/super-user';
	import { theme } from '$lib/stores/theme';
	import { toasts, removeToast } from '$lib/stores/Toast';
	import { page } from '$app/state';

	initializePermissions(page.data.userPermissions || [], hasSuperUserAccess(page.data.user));

	const { children } = $props();

	let sidebarCollapsed = $state(false);
	let sidebarMobileOpen = $state(false);
	let isMobile = $state(false);

	// Detect mobile viewport
	$effect(() => {
		if (browser) {
			const checkMobile = () => {
				isMobile = window.innerWidth <= 1024;
				// Close mobile sidebar when resizing to desktop
				if (!isMobile && sidebarMobileOpen) {
					sidebarMobileOpen = false;
				}
			};

			checkMobile();
			window.addEventListener('resize', checkMobile);

			return () => {
				window.removeEventListener('resize', checkMobile);
			};
		}
	});

	function toggleSidebar() {
		if (isMobile) {
			sidebarMobileOpen = !sidebarMobileOpen;
		} else {
			sidebarCollapsed = !sidebarCollapsed;
		}
	}

	function closeMobileSidebar() {
		sidebarMobileOpen = false;
	}

	function toggleTheme() {
		theme.toggle();
	}

	const isDarkTheme = $derived($theme === 'dark');

	function getInitials(name?: string | null, lastName?: string | null): string {
		const first = name?.charAt(0) || '';
		const last = lastName?.charAt(0) || '';
		return (first + last).toUpperCase() || 'U';
	}

	const sidebarName = $derived(() => {
		if (!page.data.user) return 'Coedula';
		return `${page.data.user.name ?? ''} ${page.data.user.last_name ?? ''}`.trim();
	});

	const sidebarMeta = $derived(
		() => page.data.user?.email || 'Plataforma administrativa educativa'
	);
	const canReadBranches = $derived(can('branches:read'));
	const canReadUsers = $derived(can('users:read'));
	const canReadCycles = $derived(can('cycles:read'));
	const canReadCourses = $derived(can('courses:read'));
	const canReadEvaluations = $derived(can('evaluations:read'));
	const canReadStudents = $derived(can('students:read'));
	const canReadEnrollments = $derived(can('enrollments:read'));
	const canReadAttendance = $derived(can('attendance:read'));
	const canReadDrive = $derived(can('drive:read'));
</script>

<svelte:head>
	<title>{page.data.title ? `${page.data.title} | Coedula` : 'Coedula'}</title>
</svelte:head>

<div
	class="lumi-dashboard-layout"
	class:lumi-sidebar--is-collapsed={sidebarCollapsed && !isMobile}
	class:lumi-sidebar--mobile-open={sidebarMobileOpen && isMobile}
>
	<!-- Mobile Overlay -->
	{#if sidebarMobileOpen && isMobile}
		<div class="lumi-mobile-overlay" onclick={closeMobileSidebar} role="presentation"></div>
	{/if}

	<!-- Sidebar -->
	<Sidebar collapsed={sidebarCollapsed && !isMobile} mobileOpen={sidebarMobileOpen && isMobile}>
		{#snippet header()}
			<div class="lumi-sidebar-profile">
				<Avatar
					text={getInitials(page.data.user?.name, page.data.user?.last_name)}
					src={page.data.user?.photo_url || undefined}
					alt={sidebarName()}
					size={sidebarCollapsed ? 'md' : 'xl'}
					color="primary"
				/>
				{#if !sidebarCollapsed}
					<div class="lumi-sidebar-profile__content">
						<p class="lumi-sidebar-profile__brand">Coedula</p>
						<p class="lumi-sidebar-profile__name">{sidebarName()}</p>
						<p class="lumi-sidebar-profile__meta">{sidebarMeta()}</p>
					</div>
				{/if}
			</div>
		{/snippet}

		<SidebarItem href="/" active={page.url.pathname === '/'} collapsed={sidebarCollapsed}>
			{#snippet icon()}
				<Icon icon="house" size="20px" />
			{/snippet}
			Inicio
		</SidebarItem>

		<Divider />

		{#if canReadBranches}
			<SidebarItem
				href="/branches"
				active={page.url.pathname.startsWith('/branches')}
				collapsed={sidebarCollapsed}
			>
				{#snippet icon()}
					<Icon icon="building" size="20px" />
				{/snippet}
				Sedes
			</SidebarItem>
		{/if}

		{#if canReadUsers}
			<SidebarItem
				href="/users"
				active={page.url.pathname.startsWith('/users')}
				collapsed={sidebarCollapsed}
			>
				{#snippet icon()}
					<Icon icon="users" size="20px" />
				{/snippet}
				Usuarios
			</SidebarItem>
		{/if}

		{#if canReadCycles}
			<SidebarItem
				href="/cycles"
				active={page.url.pathname.startsWith('/cycles')}
				collapsed={sidebarCollapsed}
			>
				{#snippet icon()}
					<Icon icon="bookOpen" size="20px" />
				{/snippet}
				Ciclos
			</SidebarItem>
		{/if}

		{#if canReadCourses}
			<SidebarItem
				href="/courses"
				active={page.url.pathname.startsWith('/courses')}
				collapsed={sidebarCollapsed}
			>
				{#snippet icon()}
					<Icon icon="bookOpenCheck" size="20px" />
				{/snippet}
				Cursos
			</SidebarItem>
		{/if}

		{#if canReadEvaluations}
			<SidebarItem
				href="/evaluations"
				active={page.url.pathname.startsWith('/evaluations')}
				collapsed={sidebarCollapsed}
			>
				{#snippet icon()}
					<Icon icon="clipboardPenLine" size="20px" />
				{/snippet}
				Evaluaciones
			</SidebarItem>
		{/if}

		{#if canReadStudents}
			<SidebarItem
				href="/students"
				active={page.url.pathname.startsWith('/students')}
				collapsed={sidebarCollapsed}
			>
				{#snippet icon()}
					<Icon icon="userPlus" size="20px" />
				{/snippet}
				Alumnos
			</SidebarItem>
		{/if}

		{#if canReadEnrollments}
			<SidebarItem
				href="/enrollments"
				active={page.url.pathname.startsWith('/enrollments')}
				collapsed={sidebarCollapsed}
			>
				{#snippet icon()}
					<Icon icon="userCheck" size="20px" />
				{/snippet}
				Matrículas
			</SidebarItem>
		{/if}

		{#if canReadAttendance}
			<SidebarItem
				href="/attendance"
				active={page.url.pathname.startsWith('/attendance')}
				collapsed={sidebarCollapsed}
			>
				{#snippet icon()}
					<Icon icon="clipboard" size="20px" />
				{/snippet}
				Asistencia
			</SidebarItem>
		{/if}

		{#if canReadDrive}
			<SidebarItem
				href="/drive"
				active={page.url.pathname.startsWith('/drive')}
				collapsed={sidebarCollapsed}
			>
				{#snippet icon()}
					<Icon icon="hardDrive" size="20px" />
				{/snippet}
				Drive
			</SidebarItem>
		{/if}
	</Sidebar>

	<!-- Navbar -->
	<Navbar ontoggle-sidebar={toggleSidebar} ontoggle-theme={toggleTheme}>
		{#snippet title()}
			{page.data.title || 'Coedula'}
		{/snippet}

		{#snippet actions()}
			<Button
				type="ghost"
				size="sm"
				icon={isDarkTheme ? 'sun' : 'moon'}
				aria-label="Toggle theme"
				onclick={toggleTheme}
			/>

			{#if page.data.user}
				{@const user = page.data.user}
				<Dropdown position="bottom-end">
					{#snippet triggerContent()}
						<Avatar
							text={getInitials(user.name, user.last_name)}
							src={user.photo_url || undefined}
							alt={`${user.name ?? ''} ${user.last_name ?? ''}`.trim() || 'Usuario'}
							size="sm"
							color="primary"
						/>
					{/snippet}

					{#snippet content()}
						<div class="lumi-padding--sm lumi-navbar-user-dropdown">
							<div class="lumi-padding--sm lumi-border lumi-border--light">
								<p class="lumi-font--medium lumi-margin--none lumi-text-ellipsis">
									{user.name}
									{user.last_name}
								</p>
								<p class="lumi-text--xs lumi-text--muted lumi-margin-top--2xs lumi-text-ellipsis">
									{user.email}
								</p>
							</div>

							<DropdownItem icon="user" href="/profile">Mi Perfil</DropdownItem>

							<form action="/api/logout" method="POST" class="lumi-margin-top--xs">
								<DropdownItem icon="logOut" color="danger" submit>Cerrar sesión</DropdownItem>
							</form>
						</div>
					{/snippet}
				</Dropdown>
			{/if}
		{/snippet}
	</Navbar>

	<!-- Main Content -->
	<main class="lumi-dashboard__content">
		{@render children()}
	</main>
</div>

<!-- Toast Portal -->
<div class="lumi-toast-portal">
	{#each $toasts as toast (toast.id)}
		<div
			in:fly={{ x: 20, duration: 200, easing: cubicOut }}
			out:fly={{ x: 20, duration: 200, easing: cubicOut }}
		>
			<Notification
				type={toast.type}
				title={toast.title}
				closable
				onclose={() => removeToast(toast.id)}
			/>
		</div>
	{/each}
</div>

<style>
	.lumi-sidebar-profile {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		width: 100%;
	}

	.lumi-sidebar-profile__content {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
	}

	.lumi-sidebar-profile__brand,
	.lumi-sidebar-profile__name,
	.lumi-sidebar-profile__meta {
		margin: 0;
		line-height: var(--lumi-line-height-tight);
	}

	.lumi-sidebar-profile__brand {
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-primary);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.lumi-sidebar-profile__name {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
	}

	.lumi-sidebar-profile__meta {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lumi-navbar-user-dropdown {
		max-width: 220px;
	}

	.lumi-toast-portal {
		position: fixed;
		top: var(--lumi-space-lg);
		right: var(--lumi-space-lg);
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-sm);
		pointer-events: none;
		max-width: 380px;
		width: calc(100vw - 2 * var(--lumi-space-lg));
	}

	.lumi-toast-portal > :global(*) {
		pointer-events: auto;
	}
</style>
