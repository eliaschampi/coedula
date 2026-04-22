<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount, setContext } from 'svelte';
	import { scale } from 'svelte/transition';
	import { createFloating } from '$lib/utils/floating.svelte';
	import { portal } from '$lib/actions/portal';
	import { LUMI_CONFIG } from '../config';
	import type { DropdownProps } from './types';

	interface Props {
		open?: boolean;
		position?: DropdownProps['position'];
		size?: DropdownProps['size'];
		disabled?: boolean;
		trigger?: DropdownProps['trigger'];
		closeOnClickOutside?: boolean;
		maxHeight?: number;
		offset?: number;
		viewportPadding?: number;
		'aria-label'?: string;
		class?: string;
		onshow?: () => void;
		onhide?: () => void;
		children?: Snippet;
		content?: Snippet;
		triggerContent?: Snippet;
	}

	let {
		open = $bindable(false),
		position = 'bottom-start',
		size = 'md',
		disabled = false,
		trigger = 'click',
		closeOnClickOutside = true,
		maxHeight = 320,
		offset = 8,
		viewportPadding = 12,
		'aria-label': ariaLabel = '',
		class: className = '',
		onshow,
		onhide,
		children,
		content,
		triggerContent
	}: Props = $props();

	let dropdownRef: HTMLDivElement | undefined = $state();
	let menuRef: HTMLDivElement | undefined = $state();

	const triggerId = `lumi-dropdown-trigger-${Math.random().toString(36).substring(2, 11)}`;
	const menuId = `lumi-dropdown-menu-${Math.random().toString(36).substring(2, 11)}`;
	const transitionDuration = LUMI_CONFIG.transitions.fast;
	// Floating element management
	const floating = createFloating(
		() => dropdownRef,
		() => menuRef,
		() => ({
			placement: position,
			maxHeight,
			offset,
			viewportPadding,
			zIndex: 'var(--lumi-z-dropdown)',
			strategy: 'fixed' as const
		})
	);

	// Sync open state with floating
	$effect(() => {
		if (open && !floating.isOpen) {
			openDropdown();
		} else if (!open && floating.isOpen) {
			closeDropdown();
		}
	});

	// Provide close function to child components
	setContext('dropdownClose', closeDropdown);

	const dropdownClasses = $derived.by(() =>
		['lumi-dropdown', open && 'lumi-dropdown--open', className].filter(Boolean).join(' ')
	);

	const styleVars = `--dropdown-transition-duration: ${transitionDuration}ms;`;

	function openDropdown(): void {
		if (disabled) return;
		floating.open();
		open = true;
		onshow?.();
	}

	function closeDropdown(): void {
		floating.close();
		open = false;
		onhide?.();
	}

	function toggle(): void {
		if (disabled) return;
		if (open) {
			closeDropdown();
		} else {
			openDropdown();
		}
	}

	function handleClickOutside(event: MouseEvent): void {
		if (!closeOnClickOutside || !open) return;
		if (!dropdownRef || !menuRef) return;

		const target = event.target as Element;

		// Check if click is outside both trigger and menu
		if (!dropdownRef.contains(target) && !menuRef.contains(target)) {
			closeDropdown();
		}
	}

	function handleEscape(event: KeyboardEvent): void {
		if (event.key === 'Escape' && open) {
			closeDropdown();
		}
	}

	function handleTriggerClick(event: MouseEvent): void {
		if (trigger === 'click') {
			event.stopPropagation();
			toggle();
		}
	}

	function handleTriggerKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggle();
		} else if (event.key === 'Escape') {
			closeDropdown();
		}
	}

	function handleMouseEnter(): void {
		if (trigger === 'hover' && !disabled) {
			openDropdown();
		}
	}

	function handleMouseLeave(): void {
		if (trigger === 'hover' && !disabled) {
			closeDropdown();
		}
	}

	onMount(() => {
		// Use capture phase for click outside to prevent issues
		if (closeOnClickOutside) {
			document.addEventListener('click', handleClickOutside, true);
		}
		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('click', handleClickOutside, true);
			document.removeEventListener('keydown', handleEscape);
		};
	});
</script>

<div
	bind:this={dropdownRef}
	class={dropdownClasses}
	style={styleVars}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	role="presentation"
>
	<!-- Trigger -->
	<div
		id={triggerId}
		class="lumi-dropdown__trigger"
		aria-expanded={open}
		aria-haspopup="menu"
		aria-controls={open ? menuId : undefined}
		aria-disabled={disabled}
		aria-label={ariaLabel || undefined}
		role="button"
		tabindex={disabled ? -1 : 0}
		onclick={handleTriggerClick}
		onkeydown={handleTriggerKeydown}
	>
		{#if children}
			{@render children()}
		{:else if triggerContent}
			{@render triggerContent()}
		{/if}
	</div>

	<!-- Menu -->
	{#if open}
		<div
			bind:this={menuRef}
			use:portal
			id={menuId}
			class="lumi-dropdown__menu lumi-dropdown__menu--{size}"
			role="menu"
			aria-labelledby={triggerId}
			style="position: {floating.floatingStyles.position}; top: {floating.floatingStyles
				.top}; left: {floating.floatingStyles.left}; z-index: {floating.floatingStyles
				.zIndex}; {floating.floatingStyles.maxHeight
				? `max-height: ${floating.floatingStyles.maxHeight}`
				: ''}"
			transition:scale={{ duration: transitionDuration, start: 0.96 }}
		>
			<div class="lumi-dropdown__content">
				{#if content}
					{@render content()}
				{:else if children}
					{@render children()}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.lumi-dropdown {
		position: relative;
		display: inline-block;
	}

	.lumi-dropdown__trigger {
		cursor: pointer;
		user-select: none;
		display: inline-flex;
	}

	.lumi-dropdown__trigger:focus {
		outline: none;
	}

	.lumi-dropdown__trigger:focus-visible {
		outline: var(--lumi-border-width-thick) solid var(--lumi-color-primary);
		border-radius: var(--lumi-radius-md);
	}

	.lumi-dropdown__menu {
		background:
			linear-gradient(
				180deg,
				rgba(var(--lumi-color-primary-rgb), 0.05) 0%,
				rgba(var(--lumi-color-primary-rgb), 0) 22%
			),
			var(--lumi-color-surface-overlay);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-2xl);
		box-shadow: var(--lumi-shadow-md);
		padding: var(--lumi-space-xs);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		backdrop-filter: blur(var(--lumi-blur-md));
		-webkit-backdrop-filter: blur(var(--lumi-blur-md));
		transition:
			opacity var(--dropdown-transition-duration) var(--lumi-easing-default),
			transform var(--dropdown-transition-duration) var(--lumi-easing-default);
	}

	.lumi-dropdown__content {
		overflow-y: auto;
		max-height: inherit;
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
	}

	.lumi-dropdown__content::-webkit-scrollbar {
		width: var(--lumi-space-2xs);
	}

	.lumi-dropdown__content::-webkit-scrollbar-track {
		background: transparent;
	}

	.lumi-dropdown__content::-webkit-scrollbar-thumb {
		background: var(--lumi-color-border);
		border-radius: var(--lumi-radius-full);
	}

	.lumi-dropdown__menu--sm {
		min-width: calc(var(--lumi-space-4xl) + var(--lumi-space-xl) + var(--lumi-space-sm));
	}

	.lumi-dropdown__menu--md {
		min-width: calc(var(--lumi-space-5xl) * 2 + var(--lumi-space-sm));
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-dropdown__menu {
			transition: none !important;
		}
	}
</style>
