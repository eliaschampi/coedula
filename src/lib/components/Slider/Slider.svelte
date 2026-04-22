<script lang="ts">
	import type { SliderProps } from './types';

	let {
		value = $bindable(0),
		min = 0,
		max = 100,
		step = 1,
		label = '',
		color = 'primary',
		size = 'md',
		disabled = false,
		showValue = false,
		showTooltip = true,
		class: className = '',
		onchange
	}: SliderProps = $props();

	const sliderId = `lumi-slider-${crypto.randomUUID().slice(0, 8)}`;
	const labelId = `${sliderId}-label`;

	let trackRef: HTMLDivElement | undefined = $state();
	let isDragging = $state(false);
	let isFocused = $state(false);

	const percentage = $derived.by(() => {
		const range = max - min;
		if (range <= 0) return 0;
		return Math.max(0, Math.min(100, ((value - min) / range) * 100));
	});

	const styleVars = $derived(
		`--slider-fill: ${percentage}%; --slider-accent: var(--lumi-color-${color});`
	);

	const classes = $derived(
		['lumi-slider', `lumi-slider--${size}`, disabled && 'lumi-slider--disabled', className]
			.filter(Boolean)
			.join(' ')
	);

	function clampStep(raw: number): number {
		const stepped = min + Math.round((raw - min) / step) * step;
		return Math.max(min, Math.min(max, stepped));
	}

	function updateFromClientX(clientX: number): void {
		if (!trackRef) return;
		const { left, width } = trackRef.getBoundingClientRect();
		const pct = Math.max(0, Math.min(1, (clientX - left) / width));
		value = clampStep(min + pct * (max - min));
	}

	function emitChange(): void {
		onchange?.(value);
	}

	function handleTrackClick(e: MouseEvent): void {
		if (disabled) return;
		updateFromClientX(e.clientX);
		emitChange();
	}

	function handleKeyDown(e: KeyboardEvent): void {
		if (disabled) return;

		const deltas: Record<string, number> = {
			ArrowRight: step,
			ArrowUp: step,
			ArrowLeft: -step,
			ArrowDown: -step,
			PageUp: step * 10,
			PageDown: -step * 10
		};

		if (e.key === 'Home') {
			e.preventDefault();
			value = min;
			emitChange();
			return;
		}
		if (e.key === 'End') {
			e.preventDefault();
			value = max;
			emitChange();
			return;
		}

		const delta = deltas[e.key];
		if (delta === undefined) return;

		e.preventDefault();
		const next = clampStep(value + delta);
		if (next !== value) {
			value = next;
			emitChange();
		}
	}

	function startDragging(e: MouseEvent | TouchEvent): void {
		if (disabled) return;
		e.preventDefault();
		isDragging = true;

		const move = (ev: MouseEvent | TouchEvent) => {
			const cx = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
			updateFromClientX(cx);
		};

		const end = () => {
			isDragging = false;
			emitChange();
			document.removeEventListener('mousemove', move);
			document.removeEventListener('mouseup', end);
			document.removeEventListener('touchmove', move);
			document.removeEventListener('touchend', end);
		};

		document.addEventListener('mousemove', move);
		document.addEventListener('mouseup', end);
		document.addEventListener('touchmove', move, { passive: false });
		document.addEventListener('touchend', end);
	}
</script>

<div class={classes} style={styleVars}>
	{#if label}
		<div class="lumi-slider__header">
			<label id={labelId} class="lumi-slider__label" for={sliderId}>{label}</label>
			{#if showValue}
				<span class="lumi-slider__value-inline">{value}</span>
			{/if}
		</div>
	{/if}

	<div class="lumi-slider__container">
		<div
			bind:this={trackRef}
			id={sliderId}
			class="lumi-slider__track"
			class:lumi-slider__track--focused={isFocused}
			class:lumi-slider__track--dragging={isDragging}
			onclick={handleTrackClick}
			onkeydown={handleKeyDown}
			onmousedown={startDragging}
			ontouchstart={startDragging}
			onfocus={() => (isFocused = true)}
			onblur={() => (isFocused = false)}
			role="slider"
			tabindex={disabled ? -1 : 0}
			aria-valuenow={value}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-labelledby={label ? labelId : undefined}
			aria-disabled={disabled}
		>
			<div class="lumi-slider__rail"></div>
			<div class="lumi-slider__fill"></div>

			<div class="lumi-slider__thumb" aria-hidden="true">
				{#if showTooltip}
					<div class="lumi-slider__tooltip" role="tooltip">{value}</div>
				{/if}
			</div>
		</div>

		<div class="lumi-slider__range-labels" aria-hidden="true">
			<span>{min}</span>
			<span>{max}</span>
		</div>
	</div>

	{#if showValue && !label}
		<div class="lumi-slider__value">{value}</div>
	{/if}
</div>

<style>
	/* LUMI SLIDER — Redesigned 2026 edition */
	/* Minimal, beautiful, droplet-integrated thumb • ~40% less code • Full token consistency */

	.lumi-slider {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-sm);
		width: 100%;

		--slider-accent: var(--lumi-color-primary);
		--slider-fill: 0%;
		--_track-h: 6px;
		--_thumb-size: 18px;
		--_hit: 12px;
	}

	.lumi-slider--sm {
		--_track-h: 4px;
		--_thumb-size: 15px;
	}
	.lumi-slider--lg {
		--_track-h: 8px;
		--_thumb-size: 22px;
	}

	.lumi-slider__header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.lumi-slider__label {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
	}

	.lumi-slider__value-inline {
		font-family: var(--lumi-font-family-mono);
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-bold);
		color: var(--slider-accent);
		background: color-mix(in srgb, var(--slider-accent) 12%, transparent);
		border-radius: var(--lumi-radius-base);
		padding: var(--lumi-space-2xs) var(--lumi-space-xs);
	}

	.lumi-slider__container {
		position: relative;
	}

	.lumi-slider__track {
		position: relative;
		height: calc(var(--_track-h) + var(--_hit) * 2);
		cursor: pointer;
		touch-action: none;
	}

	.lumi-slider__rail,
	.lumi-slider__fill {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: var(--_track-h);
		transform: translateY(-50%);
		border-radius: var(--lumi-radius-full);
	}

	.lumi-slider__rail {
		background: color-mix(in srgb, var(--lumi-color-border-strong) 68%, var(--lumi-color-surface));
		box-shadow: inset 0 var(--lumi-border-width-thin) 3px rgba(0, 0, 0, 0.1);
	}

	.lumi-slider__fill {
		width: var(--slider-fill);
		background: var(--slider-accent);
		box-shadow: 0 0 14px color-mix(in srgb, var(--slider-accent) 55%, transparent);
		transition: width var(--lumi-duration-fast) var(--lumi-easing-out);
	}

	/* Droplet thumb — perfectly connected to track */
	.lumi-slider__thumb {
		position: absolute;
		top: 50%;
		left: var(--slider-fill);
		transform: translate(-50%, -50%);
		width: var(--_thumb-size);
		height: var(--_thumb-size);
		background: var(--lumi-color-surface);
		border: var(--lumi-border-width-thick) solid var(--slider-accent);
		border-radius: var(--lumi-radius-full);
		box-shadow:
			var(--lumi-shadow-md),
			0 0 0 var(--lumi-space-2xs) color-mix(in srgb, var(--slider-accent) 18%, transparent);
		transition:
			transform var(--lumi-duration-base) var(--lumi-easing-bounce),
			box-shadow var(--lumi-duration-base) var(--lumi-easing-default);
	}

	.lumi-slider__thumb::before {
		content: '';
		position: absolute;
		inset: 22%;
		background: radial-gradient(circle at 28% 28%, rgba(255, 255, 255, 0.85), transparent 70%);
		border-radius: inherit;
		pointer-events: none;
	}

	/* Beautiful interaction states */
	.lumi-slider__track:hover .lumi-slider__thumb,
	.lumi-slider__track--focused .lumi-slider__thumb {
		transform: translate(-50%, -50%) scale(1.16);
		box-shadow:
			var(--lumi-shadow-lg),
			0 0 0 9px color-mix(in srgb, var(--slider-accent) 24%, transparent);
	}

	.lumi-slider__track--dragging .lumi-slider__thumb {
		transform: translate(-50%, -50%) scale(1.26) !important;
		box-shadow:
			var(--lumi-shadow-xl),
			0 0 0 14px color-mix(in srgb, var(--slider-accent) 30%, transparent) !important;
	}

	/* No separation during drag — instant response */
	.lumi-slider__track--dragging .lumi-slider__fill,
	.lumi-slider__track--dragging .lumi-slider__thumb {
		transition: none;
	}

	/* Glass tooltip */
	.lumi-slider__tooltip {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%) translateY(var(--lumi-space-xs));
		padding: var(--lumi-space-2xs) var(--lumi-space-sm);
		background: var(--lumi-color-surface-overlay);
		backdrop-filter: blur(var(--lumi-blur-md));
		border: var(--lumi-border-width-thin) solid
			color-mix(in srgb, var(--slider-accent) 35%, transparent);
		box-shadow: var(--lumi-shadow-lg);
		color: var(--lumi-color-text);
		font-family: var(--lumi-font-family-mono);
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-bold);
		border-radius: var(--lumi-radius-md);
		white-space: nowrap;
		opacity: 0;
		pointer-events: none;
		transition:
			opacity var(--lumi-duration-base) var(--lumi-easing-bounce),
			transform var(--lumi-duration-base) var(--lumi-easing-bounce);
	}

	.lumi-slider__track:hover .lumi-slider__tooltip,
	.lumi-slider__track--focused .lumi-slider__tooltip,
	.lumi-slider__track--dragging .lumi-slider__tooltip {
		opacity: 1;
		transform: translateX(-50%) translateY(0);
	}

	.lumi-slider__range-labels {
		display: flex;
		justify-content: space-between;
		margin-top: var(--lumi-space-2xs);
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-light);
	}

	.lumi-slider--disabled {
		opacity: var(--lumi-opacity-disabled);
		pointer-events: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-slider__fill,
		.lumi-slider__thumb,
		.lumi-slider__tooltip {
			transition: none;
		}
	}
</style>
