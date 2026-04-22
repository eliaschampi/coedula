<script lang="ts">
	import { Icon } from '../Icon';
	import { getIconSize } from '../config';
	import type { NumberInputProps } from './types';

	let {
		value = $bindable(0),
		min = 0,
		max = 100,
		step = 1,
		label = '',
		placeholder = '',
		color = 'primary',
		size = 'md',
		disabled = false,
		class: className = '',
		onchange
	}: NumberInputProps = $props();

	const inputId = `lumi-number-${crypto.randomUUID().slice(0, 8)}`;
	const labelId = `${inputId}-label`;
	const styleVars = $derived(`--input-accent: var(--lumi-color-${color});`);
	const iconSize = $derived(`${getIconSize(size)}px`);
	const normalizedStep = $derived(step > 0 ? step : 1);

	const classes = $derived(
		[
			'lumi-number-input',
			`lumi-number-input--${size}`,
			disabled && 'lumi-number-input--disabled',
			className
		]
			.filter(Boolean)
			.join(' ')
	);

	function clamp(val: number): number {
		let v = val;
		if (min !== undefined) v = Math.max(min, v);
		if (max !== undefined) v = Math.min(max, v);
		const precision = String(normalizedStep).split('.')[1]?.length ?? 0;
		const snapped = min + Math.round((v - min) / normalizedStep) * normalizedStep;
		return Number(snapped.toFixed(precision));
	}

	function increment(): void {
		if (disabled) return;
		const newVal = clamp((value ?? 0) + normalizedStep);
		if (newVal !== value) {
			value = newVal;
			onchange?.(value);
		}
	}

	function decrement(): void {
		if (disabled) return;
		const newVal = clamp((value ?? 0) - normalizedStep);
		if (newVal !== value) {
			value = newVal;
			onchange?.(value);
		}
	}

	function handleBlur(): void {
		if (value === null || isNaN(value)) value = min;
		value = clamp(value);
		onchange?.(value);
	}

	function handleKeyDown(e: KeyboardEvent): void {
		if (disabled) return;
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			increment();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			decrement();
		}
	}
</script>

<div class={classes} style={styleVars}>
	{#if label}
		<label id={labelId} class="lumi-number-input__label" for={inputId}>{label}</label>
	{/if}

	<div class="lumi-number-input__wrapper">
		<button
			type="button"
			class="lumi-number-input__btn lumi-number-input__btn--decrement"
			onclick={decrement}
			disabled={disabled || (min !== undefined && value <= min)}
			aria-label="Decrease value"
			tabindex="-1"
		>
			<Icon icon="minus" size={iconSize} />
		</button>

		<input
			id={inputId}
			type="number"
			bind:value
			{min}
			{max}
			step={normalizedStep}
			{placeholder}
			{disabled}
			onblur={handleBlur}
			onkeydown={handleKeyDown}
			class="lumi-number-input__field"
			aria-labelledby={label ? labelId : undefined}
		/>

		<button
			type="button"
			class="lumi-number-input__btn lumi-number-input__btn--increment"
			onclick={increment}
			disabled={disabled || (max !== undefined && value >= max)}
			aria-label="Increase value"
			tabindex="-1"
		>
			<Icon icon="plus" size={iconSize} />
		</button>
	</div>
</div>

<style>
	.lumi-number-input {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
		width: 100%;
		--input-accent: var(--lumi-color-primary);
		--number-border: var(--lumi-color-border);
		--number-bg: color-mix(
			in srgb,
			var(--lumi-color-background-hover) 60%,
			var(--lumi-color-surface) 40%
		);
		--number-bg-focus: color-mix(in srgb, var(--lumi-color-surface) 95%, var(--input-accent) 5%);
		--number-btn-size: var(--lumi-control-height-md);
	}

	.lumi-number-input__label {
		font-family: var(--lumi-font-family-sans);
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
	}

	.lumi-number-input__wrapper {
		position: relative;
		display: flex;
		align-items: stretch;
		min-height: var(--lumi-control-height-md);
		background: var(--number-bg);
		border: var(--lumi-border-width-thin) solid var(--number-border);
		border-radius: var(--lumi-radius-md);
		overflow: hidden;
		transition:
			border-color var(--lumi-duration-base) var(--lumi-easing-default),
			background-color var(--lumi-duration-base) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-base) var(--lumi-easing-default);
	}

	.lumi-number-input__wrapper:hover:not(:focus-within) {
		border-color: var(--lumi-color-border-strong);
	}

	.lumi-number-input__wrapper:focus-within {
		border-color: var(--input-accent);
		background: var(--number-bg-focus);
		box-shadow: 0 0 0 var(--lumi-border-width-thick)
			color-mix(in srgb, var(--input-accent) 22%, transparent);
	}

	.lumi-number-input__field {
		flex: 1;
		min-width: 0;
		padding: 0 var(--lumi-space-sm);
		background: transparent;
		border: none;
		font-family: inherit;
		font-size: var(--lumi-font-size-base);
		color: var(--lumi-color-text);
		text-align: center;
		outline: none;
		line-height: var(--lumi-line-height-normal);
		appearance: textfield;
	}

	.lumi-number-input__field::placeholder {
		color: var(--lumi-color-text-muted);
		opacity: 0.7;
	}

	.lumi-number-input__btn {
		flex: 0 0 var(--number-btn-size);
		inline-size: var(--number-btn-size);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--number-bg) 90%, var(--lumi-color-surface) 10%);
		border: none;
		color: var(--lumi-color-text-muted);
		cursor: pointer;
		transition:
			color var(--lumi-duration-fast) var(--lumi-easing-default),
			background-color var(--lumi-duration-fast) var(--lumi-easing-default);
		flex-shrink: 0;
	}

	.lumi-number-input__btn--decrement {
		border-right: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
	}

	.lumi-number-input__btn--increment {
		border-left: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
	}

	.lumi-number-input__btn:hover:not(:disabled) {
		color: var(--input-accent);
		background: color-mix(
			in srgb,
			var(--input-accent) 8%,
			color-mix(in srgb, var(--number-bg) 90%, var(--lumi-color-surface) 10%)
		);
	}

	.lumi-number-input__btn:active:not(:disabled) {
		background: color-mix(in srgb, var(--input-accent) 14%, transparent);
	}

	.lumi-number-input__btn:focus-visible {
		outline: var(--lumi-border-width-thick) solid
			color-mix(in srgb, var(--input-accent) 30%, transparent);
		outline-offset: -1px;
	}

	.lumi-number-input--sm .lumi-number-input__wrapper {
		min-height: var(--lumi-control-height-sm);
	}

	.lumi-number-input--sm .lumi-number-input__field {
		font-size: var(--lumi-font-size-sm);
		padding: 0 var(--lumi-space-xs);
	}

	.lumi-number-input--sm {
		--number-btn-size: var(--lumi-control-height-sm);
	}

	.lumi-number-input--lg .lumi-number-input__wrapper {
		min-height: var(--lumi-control-height-lg);
	}

	.lumi-number-input--lg .lumi-number-input__field {
		font-size: var(--lumi-font-size-lg);
		padding: 0 var(--lumi-space-md);
	}

	.lumi-number-input--lg {
		--number-btn-size: var(--lumi-control-height-lg);
	}

	.lumi-number-input--disabled {
		opacity: var(--lumi-opacity-disabled);
		pointer-events: none;
	}

	.lumi-number-input__field::-webkit-inner-spin-button,
	.lumi-number-input__field::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-number-input__wrapper,
		.lumi-number-input__btn {
			transition: none;
		}
	}
</style>
