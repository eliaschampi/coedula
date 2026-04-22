<script lang="ts">
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { CollapseProps } from './types';

	interface Props extends CollapseProps {
		children?: Snippet;
		titleSnippet?: Snippet;
	}

	const {
		title = '',
		defaultOpen = false,
		color = 'primary',
		size = 'md',
		radius = 'md',
		disabled = false,
		class: className = '',
		ontoggle,
		onchange,
		children,
		titleSnippet
	}: Props = $props();

	let isOpen = $derived(defaultOpen);
	const id = `collapse-${Math.random().toString(36).substring(2, 11)}`;

	const collapseClasses = $derived(() => {
		return [
			'lumi-collapse',
			`lumi-collapse--${color}`,
			`lumi-collapse--${size}`,
			`lumi-collapse--radius-${radius}`,
			isOpen && 'lumi-collapse--open',
			disabled && 'lumi-collapse--disabled',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	const triggerClasses = $derived(() => {
		return [
			'lumi-collapse__trigger',
			isOpen && 'lumi-collapse__trigger--open',
			disabled && 'lumi-collapse__trigger--disabled'
		]
			.filter(Boolean)
			.join(' ');
	});

	function toggleCollapse(): void {
		if (disabled) return;

		isOpen = !isOpen;
		ontoggle?.(isOpen);
		onchange?.(isOpen);
	}
</script>

<div class={collapseClasses()}>
	<button
		class={triggerClasses()}
		aria-expanded={isOpen}
		aria-controls="collapse-{id}"
		type="button"
		onclick={toggleCollapse}
	>
		<div class="lumi-collapse__header">
			<div class="lumi-collapse__title">
				{#if titleSnippet}
					{@render titleSnippet()}
				{:else}
					{title}
				{/if}
			</div>
			<div class="lumi-collapse__icon" class:lumi-collapse__icon--rotated={isOpen}>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="6 9 12 15 18 9"></polyline>
				</svg>
			</div>
		</div>
	</button>

	{#if isOpen}
		<div
			id="collapse-{id}"
			class="lumi-collapse__content"
			class:lumi-collapse__content--open={isOpen}
			transition:slide={{ duration: 300, easing: cubicOut }}
		>
			<div class="lumi-collapse__body">
				{#if children}
					{@render children()}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	/* Modern Collapse Component - Clean & Professional */
	.lumi-collapse {
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-lg);
		background: var(--lumi-color-surface);
		overflow: hidden;
		transition:
			border-color var(--lumi-duration-slow) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-slow) var(--lumi-easing-default),
			background-color var(--lumi-duration-slow) var(--lumi-easing-default);
		margin-bottom: var(--lumi-space-sm);
	}

	.lumi-collapse:hover:not(.lumi-collapse--disabled) {
		border-color: var(--lumi-color-border);
		box-shadow: var(--lumi-shadow-sm);
	}

	.lumi-collapse--open {
		border-color: var(--lumi-color-border);
		box-shadow: var(--lumi-shadow-md);
	}

	.lumi-collapse--disabled {
		opacity: var(--lumi-opacity-disabled);
		cursor: not-allowed;
		pointer-events: none;
		background: var(--lumi-color-background-secondary);
	}

	/* Radius variants */
	.lumi-collapse--radius-none {
		border-radius: 0;
	}

	.lumi-collapse--radius-sm {
		border-radius: var(--lumi-radius-sm);
	}

	.lumi-collapse--radius-md {
		border-radius: var(--lumi-radius-md);
	}

	.lumi-collapse--radius-lg {
		border-radius: var(--lumi-radius-lg);
	}

	.lumi-collapse--radius-full {
		border-radius: var(--lumi-radius-2xl);
	}

	/* Trigger button */
	.lumi-collapse__trigger {
		width: 100%;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
		margin: 0;
		transition: background-color var(--lumi-duration-base) var(--lumi-easing-default);
		text-align: left;
	}

	.lumi-collapse__trigger:hover:not(.lumi-collapse__trigger--disabled) {
		background: var(--lumi-color-background-hover);
	}

	.lumi-collapse__trigger:focus-visible {
		outline: none;
		background: var(--lumi-color-background-hover);
		box-shadow: inset 0 0 0 var(--lumi-border-width-thick) var(--lumi-color-primary);
	}

	.lumi-collapse__trigger--disabled {
		cursor: not-allowed;
	}

	/* Header */
	.lumi-collapse__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-md) var(--lumi-space-lg);
		min-height: var(--lumi-control-height-lg);
	}

	/* Title */
	.lumi-collapse__title {
		font-size: var(--lumi-font-size-base);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-normal);
		margin: 0;
	}

	/* Size variants */
	.lumi-collapse--sm .lumi-collapse__header {
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		min-height: var(--lumi-control-height-md);
	}

	.lumi-collapse--sm .lumi-collapse__title {
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-collapse--sm .lumi-collapse__body {
		padding: var(--lumi-space-md);
	}

	.lumi-collapse--md .lumi-collapse__header {
		padding: var(--lumi-space-md) var(--lumi-space-lg);
		min-height: var(--lumi-control-height-lg);
	}

	.lumi-collapse--md .lumi-collapse__title {
		font-size: var(--lumi-font-size-base);
	}

	.lumi-collapse--md .lumi-collapse__body {
		padding: var(--lumi-space-lg);
	}

	.lumi-collapse--lg .lumi-collapse__header {
		padding: var(--lumi-space-lg) var(--lumi-space-xl);
		min-height: var(--lumi-control-height-xl);
	}

	.lumi-collapse--lg .lumi-collapse__title {
		font-size: var(--lumi-font-size-lg);
	}

	.lumi-collapse--lg .lumi-collapse__body {
		padding: var(--lumi-space-xl);
	}

	/* Icon */
	.lumi-collapse__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-icon-md);
		height: var(--lumi-icon-md);
		color: var(--lumi-color-text-muted);
		transition:
			transform var(--lumi-duration-slow) var(--lumi-easing-default),
			color var(--lumi-duration-base) var(--lumi-easing-default);
		flex-shrink: 0;
	}

	.lumi-collapse__icon svg {
		width: 100%;
		height: 100%;
	}

	.lumi-collapse__icon--rotated {
		transform: rotate(180deg);
	}

	/* Color variants for icon */
	.lumi-collapse--primary.lumi-collapse--open .lumi-collapse__icon {
		color: var(--lumi-color-primary);
	}

	.lumi-collapse--success.lumi-collapse--open .lumi-collapse__icon {
		color: var(--lumi-color-success);
	}

	.lumi-collapse--warning.lumi-collapse--open .lumi-collapse__icon {
		color: var(--lumi-color-warning);
	}

	.lumi-collapse--danger.lumi-collapse--open .lumi-collapse__icon {
		color: var(--lumi-color-danger);
	}

	.lumi-collapse--info.lumi-collapse--open .lumi-collapse__icon {
		color: var(--lumi-color-info);
	}

	/* Content */
	.lumi-collapse__content {
		overflow: hidden;
		border-top: var(--lumi-border-width-thin) solid transparent;
		transition: border-color var(--lumi-duration-slow) var(--lumi-easing-default);
	}

	.lumi-collapse__content--open {
		border-top-color: var(--lumi-color-border-light);
	}

	/* Body */
	.lumi-collapse__body {
		padding: var(--lumi-space-lg);
		color: var(--lumi-color-text-muted);
		line-height: var(--lumi-line-height-relaxed);
		font-size: var(--lumi-font-size-sm);
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.lumi-collapse,
		.lumi-collapse__icon {
			transition: none;
		}
	}
</style>
