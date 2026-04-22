<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import { getIconSize } from '../config';
	import type { InfoItemProps } from './types';

	interface Props extends InfoItemProps {
		children?: Snippet;
		iconSlot?: Snippet;
		labelSlot?: Snippet;
	}

	const {
		layout = 'horizontal',
		icon = '',
		iconColor = 'primary',
		label = '',
		value = '',
		class: className = '',
		children,
		iconSlot,
		labelSlot
	}: Props = $props();

	const iconSize = `${getIconSize('sm')}px`;
	const hasIcon = $derived(!!(icon || iconSlot));

	const classes = $derived(
		['lumi-info-item', `lumi-info-item--${layout}`, className].filter(Boolean).join(' ')
	);

	const styleVars = $derived(`--_accent: var(--lumi-color-${iconColor});`);
</script>

<div class={classes} style={styleVars}>
	{#if hasIcon}
		<div class="lumi-info-item__icon">
			{#if iconSlot}
				{@render iconSlot()}
			{:else}
				<Icon {icon} size={iconSize} />
			{/if}
		</div>
	{/if}

	<div class="lumi-info-item__content">
		<div class="lumi-info-item__label">
			{#if labelSlot}
				{@render labelSlot()}
			{:else}
				{label}
			{/if}
		</div>

		<div class="lumi-info-item__value">
			{#if children}
				{@render children()}
			{:else}
				{value}
			{/if}
		</div>
	</div>
</div>

<style>
	.lumi-info-item {
		--info-shell-bg: color-mix(in srgb, var(--lumi-color-surface) 82%, transparent);
		--info-shell-border: color-mix(in srgb, var(--lumi-color-border) 84%, transparent);
		--info-icon-bg: color-mix(in srgb, var(--_accent, var(--lumi-color-primary)) 10%, transparent);
		--info-icon-border: color-mix(
			in srgb,
			var(--_accent, var(--lumi-color-primary)) 18%,
			var(--lumi-color-border)
		);
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: var(--lumi-space-sm);
		min-width: 0;
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		border: var(--lumi-border-width-thin) solid var(--info-shell-border);
		border-radius: var(--lumi-radius-xl);
		background: var(--info-shell-bg);
		transition:
			border-color var(--lumi-duration-fast) var(--lumi-easing-default),
			background-color var(--lumi-duration-fast) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-fast) var(--lumi-easing-default);
	}

	.lumi-info-item:hover {
		border-color: color-mix(
			in srgb,
			var(--_accent, var(--lumi-color-primary)) 24%,
			var(--info-shell-border)
		);
		box-shadow: 0 0 0 var(--lumi-border-width-thin)
			color-mix(in srgb, var(--_accent, var(--lumi-color-primary)) 10%, transparent);
	}

	.lumi-info-item--horizontal {
		grid-template-columns: auto minmax(0, 1fr);
	}

	.lumi-info-item--vertical {
		grid-template-columns: minmax(0, 1fr);
		align-items: start;
	}

	.lumi-info-item__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(var(--lumi-icon-sm) + var(--lumi-space-lg));
		height: calc(var(--lumi-icon-sm) + var(--lumi-space-lg));
		color: var(--_accent, var(--lumi-color-primary));
		border-radius: var(--lumi-radius-lg);
		border: var(--lumi-border-width-thin) solid var(--info-icon-border);
		background: var(--info-icon-bg);
		box-shadow: inset 0 1px 0 rgba(var(--lumi-color-white-rgb), 0.35);
	}

	.lumi-info-item--vertical .lumi-info-item__icon {
		margin-bottom: var(--lumi-space-2xs);
	}

	.lumi-info-item__content {
		display: grid;
		gap: var(--lumi-space-2xs);
		min-width: 0;
	}

	.lumi-info-item__label {
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text-muted);
		line-height: var(--lumi-line-height-normal);
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.lumi-info-item__value {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-snug);
		min-width: 0;
		overflow-wrap: break-word;
	}

	.lumi-info-item__value :global(*) {
		min-width: 0;
		overflow-wrap: break-word;
	}
</style>
