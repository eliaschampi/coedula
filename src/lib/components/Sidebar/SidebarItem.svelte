<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import type { SidebarItemProps } from './types';

	interface Props extends SidebarItemProps {
		children?: Snippet;
		icon?: Snippet;
	}

	const {
		active = false,
		collapsed = false,
		href = undefined,
		class: className = '',
		onclick,
		children,
		icon
	}: Props = $props();

	const itemClasses = $derived(() => {
		return [
			'lumi-sidebar-item',
			active && 'lumi-sidebar-item--active',
			collapsed && 'lumi-sidebar-item--collapsed',
			className
		]
			.filter(Boolean)
			.join(' ');
	});
</script>

{#if href}
	<a href={resolve(href as '/')} class={itemClasses()} {onclick}>
		{#if icon}
			<span class="lumi-sidebar-item__icon">
				{@render icon()}
			</span>
		{/if}
		{#if !collapsed}
			<span class="lumi-sidebar-item__text">
				{#if children}
					{@render children()}
				{/if}
			</span>
		{/if}
	</a>
{:else}
	<button type="button" class={itemClasses()} {onclick}>
		{#if icon}
			<span class="lumi-sidebar-item__icon">
				{@render icon()}
			</span>
		{/if}
		{#if !collapsed}
			<span class="lumi-sidebar-item__text">
				{#if children}
					{@render children()}
				{/if}
			</span>
		{/if}
	</button>
{/if}

<style>
	.lumi-sidebar-item {
		--sidebar-item-hover-bg: color-mix(in srgb, var(--lumi-color-primary) 4%, transparent);
		--sidebar-item-active-bg: color-mix(in srgb, var(--lumi-color-primary) 8%, transparent);
		--sidebar-item-focus-ring: color-mix(in srgb, var(--lumi-color-primary) 20%, transparent);
		--sidebar-item-lift: calc(var(--lumi-space-2xs) * -0.25);
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		min-height: calc(var(--lumi-space-xxl) + var(--lumi-space-2xs));
		border-radius: var(--lumi-radius-md);
		color: var(--lumi-color-text-muted);
		font-weight: var(--lumi-font-weight-medium);
		font-size: var(--lumi-font-size-sm);
		text-decoration: none;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		transition:
			background-color var(--lumi-duration-fast) var(--lumi-easing-default),
			color var(--lumi-duration-fast) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-fast) var(--lumi-easing-default),
			transform var(--lumi-duration-fast) var(--lumi-easing-default);
		width: 100%;
		outline: none;
	}

	.lumi-sidebar-item::before {
		content: '';
		position: absolute;
		left: var(--lumi-space-2xs);
		top: var(--lumi-space-xs);
		bottom: var(--lumi-space-xs);
		width: var(--lumi-border-width-thick);
		border-radius: var(--lumi-radius-full);
		background: var(--lumi-color-primary);
		opacity: 0;
		transform: scaleY(0.6);
		transition:
			opacity var(--lumi-duration-fast) var(--lumi-easing-default),
			transform var(--lumi-duration-fast) var(--lumi-easing-default);
	}

	.lumi-sidebar-item:hover:not(.lumi-sidebar-item--active) {
		background: var(--sidebar-item-hover-bg);
		color: var(--lumi-color-text);
		transform: translateY(var(--sidebar-item-lift));
	}

	.lumi-sidebar-item:focus-visible {
		background: var(--sidebar-item-hover-bg);
		box-shadow: 0 0 0 var(--lumi-border-width-thick) var(--sidebar-item-focus-ring);
	}

	.lumi-sidebar-item:active:not(.lumi-sidebar-item--active) {
		transform: none;
	}

	.lumi-sidebar-item--active {
		background: var(--sidebar-item-active-bg);
		color: var(--lumi-color-primary);
		box-shadow: var(--lumi-shadow-sm);
	}

	.lumi-sidebar-item--active::before {
		opacity: 1;
		transform: scaleY(1);
	}

	.lumi-sidebar-item--active:hover {
		background: var(--sidebar-item-active-bg);
		color: var(--lumi-color-primary);
		transform: none;
	}

	.lumi-sidebar-item__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: var(--lumi-icon-md);
		height: var(--lumi-icon-md);
	}

	.lumi-sidebar-item__text {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: var(--lumi-line-height-normal);
	}

	.lumi-sidebar-item--collapsed {
		justify-content: center;
		padding-left: var(--lumi-space-sm);
		padding-right: var(--lumi-space-sm);
	}

	.lumi-sidebar-item--collapsed::before {
		display: none;
	}
</style>
