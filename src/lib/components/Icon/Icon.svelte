<script module lang="ts">
	// Shared across all instances — never recreated
	const SIZE_PRESETS = new Set(['xs', 'sm', 'md', 'lg', 'xl', '2xl']);
	const SEMANTIC_COLORS = new Set([
		'primary',
		'secondary',
		'success',
		'warning',
		'danger',
		'info',
		'muted'
	]);
</script>

<script lang="ts">
	import { getIcon } from '$lib/utils/icons';
	import type { IconProps } from './types';

	const {
		icon,
		color = 'inherit',
		size = 'md',
		stroke = 2,
		class: className = '',
		onclick
	}: IconProps = $props();

	// String → registry lookup | Component → passthrough
	const ResolvedIcon = $derived.by(() => {
		if (!icon) return null;
		if (typeof icon === 'string') return getIcon(icon);
		return icon;
	});

	const classes = $derived.by(() => {
		const parts: string[] = ['lumi-icon'];
		if (SIZE_PRESETS.has(size)) parts.push(`lumi-icon--${size}`);
		if (color !== 'inherit' && SEMANTIC_COLORS.has(color)) {
			parts.push(`lumi-icon--color-${color}`);
		}
		if (className) parts.push(className);
		return parts.join(' ');
	});

	const style = $derived.by(() => {
		const entries: string[] = [];
		if (!SIZE_PRESETS.has(size)) {
			entries.push(`width: ${size}`, `height: ${size}`);
		}
		if (color !== 'inherit' && !SEMANTIC_COLORS.has(color)) {
			entries.push(`color: ${color}`);
		}
		return entries.length > 0 ? entries.join('; ') : undefined;
	});
</script>

{#if ResolvedIcon}
	<ResolvedIcon class={classes} {style} strokeWidth={stroke} {onclick} />
{/if}

<style>
	:global(.lumi-icon) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: inherit;
		transition: var(--lumi-transition-all);
		user-select: none;
	}

	:global(.lumi-icon--xs) {
		width: var(--lumi-space-sm);
		height: var(--lumi-space-sm);
	}
	:global(.lumi-icon--sm) {
		width: var(--lumi-space-md);
		height: var(--lumi-space-md);
	}
	:global(.lumi-icon--md) {
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
	}
	:global(.lumi-icon--lg) {
		width: var(--lumi-space-xl);
		height: var(--lumi-space-xl);
	}
	:global(.lumi-icon--xl) {
		width: var(--lumi-space-xxl);
		height: var(--lumi-space-xxl);
	}
	:global(.lumi-icon--2xl) {
		width: var(--lumi-space-3xl);
		height: var(--lumi-space-3xl);
	}

	:global(.lumi-icon--color-primary) {
		color: var(--lumi-color-primary);
	}
	:global(.lumi-icon--color-secondary) {
		color: var(--lumi-color-secondary);
	}
	:global(.lumi-icon--color-success) {
		color: var(--lumi-color-success);
	}
	:global(.lumi-icon--color-warning) {
		color: var(--lumi-color-warning);
	}
	:global(.lumi-icon--color-danger) {
		color: var(--lumi-color-danger);
	}
	:global(.lumi-icon--color-info) {
		color: var(--lumi-color-info);
	}
	:global(.lumi-icon--color-muted) {
		color: var(--lumi-color-text-muted);
	}
</style>
