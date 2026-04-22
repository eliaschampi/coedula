<script lang="ts">
	import Icon from '../Icon/Icon.svelte';
	import type { IconBadgeProps } from './types';

	const { icon, color = 'primary', size = 'md', class: className = '' }: IconBadgeProps = $props();

	const classes = $derived(
		['lumi-icon-badge', `lumi-icon-badge--${size}`, `lumi-icon-badge--${color}`, className]
			.filter(Boolean)
			.join(' ')
	);
</script>

<div class={classes}>
	<Icon {icon} {size} {color} />
</div>

<style>
	.lumi-icon-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--lumi-radius-xl);
		transition: var(--lumi-transition-all);
	}

	.lumi-icon-badge--sm {
		width: var(--lumi-space-xl);
		height: var(--lumi-space-xl);
	}

	.lumi-icon-badge--md {
		width: var(--lumi-space-2xl);
		height: var(--lumi-space-2xl);
	}

	.lumi-icon-badge--lg {
		width: var(--lumi-space-3xl);
		height: var(--lumi-space-3xl);
	}

	.lumi-icon-badge--xl {
		width: var(--lumi-space-4xl);
		height: var(--lumi-space-4xl);
	}

	.lumi-icon-badge--primary {
		background: color-mix(in srgb, var(--lumi-color-primary) 15%, transparent);
	}

	.lumi-icon-badge--secondary {
		background: color-mix(in srgb, var(--lumi-color-secondary) 15%, transparent);
	}

	.lumi-icon-badge--success {
		background: color-mix(in srgb, var(--lumi-color-success) 15%, transparent);
	}

	.lumi-icon-badge--info {
		background: color-mix(in srgb, var(--lumi-color-info) 15%, transparent);
	}

	.lumi-icon-badge--warning {
		background: color-mix(in srgb, var(--lumi-color-warning) 15%, transparent);
	}

	.lumi-icon-badge--danger {
		background: color-mix(in srgb, var(--lumi-color-danger) 15%, transparent);
	}
</style>
