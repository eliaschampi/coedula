<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ButtonProps } from './types';
	import Icon from '../Icon/Icon.svelte';
	import { getIconSize } from '../config';

	interface Props extends ButtonProps {
		children?: Snippet;
		onclick?: (event: MouseEvent) => void;
		'aria-label'?: string;
	}

	const {
		type = 'filled',
		color = 'primary',
		size = 'md',
		icon,
		iconAfter = false,
		radius = false,
		loading = false,
		disabled = false,
		button = 'button',
		'aria-label': ariaLabel = '',
		class: className,
		onclick,
		children
	}: Props = $props();

	const iconPixelSize = $derived.by(() => {
		const sizeOffsets: Record<NonNullable<Props['size']>, number> = {
			sm: -2,
			md: -4,
			lg: -2,
			xl: -4
		};
		return getIconSize(size as import('../config').LumiSize) + (sizeOffsets[size] ?? 0);
	});

	const buttonClasses = $derived.by(() => {
		const classes = ['lumi-button', `lumi-button--${type}`, `lumi-button--${size}`];

		if (radius) classes.push('lumi-button--radius');
		if (icon && !children) classes.push('lumi-button--icon-only');
		if (loading) classes.push('lumi-button--loading');
		if (className) classes.push(className);

		return classes.join(' ');
	});

	// Map colors to CSS variables dynamically
	const styleVars = $derived.by(() => {
		const colorVar = `var(--lumi-color-${color})`;
		const colorRgb = `var(--lumi-color-${color}-rgb)`;
		return `--btn-color: ${colorVar}; --btn-color-rgb: ${colorRgb};`;
	});

	function handleClick(event: MouseEvent) {
		if (!disabled && !loading && onclick) {
			onclick(event);
		}
	}
</script>

<button
	class={buttonClasses}
	type={button}
	disabled={disabled || loading}
	aria-label={ariaLabel || (icon && !children ? icon : undefined)}
	onclick={handleClick}
	style={styleVars}
>
	{#if loading}
		<span class="lumi-button__spinner"></span>
	{/if}

	{#if icon && !iconAfter && !loading}
		<span class="lumi-button__icon">
			<Icon {icon} size={`${iconPixelSize}px`} />
		</span>
	{/if}

	{#if children}
		<span class="lumi-button__text">
			{@render children()}
		</span>
	{/if}

	{#if icon && iconAfter && !loading}
		<span class="lumi-button__icon">
			<Icon {icon} size={`${iconPixelSize}px`} />
		</span>
	{/if}
</button>

<style>
	/* ========================================================================== */
	/* LUMI BUTTON - Premium 2026 Design */
	/* ========================================================================== */

	.lumi-button {
		/* Base Layout */
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-xs);

		/* Typography */
		font-family: var(--lumi-font-family-sans);
		font-weight: var(--lumi-font-weight-semibold);
		line-height: var(--lumi-line-height-none);
		text-decoration: none;
		white-space: nowrap;
		letter-spacing: 0.01em;

		/* Visual */
		border: var(--lumi-border-width-base) solid transparent;
		border-radius: var(--lumi-radius-md);
		cursor: pointer;
		user-select: none;
		position: relative;
		overflow: hidden;
		outline: none;

		transition:
			background-color var(--lumi-duration-fast) var(--lumi-easing-default),
			border-color var(--lumi-duration-fast) var(--lumi-easing-default),
			color var(--lumi-duration-fast) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-fast) var(--lumi-easing-default),
			transform var(--lumi-duration-fast) var(--lumi-easing-default);
	}

	/* Focus visible - Modern ring with glow */
	.lumi-button:focus-visible {
		outline: none;
		box-shadow:
			0 0 0 var(--lumi-border-width-thick) var(--lumi-color-background),
			0 0 0 calc(var(--lumi-border-width-thick) * 2) var(--btn-color),
			0 0 var(--lumi-space-xl) color-mix(in srgb, var(--btn-color) 30%, transparent);
	}

	/* Disabled - Elegant fade */
	.lumi-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
		transform: none;
	}

	/* Hover lift effect */
	.lumi-button:hover:not(:disabled) {
		transform: translateY(calc(var(--lumi-space-2xs) * -1));
	}

	/* Active press effect */
	.lumi-button:active:not(:disabled) {
		transform: translateY(0) scale(0.98);
	}

	/* ========================================================================== */
	/* SIZE VARIANTS */
	/* ========================================================================== */

	.lumi-button--sm {
		height: var(--lumi-control-height-sm);
		padding: 0 var(--lumi-space-md);
		font-size: var(--lumi-font-size-xs);
		border-radius: var(--lumi-radius-md);
	}

	.lumi-button--md {
		height: var(--lumi-control-height-md);
		padding: 0 var(--lumi-space-lg);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-button--lg {
		height: var(--lumi-control-height-lg);
		padding: 0 var(--lumi-space-xl);
		font-size: var(--lumi-font-size-base);
	}

	.lumi-button--xl {
		height: var(--lumi-control-height-xl);
		padding: 0 var(--lumi-space-xxl);
		font-size: var(--lumi-font-size-lg);
	}

	/* ========================================================================== */
	/* SHAPE VARIANTS */
	/* ========================================================================== */

	.lumi-button--radius {
		border-radius: var(--lumi-radius-full);
	}

	/* Icon only - Square aspect ratio */
	.lumi-button--icon-only {
		padding: 0;
		aspect-ratio: 1;
	}
	.lumi-button--icon-only.lumi-button--sm {
		width: var(--lumi-control-height-sm);
	}
	.lumi-button--icon-only.lumi-button--md {
		width: var(--lumi-control-height-md);
	}
	.lumi-button--icon-only.lumi-button--lg {
		width: var(--lumi-control-height-lg);
	}
	.lumi-button--icon-only.lumi-button--xl {
		width: var(--lumi-control-height-xl);
	}

	/* ========================================================================== */
	/* TYPE VARIANTS - Premium 2026 Styling */
	/* ========================================================================== */

	/* FILLED - Bold with colored glow */
	.lumi-button--filled {
		background: var(--btn-color);
		color: var(--lumi-color-white);
		border-color: transparent;
		box-shadow: var(--lumi-shadow-sm);
	}

	.lumi-button--filled:hover:not(:disabled) {
		background: color-mix(in srgb, var(--btn-color) 88%, black);
		box-shadow: var(--lumi-shadow-md);
	}

	.lumi-button--filled:active:not(:disabled) {
		box-shadow: var(--lumi-shadow-sm);
	}

	/* BORDER - Glass morphism outline */
	.lumi-button--border {
		background: rgba(var(--btn-color-rgb), 0.04);
		color: var(--btn-color);
		border-color: rgba(var(--btn-color-rgb), 0.3);
		backdrop-filter: blur(var(--lumi-blur-sm));
	}

	.lumi-button--border:hover:not(:disabled) {
		background: rgba(var(--btn-color-rgb), 0.1);
		border-color: rgba(var(--btn-color-rgb), 0.5);
		box-shadow: var(--lumi-shadow-sm);
	}

	.lumi-button--border:active:not(:disabled) {
		background: rgba(var(--btn-color-rgb), 0.15);
	}

	/* FLAT - Subtle ghost with glass effect */
	.lumi-button--flat {
		background: color-mix(in srgb, var(--btn-color) 7%, transparent);
		color: var(--btn-color);
		border-color: color-mix(in srgb, var(--btn-color) 16%, transparent);
	}

	.lumi-button--flat:hover:not(:disabled) {
		background: rgba(var(--btn-color-rgb), 0.12);
		border-color: rgba(var(--btn-color-rgb), 0.26);
		box-shadow: var(--lumi-shadow-sm);
	}

	.lumi-button--flat:active:not(:disabled) {
		background: rgba(var(--btn-color-rgb), 0.18);
	}

	/* GHOST - Transparent base with elegant hover feedback */
	.lumi-button--ghost {
		background: transparent;
		color: var(--btn-color);
		border-color: transparent;
		box-shadow: none;
	}

	.lumi-button--ghost:hover:not(:disabled) {
		background: color-mix(in srgb, var(--btn-color) 10%, transparent);
		border-color: color-mix(in srgb, var(--btn-color) 18%, transparent);
		box-shadow: var(--lumi-shadow-sm);
	}

	.lumi-button--ghost:active:not(:disabled) {
		background: color-mix(in srgb, var(--btn-color) 16%, transparent);
		border-color: color-mix(in srgb, var(--btn-color) 22%, transparent);
	}

	/* GRADIENT - Modern premium depth */
	.lumi-button--gradient {
		background: linear-gradient(
			155deg,
			color-mix(in srgb, var(--btn-color) 76%, var(--lumi-color-white)) 0%,
			var(--btn-color) 52%,
			color-mix(in srgb, var(--btn-color) 74%, black) 100%
		);
		color: var(--lumi-color-white);
		border-color: color-mix(in srgb, var(--btn-color) 45%, transparent);
		box-shadow:
			inset 0 var(--lumi-border-width-thin) 0
				color-mix(in srgb, var(--lumi-color-white) 28%, transparent),
			var(--lumi-shadow-md);
	}

	.lumi-button--gradient:hover:not(:disabled) {
		background: linear-gradient(
			155deg,
			color-mix(in srgb, var(--btn-color) 82%, var(--lumi-color-white)) 0%,
			color-mix(in srgb, var(--btn-color) 92%, black) 55%,
			color-mix(in srgb, var(--btn-color) 68%, black) 100%
		);
		border-color: color-mix(in srgb, var(--btn-color) 60%, transparent);
		box-shadow:
			inset 0 var(--lumi-border-width-thin) 0
				color-mix(in srgb, var(--lumi-color-white) 34%, transparent),
			var(--lumi-shadow-lg);
	}

	.lumi-button--gradient:active:not(:disabled) {
		background: linear-gradient(
			155deg,
			color-mix(in srgb, var(--btn-color) 72%, var(--lumi-color-white)) 0%,
			color-mix(in srgb, var(--btn-color) 88%, black) 54%,
			color-mix(in srgb, var(--btn-color) 64%, black) 100%
		);
		box-shadow:
			inset 0 var(--lumi-border-width-thin) 0
				color-mix(in srgb, var(--lumi-color-white) 24%, transparent),
			var(--lumi-shadow-md);
	}

	/* ========================================================================== */
	/* LOADING STATE */
	/* ========================================================================== */

	.lumi-button__spinner {
		position: absolute;
		width: 1.2em;
		height: 1.2em;
		border: var(--lumi-border-width-thick) solid currentColor;
		border-right-color: transparent;
		border-radius: var(--lumi-radius-full);
		animation: lumi-spin var(--lumi-duration-slower) linear infinite;
	}

	.lumi-button--loading {
		color: transparent !important;
		pointer-events: none;
	}

	.lumi-button--loading .lumi-button__spinner {
		color: var(--lumi-color-text);
	}

	.lumi-button--filled.lumi-button--loading .lumi-button__spinner,
	.lumi-button--gradient.lumi-button--loading .lumi-button__spinner {
		color: var(--lumi-color-white);
	}

	.lumi-button--border.lumi-button--loading .lumi-button__spinner,
	.lumi-button--flat.lumi-button--loading .lumi-button__spinner,
	.lumi-button--ghost.lumi-button--loading .lumi-button__spinner {
		color: var(--btn-color);
	}

	@keyframes lumi-spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ========================================================================== */
	/* INNER ELEMENTS */
	/* ========================================================================== */

	.lumi-button__icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.lumi-button__text {
		display: inline-flex;
		align-items: center;
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-button,
		.lumi-button__spinner {
			transition: none;
			animation: none;
		}
	}
</style>
