<script lang="ts">
	import type { Snippet } from 'svelte';
	import { LUMI_CONFIG } from '../config';
	import type { LoadingProps } from './types';

	interface Props extends LoadingProps {
		children?: Snippet;
	}

	const {
		size = 'md',
		color = 'primary',
		text = '',
		class: className = '',
		children
	}: Props = $props();

	const transitionDuration = `${LUMI_CONFIG.transitions.base}ms`;

	const classes = $derived(() => {
		const baseClasses = ['lumi-loading', `lumi-loading--${size}`, `lumi-loading--${color}`];

		if (text || children) baseClasses.push('lumi-loading--with-text');
		if (className) baseClasses.push(className);

		return baseClasses.join(' ');
	});

	const styleVars = $derived(() => `--loading-transition-duration: ${transitionDuration};`);
	const ariaLabel = $derived(() => text || 'Loading');
</script>

<div
	class={classes()}
	style={styleVars()}
	role="status"
	aria-live="polite"
	aria-label={ariaLabel()}
>
	<div class="lumi-loading__indicator" aria-hidden="true">
		<span class="lumi-loading__ring"></span>
		<span class="lumi-loading__core"></span>
	</div>

	{#if text || children}
		<div class="lumi-loading__text">
			{#if children}
				{@render children()}
			{:else}
				{text}
			{/if}
		</div>
	{/if}
</div>

<style>
	.lumi-loading {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-md);
		font-family: var(--lumi-font-family-sans);
		color: var(--lumi-color-primary);
		transition:
			color var(--loading-transition-duration) var(--lumi-easing-default),
			transform var(--loading-transition-duration) var(--lumi-easing-default);
		--loading-ring-size: var(--lumi-space-3xl);
		--loading-core-size: var(--lumi-space-lg);
	}

	.lumi-loading__indicator {
		position: relative;
		display: grid;
		place-items: center;
		inline-size: var(--loading-ring-size);
		block-size: var(--loading-ring-size);
	}

	.lumi-loading__ring {
		position: absolute;
		inset: 0;
		border-radius: var(--lumi-radius-full);
		border: var(--lumi-border-width-thick) solid color-mix(in srgb, currentColor 18%, transparent);
		border-top-color: currentColor;
		animation: lumi-loading-spin var(--lumi-duration-slower) linear infinite;
	}

	.lumi-loading__core {
		inline-size: var(--loading-core-size);
		block-size: var(--loading-core-size);
		border-radius: var(--lumi-radius-full);
		background: currentColor;
		box-shadow: 0 0 var(--lumi-space-md) color-mix(in srgb, currentColor 35%, transparent);
		animation: lumi-loading-pulse var(--lumi-duration-base) var(--lumi-easing-in-out) infinite;
	}

	.lumi-loading__text {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text-muted);
		text-align: center;
		line-height: var(--lumi-line-height-normal);
	}

	.lumi-loading--sm {
		--loading-ring-size: var(--lumi-space-xxl);
		--loading-core-size: var(--lumi-space-sm);
		gap: var(--lumi-space-sm);
	}

	.lumi-loading--lg {
		--loading-ring-size: var(--lumi-space-4xl);
		--loading-core-size: var(--lumi-space-xl);
		gap: var(--lumi-space-lg);
	}

	.lumi-loading--primary {
		color: var(--lumi-color-primary);
	}

	.lumi-loading--secondary {
		color: var(--lumi-color-secondary);
	}

	.lumi-loading--success {
		color: var(--lumi-color-success);
	}

	.lumi-loading--warning {
		color: var(--lumi-color-warning);
	}

	.lumi-loading--danger {
		color: var(--lumi-color-danger);
	}

	.lumi-loading--info {
		color: var(--lumi-color-info);
	}

	@keyframes lumi-loading-spin {
		from {
			transform: rotate(0deg);
		}

		to {
			transform: rotate(360deg);
		}
	}

	@keyframes lumi-loading-pulse {
		0%,
		100% {
			transform: scale(0.78);
			opacity: 0.65;
		}

		50% {
			transform: scale(1);
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-loading,
		.lumi-loading__ring,
		.lumi-loading__core {
			transition: none;
			animation: none;
		}
	}
</style>
