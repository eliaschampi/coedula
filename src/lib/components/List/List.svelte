<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ListProps } from './types';

	interface Props extends ListProps {
		children?: Snippet;
	}

	const { size = 'md', color, disabled = false, class: className = '', children }: Props = $props();

	const classes = $derived(() => {
		return [
			'lumi-list',
			`lumi-list--${size}`,
			color && `lumi-list--${color}`,
			disabled && 'lumi-list--disabled',
			className
		]
			.filter(Boolean)
			.join(' ');
	});
</script>

<div class={classes()} role="list">
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.lumi-list {
		--list-accent: var(--lumi-color-primary);
		--list-hover-border: color-mix(
			in srgb,
			var(--list-accent) 20%,
			var(--lumi-color-border-strong)
		);
		--list-border: color-mix(
			in srgb,
			var(--lumi-color-border) 72%,
			var(--lumi-color-border-strong) 28%
		);
		--list-shell-bg: color-mix(
			in srgb,
			var(--lumi-color-surface) 62%,
			var(--lumi-color-background-hover) 38%
		);
		--list-item-padding: var(--lumi-space-sm) var(--lumi-space-md);
		--list-item-title-size: var(--lumi-font-size-sm);
		--list-item-subtitle-size: var(--lumi-font-size-xs);
		--list-icon-size: var(--lumi-icon-sm);
		--list-scroll-track: var(--lumi-color-background);
		--list-scroll-thumb: var(--lumi-color-border-strong);
		width: 100%;
		font-family: var(--lumi-font-family-sans);
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
		padding: var(--lumi-space-xs);
		background: var(--list-shell-bg);
		border: var(--lumi-border-width-thin) solid var(--list-border);
		border-radius: var(--lumi-radius-2xl);
		box-shadow: var(--lumi-shadow-sm);
		transition:
			border-color var(--lumi-duration-fast) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-fast) var(--lumi-easing-default);
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: thin;
		scrollbar-color: var(--list-scroll-thumb) var(--list-scroll-track);
	}

	.lumi-list:hover:not(.lumi-list--disabled) {
		border-color: var(--list-hover-border);
		box-shadow: var(--lumi-shadow-md);
	}

	/* Size variants */
	.lumi-list--sm {
		--list-item-padding: var(--lumi-space-xs) var(--lumi-space-sm);
		--list-item-title-size: var(--lumi-font-size-sm);
		--list-item-subtitle-size: var(--lumi-font-size-xs);
		--list-icon-size: var(--lumi-icon-xs);
	}

	.lumi-list--md {
		--list-item-padding: var(--lumi-space-sm) var(--lumi-space-md);
		--list-item-title-size: var(--lumi-font-size-sm);
		--list-item-subtitle-size: var(--lumi-font-size-xs);
		--list-icon-size: var(--lumi-icon-sm);
	}

	.lumi-list--primary {
		--list-accent: var(--lumi-color-primary);
	}

	.lumi-list--secondary {
		--list-accent: var(--lumi-color-secondary);
	}

	.lumi-list--success {
		--list-accent: var(--lumi-color-success);
	}

	.lumi-list--warning {
		--list-accent: var(--lumi-color-warning);
	}

	.lumi-list--danger {
		--list-accent: var(--lumi-color-danger);
	}

	.lumi-list--info {
		--list-accent: var(--lumi-color-info);
	}

	.lumi-list::-webkit-scrollbar {
		width: var(--lumi-space-2xs);
	}

	.lumi-list::-webkit-scrollbar-track {
		background: var(--list-scroll-track);
		border-radius: var(--lumi-radius-full);
	}

	.lumi-list::-webkit-scrollbar-thumb {
		background: var(--list-scroll-thumb);
		border-radius: var(--lumi-radius-full);
	}

	.lumi-list::-webkit-scrollbar-thumb:hover {
		background: var(--lumi-color-text-muted);
	}

	/* Disabled state */
	.lumi-list--disabled {
		opacity: var(--lumi-opacity-disabled);
		filter: saturate(0.8);
		pointer-events: none;
	}
</style>
