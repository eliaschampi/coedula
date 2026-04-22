<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import { portal } from '$lib/actions/portal';
	import type { TooltipProps } from './types';
	import type { TooltipPosition } from './types';
	import { LUMI_CONFIG } from '../config';

	interface Props extends TooltipProps {
		children?: Snippet;
		content?: Snippet;
	}

	const {
		text = '',
		position = 'top',
		delay = 0,
		class: className = '',
		children,
		content
	}: Props = $props();

	const uniqueId =
		globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);
	const tooltipId = `lumi-tooltip-${uniqueId}`;
	let isVisible = $state(false);
	let isPositioned = $state(false);
	let resolvedPosition = $state<TooltipPosition>('top');
	let tooltipTop = $state(0);
	let tooltipLeft = $state(0);
	let arrowOffset = $state(0);
	let showTimeout: number | null = null;
	let frameId: number | null = null;
	let triggerRef: HTMLDivElement | undefined = $state();
	let tooltipRef: HTMLDivElement | undefined = $state();

	const viewportPadding = 8;
	const tooltipGap = 10;
	const arrowEdgePadding = 12;
	const transitionDuration = LUMI_CONFIG.transitions.fast;

	const tooltipClasses = $derived(
		[
			'lumi-tooltip__content',
			`lumi-tooltip--${resolvedPosition}`,
			isPositioned && 'lumi-tooltip--visible',
			className
		]
			.filter(Boolean)
			.join(' ')
	);

	const tooltipStyles = $derived(
		[
			`top: ${tooltipTop}px`,
			`left: ${tooltipLeft}px`,
			`--lumi-tooltip-arrow-offset: ${arrowOffset}px`
		].join('; ')
	);

	function clamp(value: number, min: number, max: number): number {
		return Math.min(Math.max(value, min), max);
	}

	function clearShowTimeout(): void {
		if (showTimeout !== null) {
			clearTimeout(showTimeout);
			showTimeout = null;
		}
	}

	function clearFrame(): void {
		if (frameId !== null) {
			cancelAnimationFrame(frameId);
			frameId = null;
		}
	}

	function schedulePositionUpdate(preferredPosition: TooltipPosition = position): void {
		clearFrame();
		frameId = requestAnimationFrame(() => {
			frameId = null;
			updatePosition(preferredPosition);
		});
	}

	function resolveBestPosition(
		preferred: TooltipPosition,
		triggerRect: DOMRect,
		tooltipRect: DOMRect
	): TooltipPosition {
		const spaces: Record<TooltipPosition, number> = {
			top: triggerRect.top - viewportPadding,
			bottom: window.innerHeight - triggerRect.bottom - viewportPadding,
			left: triggerRect.left - viewportPadding,
			right: window.innerWidth - triggerRect.right - viewportPadding
		};

		const required: Record<TooltipPosition, number> = {
			top: tooltipRect.height + tooltipGap,
			bottom: tooltipRect.height + tooltipGap,
			left: tooltipRect.width + tooltipGap,
			right: tooltipRect.width + tooltipGap
		};

		if (spaces[preferred] >= required[preferred]) {
			return preferred;
		}

		const oppositeMap: Record<TooltipPosition, TooltipPosition> = {
			top: 'bottom',
			bottom: 'top',
			left: 'right',
			right: 'left'
		};
		const opposite = oppositeMap[preferred];

		if (spaces[opposite] >= required[opposite]) {
			return opposite;
		}

		return (Object.entries(spaces).sort(([, a], [, b]) => b - a)[0]?.[0] ??
			preferred) as TooltipPosition;
	}

	function updatePosition(preferredPosition: TooltipPosition = position): void {
		if (!triggerRef || !tooltipRef || !isVisible) return;

		const triggerRect = triggerRef.getBoundingClientRect();
		const tooltipRect = tooltipRef.getBoundingClientRect();
		const nextPosition = resolveBestPosition(preferredPosition, triggerRect, tooltipRect);

		const triggerCenterX = triggerRect.left + triggerRect.width / 2;
		const triggerCenterY = triggerRect.top + triggerRect.height / 2;

		let top = 0;
		let left = 0;

		switch (nextPosition) {
			case 'top':
				top = triggerRect.top - tooltipRect.height - tooltipGap;
				left = triggerCenterX - tooltipRect.width / 2;
				break;
			case 'bottom':
				top = triggerRect.bottom + tooltipGap;
				left = triggerCenterX - tooltipRect.width / 2;
				break;
			case 'left':
				top = triggerCenterY - tooltipRect.height / 2;
				left = triggerRect.left - tooltipRect.width - tooltipGap;
				break;
			case 'right':
				top = triggerCenterY - tooltipRect.height / 2;
				left = triggerRect.right + tooltipGap;
				break;
		}

		const maxLeft = Math.max(
			viewportPadding,
			window.innerWidth - tooltipRect.width - viewportPadding
		);
		const maxTop = Math.max(
			viewportPadding,
			window.innerHeight - tooltipRect.height - viewportPadding
		);
		const clampedLeft = clamp(left, viewportPadding, maxLeft);
		const clampedTop = clamp(top, viewportPadding, maxTop);

		const axisSize =
			nextPosition === 'top' || nextPosition === 'bottom' ? tooltipRect.width : tooltipRect.height;
		const desiredArrow =
			nextPosition === 'top' || nextPosition === 'bottom'
				? triggerCenterX - clampedLeft
				: triggerCenterY - clampedTop;
		const minArrowOffset = Math.min(arrowEdgePadding, axisSize / 2);
		const maxArrowOffset = Math.max(minArrowOffset, axisSize - minArrowOffset);

		resolvedPosition = nextPosition;
		tooltipTop = clampedTop;
		tooltipLeft = clampedLeft;
		arrowOffset = clamp(desiredArrow, minArrowOffset, maxArrowOffset);
		isPositioned = true;
	}

	function showTooltip(): void {
		clearShowTimeout();
		resolvedPosition = position;

		if (delay > 0) {
			showTimeout = window.setTimeout(() => {
				isVisible = true;
				showTimeout = null;
				isPositioned = false;
			}, delay);
		} else {
			isVisible = true;
			isPositioned = false;
		}
	}

	function hideTooltip(): void {
		clearShowTimeout();
		clearFrame();
		isVisible = false;
		isPositioned = false;
	}

	function handleFocusOut(event: FocusEvent): void {
		const nextTarget = event.relatedTarget as Node | null;
		if (nextTarget && triggerRef?.contains(nextTarget)) {
			return;
		}
		hideTooltip();
	}

	$effect(() => {
		if (!isVisible || !tooltipRef || !triggerRef) return;
		schedulePositionUpdate(position);

		const resizeObserver = new ResizeObserver(() => {
			schedulePositionUpdate();
		});

		resizeObserver.observe(tooltipRef);
		resizeObserver.observe(triggerRef);

		return () => {
			resizeObserver.disconnect();
		};
	});

	$effect(() => {
		if (!isVisible) return;

		const handleViewportChange = (): void => {
			schedulePositionUpdate();
		};

		window.addEventListener('scroll', handleViewportChange, true);
		window.addEventListener('resize', handleViewportChange);

		return () => {
			window.removeEventListener('scroll', handleViewportChange, true);
			window.removeEventListener('resize', handleViewportChange);
		};
	});

	onDestroy(() => {
		clearShowTimeout();
		clearFrame();
	});
</script>

<div
	bind:this={triggerRef}
	class="lumi-tooltip"
	role="group"
	aria-describedby={isVisible ? tooltipId : undefined}
	onmouseenter={showTooltip}
	onmouseleave={hideTooltip}
	onfocusin={showTooltip}
	onfocusout={handleFocusOut}
>
	{#if children}
		{@render children()}
	{/if}
</div>

{#if isVisible}
	<div
		bind:this={tooltipRef}
		use:portal
		id={tooltipId}
		class={tooltipClasses}
		style={tooltipStyles}
		role="tooltip"
		aria-label={text || 'Tooltip'}
		transition:fade={{ duration: transitionDuration }}
	>
		{#if content}
			{@render content()}
		{:else}
			{text}
		{/if}
	</div>
{/if}

<style>
	.lumi-tooltip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.lumi-tooltip__content {
		position: fixed;
		z-index: var(--lumi-z-tooltip);
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		font-size: var(--lumi-font-size-xs);
		border-radius: var(--lumi-radius-lg);
		max-width: calc(var(--lumi-space-5xl) * 3);
		color: var(--lumi-color-text);
		white-space: normal;
		text-align: center;
		pointer-events: none;
		font-family: var(--lumi-font-family-sans);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-snug);
		opacity: 0;
		visibility: hidden;
		background:
			linear-gradient(
				180deg,
				rgba(var(--lumi-color-primary-rgb), 0.04) 0%,
				rgba(var(--lumi-color-primary-rgb), 0) 30%
			),
			var(--lumi-color-surface);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		box-shadow: var(--lumi-shadow-md);
		transform-origin: center;
		transition:
			opacity var(--lumi-duration-fast) ease,
			visibility var(--lumi-duration-fast) ease;
	}

	.lumi-tooltip__content::after {
		content: '';
		position: absolute;
		width: var(--lumi-space-xs);
		height: var(--lumi-space-xs);
		background: var(--lumi-color-surface);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		transform: rotate(45deg);
	}

	.lumi-tooltip--visible {
		opacity: 1;
		visibility: visible;
	}

	.lumi-tooltip--top::after {
		top: calc(100% - (var(--lumi-space-2xs) * 1.5));
		left: var(--lumi-tooltip-arrow-offset);
		transform: translateX(-50%) rotate(45deg);
	}

	.lumi-tooltip--bottom::after {
		bottom: calc(100% - (var(--lumi-space-2xs) * 1.5));
		left: var(--lumi-tooltip-arrow-offset);
		transform: translateX(-50%) rotate(45deg);
	}

	.lumi-tooltip--left::after {
		left: calc(100% - (var(--lumi-space-2xs) * 1.5));
		top: var(--lumi-tooltip-arrow-offset);
		transform: translateY(-50%) rotate(45deg);
	}

	.lumi-tooltip--right::after {
		right: calc(100% - (var(--lumi-space-2xs) * 1.5));
		top: var(--lumi-tooltip-arrow-offset);
		transform: translateY(-50%) rotate(45deg);
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-tooltip__content {
			transition: none !important;
			animation: none !important;
		}
	}
</style>
