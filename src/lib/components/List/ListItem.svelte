<script lang="ts">
	import Icon from '../Icon/Icon.svelte';
	import type { ListItemProps } from './types';

	const {
		title,
		subtitle,
		icon,
		disabled = false,
		clickable = false,
		active = false,
		class: className = '',
		onclick,
		children,
		avatar,
		titleSlot,
		subtitleSlot
	}: ListItemProps = $props();

	const classes = $derived(() => {
		return [
			'lumi-list-item',
			disabled && 'lumi-list-item--disabled',
			clickable && 'lumi-list-item--clickable',
			active && 'lumi-list-item--active',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	const handleClick = (event: MouseEvent) => {
		if (!disabled && onclick) {
			onclick(event);
		}
	};
</script>

{#snippet listItemContent()}
	{#if avatar}
		<div class="lumi-list-item__avatar">
			{@render avatar()}
		</div>
	{/if}

	{#if icon}
		<div class="lumi-list-item__icon">
			<Icon {icon} size="var(--list-icon-size, var(--lumi-icon-md))" />
		</div>
	{/if}

	<div class="lumi-list-item__content">
		{#if title || titleSlot}
			<div class="lumi-list-item__title">
				{#if titleSlot}
					{@render titleSlot()}
				{:else}
					{title}
				{/if}
			</div>
		{/if}

		{#if subtitle || subtitleSlot}
			<div class="lumi-list-item__subtitle">
				{#if subtitleSlot}
					{@render subtitleSlot()}
				{:else}
					{subtitle}
				{/if}
			</div>
		{/if}
	</div>

	{#if children}
		<div class="lumi-list-item__actions">
			{@render children()}
		</div>
	{/if}
{/snippet}

{#if clickable}
	<button
		type="button"
		class={classes()}
		onclick={handleClick}
		{disabled}
		aria-current={active ? 'true' : undefined}
	>
		{@render listItemContent()}
	</button>
{:else}
	<div
		class={classes()}
		aria-current={active ? 'true' : undefined}
		aria-disabled={disabled ? 'true' : undefined}
	>
		{@render listItemContent()}
	</div>
{/if}

<style>
	.lumi-list-item {
		--list-item-hover-bg: color-mix(
			in srgb,
			var(--list-accent, var(--lumi-color-primary)) 4%,
			transparent
		);
		--list-item-active-bg: color-mix(
			in srgb,
			var(--list-accent, var(--lumi-color-primary)) 8%,
			transparent
		);
		--list-item-focus-ring: color-mix(
			in srgb,
			var(--list-accent, var(--lumi-color-primary)) 20%,
			transparent
		);
		--list-item-lift: calc(var(--lumi-space-2xs) * -0.25);
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
		min-height: calc(var(--lumi-space-xxl) + var(--lumi-space-2xs));
		padding: var(--list-item-padding, var(--lumi-space-sm) var(--lumi-space-md));
		border-radius: var(--lumi-radius-md);
		transition:
			background-color var(--lumi-duration-fast) var(--lumi-easing-default),
			color var(--lumi-duration-fast) var(--lumi-easing-default),
			transform var(--lumi-duration-fast) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-fast) var(--lumi-easing-default);
		cursor: default;
		background: transparent;
		color: var(--lumi-color-text);
		text-decoration: none;
		width: 100%;
		text-align: left;
		line-height: var(--lumi-line-height-normal);
		font: inherit;
		outline: none;
		border: none;
		user-select: none;
	}

	/* Media */
	.lumi-list-item__avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-space-xl);
		height: var(--lumi-space-xl);
		flex-shrink: 0;
		border-radius: var(--lumi-radius-full);
		overflow: hidden;
	}

	.lumi-list-item__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--list-icon-size, var(--lumi-icon-sm));
		height: var(--list-icon-size, var(--lumi-icon-sm));
		flex-shrink: 0;
		color: var(--lumi-color-text-muted);
		transition: color var(--lumi-duration-fast) var(--lumi-easing-default);
	}

	/* Content */
	.lumi-list-item__content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: var(--lumi-space-2xs);
	}

	.lumi-list-item__title {
		font-size: var(--list-item-title-size, var(--lumi-font-size-base));
		font-weight: var(--lumi-font-weight-medium);
		color: inherit;
		line-height: var(--lumi-line-height-tight);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lumi-list-item__subtitle {
		font-size: var(--list-item-subtitle-size, var(--lumi-font-size-sm));
		color: var(--lumi-color-text-muted);
		line-height: var(--lumi-line-height-normal);
	}

	/* Actions */
	.lumi-list-item__actions {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		margin-left: auto;
	}

	/* States */
	.lumi-list-item--disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.lumi-list-item--clickable {
		cursor: pointer;
	}

	.lumi-list-item--clickable:hover:not(.lumi-list-item--active):not(.lumi-list-item--disabled) {
		background: var(--list-item-hover-bg);
		transform: translateY(var(--list-item-lift));
	}

	.lumi-list-item--clickable:hover .lumi-list-item__icon {
		color: inherit;
	}

	.lumi-list-item--clickable:focus-visible {
		background: var(--list-item-hover-bg);
		box-shadow: 0 0 0 var(--lumi-border-width-thick) var(--list-item-focus-ring);
	}

	.lumi-list-item--clickable:active:not(.lumi-list-item--disabled) {
		transform: none;
	}

	/* Active state */
	.lumi-list-item--active {
		background: var(--list-item-active-bg);
		box-shadow: var(--lumi-shadow-sm);
	}

	.lumi-list-item--active::before {
		content: '';
		position: absolute;
		left: var(--lumi-space-2xs);
		top: var(--lumi-space-xs);
		bottom: var(--lumi-space-xs);
		width: var(--lumi-border-width-thick);
		border-radius: var(--lumi-radius-full);
		background: var(--list-accent, var(--lumi-color-primary));
	}

	.lumi-list-item--clickable.lumi-list-item--active:hover {
		background: var(--list-item-active-bg);
		transform: none;
	}

	.lumi-list-item--active .lumi-list-item__title {
		font-weight: var(--lumi-font-weight-semibold);
	}

	.lumi-list-item--active .lumi-list-item__icon {
		color: var(--list-accent, var(--lumi-color-primary));
	}

	.lumi-list-item--active .lumi-list-item__subtitle {
		color: color-mix(
			in srgb,
			var(--list-accent, var(--lumi-color-primary)) 70%,
			var(--lumi-color-text-muted)
		);
	}
</style>
