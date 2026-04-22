<script lang="ts">
	import Icon from '../Icon/Icon.svelte';
	import { getIconSize } from '../config';
	import type { ContextItemProps } from './types';

	const {
		title = '',
		icon = '',
		shortcut = '',
		disabled = false,
		color,
		class: className = '',
		onclick
	}: ContextItemProps = $props();

	const itemClasses = $derived.by(() =>
		['lumi-context-item', disabled && 'lumi-context-item--disabled', className]
			.filter(Boolean)
			.join(' ')
	);

	const iconSizePx = `${getIconSize('sm')}px`;

	const colorStyle = $derived(
		color
			? `--_accent: var(--lumi-color-${color}); --_accent-bg: var(--lumi-color-${color}-bg)`
			: undefined
	);

	function handleClick(event: MouseEvent): void {
		if (!disabled) {
			onclick?.(event);
		}
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleClick(event as unknown as MouseEvent);
		}
	}
</script>

<div
	class={itemClasses}
	style={colorStyle}
	tabindex={disabled ? -1 : 0}
	role="menuitem"
	onclick={handleClick}
	onkeydown={handleKeydown}
>
	{#if icon}
		<div class="lumi-context-item__icon">
			<Icon {icon} size={iconSizePx} />
		</div>
	{/if}

	<span class="lumi-context-item__text">{title}</span>

	{#if shortcut}
		<span class="lumi-context-item__shortcut">{shortcut}</span>
	{/if}
</div>

<style>
	.lumi-context-item {
		--context-item-hover-bg: color-mix(in srgb, var(--lumi-color-primary) 4%, transparent);
		--context-item-focus-ring: color-mix(in srgb, var(--lumi-color-primary) 20%, transparent);
		--context-item-lift: calc(var(--lumi-space-2xs) * -0.25);
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		cursor: pointer;
		transition:
			background-color var(--lumi-duration-fast) var(--lumi-easing-default),
			color var(--lumi-duration-fast) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-fast) var(--lumi-easing-default),
			transform var(--lumi-duration-fast) var(--lumi-easing-default);
		user-select: none;
		color: var(--lumi-color-text);
		font-size: var(--lumi-font-size-sm);
		line-height: var(--lumi-line-height-normal);
		border-radius: var(--lumi-radius-md);
		text-decoration: none;
		outline: none;
	}

	.lumi-context-item:hover:not(.lumi-context-item--disabled) {
		background: var(--_accent-bg, var(--context-item-hover-bg));
		color: var(--lumi-color-text);
		transform: translateY(var(--context-item-lift));
	}

	.lumi-context-item:focus-visible {
		background: var(--context-item-hover-bg);
		box-shadow: 0 0 0 var(--lumi-border-width-thick) var(--context-item-focus-ring);
	}

	.lumi-context-item:active:not(.lumi-context-item--disabled) {
		transform: none;
	}

	.lumi-context-item__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--_accent, var(--lumi-color-text-muted));
		flex-shrink: 0;
		width: var(--lumi-icon-sm);
		height: var(--lumi-icon-sm);
	}

	.lumi-context-item:hover .lumi-context-item__icon {
		color: inherit;
	}

	.lumi-context-item__text {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.lumi-context-item__shortcut {
		margin-left: var(--lumi-space-lg);
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
		opacity: 0.8;
	}

	/* States */
	.lumi-context-item--disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
