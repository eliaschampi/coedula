<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '../Button/Button.svelte';
	import type { NavbarProps } from './types';

	interface Props extends NavbarProps {
		title?: Snippet;
		actions?: Snippet;
		user?: Snippet;
	}

	const {
		class: className = '',
		'ontoggle-sidebar': onToggleSidebar,
		'ontoggle-theme': onToggleTheme,
		title,
		actions,
		user
	}: Props = $props();
</script>

<nav class="lumi-navbar {className}">
	<!-- Left side - Menu toggle and title -->
	<div class="lumi-navbar__left">
		<div class="lumi-navbar__menu-btn">
			<Button
				type="ghost"
				size="md"
				icon="menu"
				aria-label="Toggle sidebar"
				onclick={onToggleSidebar}
			/>
		</div>

		<div class="lumi-navbar__title">
			{#if title}
				{@render title()}
			{:else}
				<span class="lumi-text--lg lumi-font--bold">Dashboard</span>
			{/if}
		</div>
	</div>

	<!-- Right side - Actions -->
	<div class="lumi-navbar__right">
		{#if actions}
			{@render actions()}
		{:else}
			<div class="lumi-navbar__actions">
				<Button
					type="ghost"
					size="sm"
					icon="moon"
					aria-label="Toggle theme"
					onclick={onToggleTheme}
				/>

				{#if user}
					{@render user()}
				{/if}
			</div>
		{/if}
	</div>
</nav>

<style>
	.lumi-navbar {
		grid-area: navbar;
		position: sticky;
		top: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: var(--lumi-navbar-height);
		width: 100%;
		min-width: 0;
		padding: 0 var(--lumi-space-lg);
		background: var(--lumi-color-surface-overlay);
		border-radius: var(--lumi-layout-floating-radius);
		z-index: var(--lumi-z-fixed);
		margin: 0;
		transition: var(--lumi-transition-all);
		isolation: isolate;
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		box-shadow: var(--lumi-shadow-md);
		backdrop-filter: blur(var(--lumi-blur-lg));
		-webkit-backdrop-filter: blur(var(--lumi-blur-lg));
	}

	.lumi-navbar::before {
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
		border-radius: inherit;
		opacity: 0.8;
		z-index: -1;
	}

	.lumi-navbar__left {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
	}

	.lumi-navbar__title {
		color: var(--lumi-color-text);
		white-space: nowrap;
	}

	.lumi-navbar__right {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
	}

	.lumi-navbar__actions {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
	}

	/* Responsive adjustments */
	@media (max-width: 1024px) {
		.lumi-navbar {
			top: 0;
			border-radius: var(--lumi-layout-floating-radius-tablet);
		}
	}

	@media (max-width: 768px) {
		.lumi-navbar {
			padding: 0 var(--lumi-space-md);
			border-radius: var(--lumi-layout-floating-radius-mobile);
		}

		.lumi-navbar__title {
			display: none;
		}
	}
</style>
