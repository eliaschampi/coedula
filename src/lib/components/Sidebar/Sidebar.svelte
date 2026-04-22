<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SidebarProps } from './types';

	interface Props extends SidebarProps {
		children?: Snippet;
		header?: Snippet;
	}

	const {
		collapsed = false,
		mobileOpen = false,
		headerImage = '',
		class: className = '',
		children,
		header
	}: Props = $props();

	const sidebarClasses = $derived.by(() => {
		return [
			'lumi-sidebar',
			collapsed && 'lumi-sidebar--collapsed',
			mobileOpen && 'lumi-sidebar--mobile-open',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	const sidebarStyleVars = $derived.by(() => {
		if (!headerImage) return undefined;
		return `--lumi-sidebar-header-image: url('${headerImage}');`;
	});
</script>

<aside class={sidebarClasses} style={sidebarStyleVars} role="navigation" aria-label="Sidebar">
	{#if header}
		<header class="lumi-sidebar__header">
			<div class="lumi-sidebar__header-content">
				{@render header()}
			</div>
		</header>
	{/if}

	<nav class="lumi-sidebar__body">
		<div class="lumi-sidebar__items">
			{#if children}
				{@render children()}
			{/if}
		</div>
	</nav>
</aside>

<style>
	.lumi-sidebar {
		grid-area: sidebar;
		position: sticky;
		top: 0;
		align-self: start;
		display: flex;
		flex-direction: column;
		width: var(--lumi-sidebar-width);
		height: calc(100dvh - (var(--lumi-layout-shell-padding) * 2));
		margin: 0;
		background: var(--lumi-color-surface-overlay);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-layout-floating-radius);
		box-shadow: var(--lumi-shadow-md);
		backdrop-filter: blur(var(--lumi-blur-md));
		-webkit-backdrop-filter: blur(var(--lumi-blur-md));
		isolation: isolate;
		transition:
			width var(--lumi-duration-base) var(--lumi-easing-default),
			transform var(--lumi-duration-base) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-base) var(--lumi-easing-default);
		overflow: hidden;
		z-index: var(--lumi-z-sidebar);
	}

	.lumi-sidebar::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			linear-gradient(
				120deg,
				rgba(var(--lumi-color-primary-rgb), 0.08),
				rgba(var(--lumi-color-primary-rgb), 0.01)
			),
			var(--lumi-color-surface-overlay);
		opacity: 0.8;
		z-index: -1;
	}

	.lumi-sidebar--collapsed {
		width: var(--lumi-sidebar-width-collapsed);
	}

	.lumi-sidebar__header {
		position: relative;
		padding: var(--lumi-space-md);
		flex-shrink: 0;
		min-height: calc(var(--lumi-space-5xl) + var(--lumi-space-3xl));
		display: flex;
		align-items: flex-end;
		background-image: var(--lumi-sidebar-header-image);
		background-size: cover;
		background-position: center;
	}

	.lumi-sidebar__header::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			linear-gradient(
				180deg,
				rgba(var(--lumi-color-background-rgb), 0.35) 0%,
				var(--lumi-color-surface) 100%
			),
			rgba(var(--lumi-color-background-rgb), 0.45);
	}

	.lumi-sidebar__header-content {
		position: relative;
		z-index: 1;
		width: 100%;
	}

	.lumi-sidebar--collapsed .lumi-sidebar__header {
		min-height: var(--lumi-sidebar-width-collapsed);
		padding: var(--lumi-space-sm);
		align-items: center;
	}

	.lumi-sidebar__body {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: var(--lumi-space-md);
	}

	/* Custom scrollbar */
	.lumi-sidebar__body::-webkit-scrollbar {
		width: var(--lumi-space-2xs);
	}

	.lumi-sidebar__body::-webkit-scrollbar-track {
		background: transparent;
	}

	.lumi-sidebar__body::-webkit-scrollbar-thumb {
		background: transparent;
		border-radius: var(--lumi-radius-full);
	}

	.lumi-sidebar:hover .lumi-sidebar__body::-webkit-scrollbar-thumb {
		background: var(--lumi-color-border);
	}

	.lumi-sidebar__items {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
	}

	/* Mobile responsive behavior */
	@media (max-width: 1024px) {
		.lumi-sidebar {
			position: fixed;
			top: var(--lumi-sidebar-mobile-offset);
			left: var(--lumi-sidebar-mobile-offset);
			margin: 0;
			height: var(--lumi-sidebar-mobile-height);
			transform: translateX(var(--lumi-sidebar-mobile-closed-shift));
			width: var(--lumi-sidebar-mobile-width);
			border-radius: var(--lumi-layout-floating-radius-tablet);
			box-shadow: var(--lumi-shadow-lg);
			border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		}

		.lumi-sidebar.lumi-sidebar--mobile-open {
			transform: translateX(0);
		}

		.lumi-sidebar--collapsed {
			width: var(--lumi-sidebar-mobile-width); /* No collapsed state on mobile */
		}
	}

	@media (max-width: 768px) {
		.lumi-sidebar {
			top: var(--lumi-layout-shell-padding-mobile);
			left: var(--lumi-layout-shell-padding-mobile);
			height: calc(100dvh - (var(--lumi-layout-shell-padding-mobile) * 2));
			width: min(
				var(--lumi-sidebar-width-mobile),
				calc(100vw - (var(--lumi-layout-shell-padding-mobile) * 2))
			);
			transform: translateX(calc(-100% - var(--lumi-layout-shell-padding-mobile)));
			border-radius: var(--lumi-layout-floating-radius-mobile);
		}

		.lumi-sidebar.lumi-sidebar--mobile-open {
			transform: translateX(0);
		}

		.lumi-sidebar--collapsed {
			width: min(
				var(--lumi-sidebar-width-mobile),
				calc(100vw - (var(--lumi-layout-shell-padding-mobile) * 2))
			);
		}
	}
</style>
