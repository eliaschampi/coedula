<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Icon } from '../Icon';
	import type { ChipProps } from './types';
	import { getIconSize } from '../config';

	interface Props extends ChipProps {
		children?: Snippet;
	}

	const {
		color = 'primary',
		size = 'md',
		icon = '',
		closable = false,
		class: className = '',
		children,
		onclose,
		onclick
	}: Props = $props();

	// Computed classes
	const classes = $derived(() => {
		return ['lumi-chip', `lumi-chip--${color}`, `lumi-chip--${size}`, className]
			.filter(Boolean)
			.join(' ');
	});

	// Icon size based on chip size - using centralized config
	const iconSizePx = $derived(() => `${getIconSize(size)}px`);

	// Event handlers
	const handleClose = (event: MouseEvent) => {
		event.stopPropagation();
		if (onclose) onclose(event);
	};

	const handleClick = (event: MouseEvent) => {
		if (onclick) onclick(event);
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (onclick && (event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			onclick(event as unknown as MouseEvent);
		}
	};
</script>

<div
	class={classes()}
	role={onclick ? 'button' : 'status'}
	onclick={handleClick}
	onkeydown={handleKeyDown}
>
	{#if icon}
		<!-- Icon -->
		<span class="lumi-chip__icon">
			<Icon {icon} size={iconSizePx()} />
		</span>
	{/if}

	<!-- Chip text -->
	<span class="lumi-chip__text">
		{#if children}
			{@render children()}
		{/if}
	</span>

	{#if closable}
		<!-- Close button -->
		<button type="button" class="lumi-chip__close" aria-label="Close chip" onclick={handleClose}>
			<Icon icon="x" size="sm" />
		</button>
	{/if}
</div>

<style>
	/* ============================================================================
	 * CHIP COMPONENT - Beautiful & Consistent
	 * ============================================================================ */

	.lumi-chip {
		display: inline-flex;
		align-items: center;
		gap: var(--lumi-space-xs);
		border-radius: var(--lumi-radius-full);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-normal);
		transition:
			background-color var(--lumi-duration-fast) var(--lumi-easing-default),
			color var(--lumi-duration-fast) var(--lumi-easing-default),
			opacity var(--lumi-duration-fast) var(--lumi-easing-default),
			border-color var(--lumi-duration-fast) var(--lumi-easing-default);
		white-space: nowrap;
		cursor: default;
		user-select: none;
	}

	/* Size variants */
	.lumi-chip--sm {
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-chip--md {
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		font-size: var(--lumi-font-size-base);
	}

	/* Color variants - Flat style like button flat */
	.lumi-chip--primary {
		background-color: color-mix(in srgb, var(--lumi-color-primary) 15%, transparent);
		color: var(--lumi-color-primary);
		border: var(--lumi-border-width-thin) solid
			color-mix(in srgb, var(--lumi-color-primary) 20%, transparent);
	}

	.lumi-chip--secondary {
		background-color: color-mix(in srgb, var(--lumi-color-secondary) 15%, transparent);
		color: var(--lumi-color-secondary);
		border: var(--lumi-border-width-thin) solid
			color-mix(in srgb, var(--lumi-color-secondary) 20%, transparent);
	}

	.lumi-chip--success {
		background-color: color-mix(in srgb, var(--lumi-color-success) 15%, transparent);
		color: var(--lumi-color-success);
		border: var(--lumi-border-width-thin) solid
			color-mix(in srgb, var(--lumi-color-success) 20%, transparent);
	}

	.lumi-chip--warning {
		background-color: color-mix(in srgb, var(--lumi-color-warning) 15%, transparent);
		color: var(--lumi-color-warning);
		border: var(--lumi-border-width-thin) solid
			color-mix(in srgb, var(--lumi-color-warning) 20%, transparent);
	}

	.lumi-chip--danger {
		background-color: color-mix(in srgb, var(--lumi-color-danger) 15%, transparent);
		color: var(--lumi-color-danger);
		border: var(--lumi-border-width-thin) solid
			color-mix(in srgb, var(--lumi-color-danger) 20%, transparent);
	}

	.lumi-chip--info {
		background-color: color-mix(in srgb, var(--lumi-color-info) 15%, transparent);
		color: var(--lumi-color-info);
		border: var(--lumi-border-width-thin) solid
			color-mix(in srgb, var(--lumi-color-info) 20%, transparent);
	}

	/* Icon styling */
	.lumi-chip__icon {
		flex-shrink: 0;
		color: currentColor;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Text styling */
	.lumi-chip__text {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Close button styling */
	.lumi-chip__close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-space-md);
		height: var(--lumi-space-md);
		padding: 0;
		margin-left: var(--lumi-space-xs);
		background: transparent;
		border: none;
		border-radius: var(--lumi-radius-full);
		color: currentColor;
		cursor: pointer;
		transition:
			opacity var(--lumi-duration-fast) var(--lumi-easing-default),
			background-color var(--lumi-duration-fast) var(--lumi-easing-default),
			transform var(--lumi-duration-fast) var(--lumi-easing-default);
		flex-shrink: 0;
		opacity: 0.7;
	}

	.lumi-chip__close:hover {
		opacity: 1;
		background: color-mix(in srgb, currentColor 15%, transparent);
		transform: scale(1.1);
	}

	.lumi-chip__close:focus-visible {
		outline: var(--lumi-border-width-thick) solid currentColor;
		outline-offset: var(--lumi-space-2xs);
	}

	/* Hover effects */
	.lumi-chip:hover {
		opacity: var(--lumi-opacity-hover);
	}

	/* Focus styles */
	.lumi-chip:focus-visible {
		outline: var(--lumi-border-width-thick) solid currentColor;
		outline-offset: var(--lumi-space-2xs);
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.lumi-chip,
		.lumi-chip__close {
			transition: none;
		}

		.lumi-chip:hover,
		.lumi-chip__close:hover {
			transform: none;
		}
	}
</style>
