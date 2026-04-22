<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import { LUMI_CONFIG } from '../config';
	import type { SegmentedControlProps } from './types';

	let {
		value = $bindable(),
		options,
		color = 'primary',
		disabled = false,
		fullWidth = false,
		class: className = '',
		onchange,
		'aria-label': ariaLabel = ''
	}: SegmentedControlProps = $props();

	let containerRef: HTMLDivElement | undefined = $state();
	const optionRefs: (HTMLElement | null)[] = $state([]);
	let gliderStyle = $state<{ width: string; transform: string } | null>(null);
	let resizeObserver: ResizeObserver | undefined;
	const transitionDuration = `${LUMI_CONFIG.transitions.base}ms`;

	const uniqueName = `lumi-sc-${crypto.randomUUID().slice(0, 8)}`;

	const containerClasses = $derived(
		[
			'lumi-segmented-control',
			`lumi-segmented-control--${color}`,
			disabled && 'lumi-segmented-control--disabled',
			fullWidth && 'lumi-segmented-control--full',
			className
		]
			.filter(Boolean)
			.join(' ')
	);

	const styleVars = $derived(
		`--seg-color: var(--lumi-color-${color}); --seg-transition-duration: ${transitionDuration};`
	);

	function scrollActiveOptionIntoView(behavior: 'auto' | 'smooth' = 'auto'): void {
		if (!containerRef || !options.length) return;

		const activeIndex = options.findIndex((option) => option.value === value);
		const activeEl = activeIndex >= 0 ? optionRefs[activeIndex] : null;
		if (!activeEl) return;

		activeEl.scrollIntoView({
			block: 'nearest',
			inline: 'nearest',
			behavior
		});
	}

	function updateGlider(): void {
		if (!containerRef || !options.length) return;

		const activeIndex = options.findIndex((opt) => opt.value === value);
		if (activeIndex === -1 || !optionRefs[activeIndex]) {
			gliderStyle = null;
			return;
		}

		const activeEl = optionRefs[activeIndex];
		if (!activeEl) return;

		const containerRect = containerRef.getBoundingClientRect();
		const activeRect = activeEl.getBoundingClientRect();

		// Keep glider aligned when the control scrolls horizontally.
		const left = activeRect.left - containerRect.left + containerRef.scrollLeft;

		gliderStyle = {
			width: `${activeRect.width}px`,
			transform: `translateX(${left}px)`
		};
	}

	function handleChange(newValue: string | number): void {
		if (disabled) return;
		value = newValue;
		onchange?.(newValue);
		// Use requestAnimationFrame to ensure DOM has updated
		requestAnimationFrame(() => {
			updateGlider();
			scrollActiveOptionIntoView('smooth');
		});
	}

	$effect(() => {
		if (value !== undefined) {
			// Wait for potential layout shifts
			requestAnimationFrame(() => {
				updateGlider();
				scrollActiveOptionIntoView();
			});
		}
	});

	onMount(() => {
		// Initial update
		requestAnimationFrame(() => {
			updateGlider();
			scrollActiveOptionIntoView();
		});

		// Observe container resizing
		if (containerRef) {
			resizeObserver = new ResizeObserver(() => {
				requestAnimationFrame(updateGlider);
			});
			resizeObserver.observe(containerRef);
		}

		// Also update on window resize as fallback
		window.addEventListener('resize', updateGlider);
	});

	onDestroy(() => {
		resizeObserver?.disconnect();
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', updateGlider);
		}
	});
</script>

<div
	bind:this={containerRef}
	class={containerClasses}
	style={styleVars}
	role="radiogroup"
	aria-label={ariaLabel || 'Segmented control'}
>
	<!-- Glider -->
	{#if gliderStyle}
		<div
			class="lumi-segmented-control__glider"
			style="width: {gliderStyle.width}; transform: {gliderStyle.transform}"
		></div>
	{/if}

	<!-- Options -->
	{#each options as option, index (option.value)}
		<label
			bind:this={optionRefs[index]}
			class="lumi-segmented-control__option"
			class:lumi-segmented-control__option--active={value === option.value}
			class:lumi-segmented-control__option--disabled={option.disabled}
		>
			<input
				type="radio"
				class="lumi-segmented-control__input"
				name={uniqueName}
				value={option.value}
				checked={value === option.value}
				disabled={disabled || option.disabled}
				onchange={() => handleChange(option.value)}
				aria-label={option.label ?? option.icon ?? String(option.value)}
			/>
			<span class="lumi-segmented-control__content">
				{#if option.icon}
					<Icon icon={option.icon} size="sm" />
				{/if}
				{#if option.label}
					<span class="lumi-segmented-control__label">{option.label}</span>
				{/if}
			</span>
		</label>
	{/each}
</div>

<style>
	.lumi-segmented-control {
		position: relative;
		display: inline-flex;
		align-items: stretch;
		--seg-hover-bg: color-mix(in srgb, var(--seg-color) 4%, transparent);
		--seg-active-bg: color-mix(in srgb, var(--seg-color) 8%, transparent);
		--seg-lift: calc(var(--lumi-space-2xs) * -0.25);
		--seg-shell-bg: color-mix(
			in srgb,
			var(--lumi-color-surface) 58%,
			var(--lumi-color-background-hover) 42%
		);
		--seg-shell-border: color-mix(
			in srgb,
			var(--lumi-color-border) 72%,
			var(--lumi-color-border-strong) 28%
		);
		background:
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--seg-color) 4%, transparent) 0%,
				transparent 30%
			),
			var(--seg-shell-bg);
		border: var(--lumi-border-width-thin) solid var(--seg-shell-border);
		border-radius: var(--lumi-radius-xl);
		padding: var(--lumi-space-2xs);
		gap: var(--lumi-space-2xs);
		user-select: none;
		isolation: isolate;
		max-width: 100%;
		box-shadow: var(--lumi-shadow-sm);
		overflow-x: auto;
		overflow-y: hidden;
		overscroll-behavior-inline: contain;
		scrollbar-width: thin;
		scrollbar-color: var(--lumi-color-border-strong) transparent;
		transition:
			border-color var(--lumi-duration-fast) var(--lumi-easing-default),
			background-color var(--lumi-duration-fast) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-fast) var(--lumi-easing-default);
	}

	.lumi-segmented-control:hover:not(.lumi-segmented-control--disabled) {
		border-color: var(--lumi-color-border-strong);
	}

	.lumi-segmented-control:focus-within {
		border-color: color-mix(in srgb, var(--seg-color) 30%, var(--lumi-color-border-strong));
		box-shadow: 0 0 0 var(--lumi-border-width-thick)
			color-mix(in srgb, var(--seg-color) 16%, transparent);
	}

	.lumi-segmented-control::-webkit-scrollbar {
		height: var(--lumi-space-2xs);
	}

	.lumi-segmented-control::-webkit-scrollbar-thumb {
		background: var(--lumi-color-border-strong);
		border-radius: var(--lumi-radius-full);
	}

	.lumi-segmented-control::-webkit-scrollbar-track {
		background: transparent;
	}

	.lumi-segmented-control--full {
		display: flex;
		width: 100%;
	}

	.lumi-segmented-control__glider {
		position: absolute;
		top: var(--lumi-space-2xs);
		left: 0;
		height: calc(100% - var(--lumi-space-xs));
		background:
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--lumi-color-surface) 92%, var(--seg-color) 8%) 0%,
				var(--lumi-color-surface) 100%
			),
			var(--seg-active-bg);
		border: var(--lumi-border-width-thin) solid
			color-mix(in srgb, var(--seg-color) 20%, var(--lumi-color-border));
		border-radius: var(--lumi-radius-md);
		box-shadow: var(--lumi-shadow-sm);
		transition:
			transform var(--seg-transition-duration) var(--lumi-easing-default),
			width var(--seg-transition-duration) var(--lumi-easing-default),
			border-color var(--seg-transition-duration) var(--lumi-easing-default);
		z-index: 1;
		pointer-events: none;
	}

	.lumi-segmented-control__option {
		position: relative;
		z-index: 2;
		cursor: pointer;
		display: flex;
		min-width: max-content;
		text-align: center;
	}

	.lumi-segmented-control--full .lumi-segmented-control__option {
		flex: 1 1 0;
		min-width: 0;
	}

	.lumi-segmented-control__option--disabled {
		opacity: var(--lumi-opacity-disabled);
		cursor: not-allowed;
	}

	.lumi-segmented-control__input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.lumi-segmented-control__content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-xs);
		padding: var(--lumi-space-xs) var(--lumi-space-md);
		color: var(--lumi-color-text-muted);
		font-weight: var(--lumi-font-weight-medium);
		font-size: var(--lumi-font-size-sm);
		white-space: nowrap;
		transition:
			color var(--lumi-duration-fast) var(--lumi-easing-default),
			background-color var(--lumi-duration-fast) var(--lumi-easing-default),
			transform var(--lumi-duration-fast) var(--lumi-easing-default);
		border-radius: var(--lumi-radius-md);
		min-width: 0;
	}

	.lumi-segmented-control--full .lumi-segmented-control__content {
		flex: 1 1 auto;
	}

	.lumi-segmented-control__label {
		display: block;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.lumi-segmented-control__option--active .lumi-segmented-control__content {
		color: var(--seg-color);
		font-weight: var(--lumi-font-weight-semibold);
	}

	.lumi-segmented-control__option:not(.lumi-segmented-control__option--disabled):not(
			.lumi-segmented-control__option--active
		):hover
		.lumi-segmented-control__content {
		color: var(--lumi-color-text);
		background-color: var(--seg-hover-bg);
		transform: translateY(var(--seg-lift));
	}

	.lumi-segmented-control__input:focus-visible + .lumi-segmented-control__content {
		outline: var(--lumi-border-width-thick) solid
			color-mix(in srgb, var(--seg-color) 35%, transparent);
		outline-offset: calc(var(--lumi-space-2xs) * -1);
	}

	.lumi-segmented-control--disabled {
		opacity: var(--lumi-opacity-disabled);
		cursor: not-allowed;
		pointer-events: none;
	}

	@media (max-width: 768px) {
		.lumi-segmented-control--full {
			justify-content: flex-start;
		}

		.lumi-segmented-control--full .lumi-segmented-control__option {
			flex: 0 0 auto;
			min-width: max-content;
		}

		.lumi-segmented-control--full .lumi-segmented-control__content {
			flex: 0 0 auto;
			padding: var(--lumi-space-xs) var(--lumi-space-sm);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-segmented-control__glider,
		.lumi-segmented-control__content {
			transition: none;
		}
	}
</style>
