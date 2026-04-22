<script lang="ts">
	import type { Snippet } from 'svelte';
	import Title from '../Title/Title.svelte';
	import type { PageHeaderProps } from './types';

	interface Props extends PageHeaderProps {
		actions?: Snippet;
	}

	const {
		title = '',
		subtitle = '',
		icon = '',
		size = 'lg',
		color = 'text',
		class: className = '',
		actions
	}: Props = $props();

	const classes = $derived(() => {
		return ['lumi-page-header', actions && 'lumi-page-header--with-actions', className]
			.filter(Boolean)
			.join(' ');
	});
</script>

<header class={classes()}>
	<div class="lumi-page-header__title">
		<Title {title} {subtitle} {icon} {size} {color} />
	</div>

	{#if actions}
		<div class="lumi-page-header__actions" role="group" aria-label="Page actions">
			{@render actions()}
		</div>
	{/if}
</header>

<style>
	.lumi-page-header {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-lg);
		border-radius: var(--lumi-radius-2xl);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		background: var(--lumi-color-surface-overlay);
		box-shadow: var(--lumi-shadow-md);
		backdrop-filter: blur(var(--lumi-blur-md));
		-webkit-backdrop-filter: blur(var(--lumi-blur-md));
		overflow: hidden;
		isolation: isolate;
		transition: var(--lumi-transition-all);
	}

	.lumi-page-header::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(
				circle at top left,
				transparent 60%,
				color-mix(in srgb, var(--lumi-color-primary-bg) 70%, transparent)
			),
			linear-gradient(
				140deg,
				var(--lumi-color-surface-overlay),
				color-mix(in srgb, var(--lumi-color-surface) 80%, transparent)
			);
		z-index: -2;
	}

	.lumi-page-header::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image: linear-gradient(
			120deg,
			transparent 0%,
			rgba(var(--lumi-color-primary-rgb), 0.08) 45%,
			transparent 100%
		);
		opacity: 0.8;
		z-index: -1;
		pointer-events: none;
	}

	.lumi-page-header__title {
		position: relative;
		z-index: var(--lumi-z-base);
		min-width: 0;
	}

	.lumi-page-header__actions {
		position: relative;
		z-index: var(--lumi-z-base);
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		flex-shrink: 0;
		flex-wrap: wrap;
	}

	@media (max-width: 768px) {
		.lumi-page-header {
			padding: var(--lumi-space-md);
			border-radius: var(--lumi-radius-xl);
			grid-template-columns: 1fr;
		}

		.lumi-page-header__actions {
			width: 100%;
			justify-content: flex-end;
			gap: var(--lumi-space-xs);
		}
	}
</style>
