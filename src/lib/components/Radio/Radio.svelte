<script lang="ts">
	import type { RadioProps } from './types';

	let {
		group = $bindable(),
		value,
		label = '',
		name = '',
		size = 'md',
		color = 'primary',
		disabled = false,
		class: className = '',
		children,
		onchange,
		'aria-label': ariaLabel = ''
	}: RadioProps = $props();

	const radioId = `lumi-radio-${crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10)}`;

	const isChecked = $derived(group === value);

	function handleChange(event: Event): void {
		if (disabled) return;
		group = value;
		onchange?.(value, event);
	}
</script>

<label
	for={radioId}
	class="lumi-radio lumi-radio--{size} lumi-radio--{color} {className}"
	class:lumi-radio--checked={isChecked}
	class:lumi-radio--disabled={disabled}
>
	<input
		id={radioId}
		type="radio"
		{name}
		{value}
		checked={isChecked}
		{disabled}
		aria-label={ariaLabel || label || undefined}
		class="lumi-radio__input"
		onchange={handleChange}
	/>

	<div class="lumi-radio__visual">
		<div class="lumi-radio__circle"></div>
	</div>

	{#if label || children}
		<span class="lumi-radio__label">
			{#if children}
				{@render children()}
			{:else}
				{label}
			{/if}
		</span>
	{/if}
</label>

<style>
	.lumi-radio {
		--radio-size: var(--lumi-icon-md);
		--radio-dot-size: var(--lumi-space-xs);
		--radio-label-size: var(--lumi-font-size-base);
		--radio-color: var(--lumi-color-primary);

		position: relative;
		display: inline-flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		cursor: pointer;
		user-select: none;
		font-family: var(--lumi-font-family-sans);
	}

	/* Hidden input */
	.lumi-radio__input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 0;
		height: 0;
	}

	/* Visual radio */
	.lumi-radio__visual {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--radio-size);
		height: var(--radio-size);
		border: var(--lumi-border-width-thick) solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-full);
		background: var(--lumi-color-surface);
		flex-shrink: 0;
		transition:
			border-color var(--lumi-duration-base) var(--lumi-easing-default),
			background-color var(--lumi-duration-base) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-base) var(--lumi-easing-default);
	}

	/* Inner dot */
	.lumi-radio__circle {
		width: var(--radio-dot-size);
		height: var(--radio-dot-size);
		border-radius: var(--lumi-radius-full);
		background: transparent;
		transform: scale(0);
		transition:
			transform var(--lumi-duration-base) var(--lumi-easing-default),
			background-color var(--lumi-duration-base) var(--lumi-easing-default);
	}

	/* Label */
	.lumi-radio__label {
		color: var(--lumi-color-text);
		font-size: var(--radio-label-size);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-tight);
		cursor: pointer;
	}

	/* ── Size variants ────────────────────────── */
	.lumi-radio--sm {
		--radio-size: var(--lumi-icon-sm);
		--radio-dot-size: var(--lumi-space-2xs);
		--radio-label-size: var(--lumi-font-size-sm);
	}

	.lumi-radio--lg {
		--radio-size: var(--lumi-icon-lg);
		--radio-dot-size: var(--lumi-space-sm);
		--radio-label-size: var(--lumi-font-size-lg);
	}

	/* ── Color variants ───────────────────────── */
	.lumi-radio--secondary {
		--radio-color: var(--lumi-color-secondary);
	}
	.lumi-radio--success {
		--radio-color: var(--lumi-color-success);
	}
	.lumi-radio--warning {
		--radio-color: var(--lumi-color-warning);
	}
	.lumi-radio--danger {
		--radio-color: var(--lumi-color-danger);
	}
	.lumi-radio--info {
		--radio-color: var(--lumi-color-info);
	}

	/* ── Hover ────────────────────────────────── */
	.lumi-radio:not(.lumi-radio--disabled):hover .lumi-radio__visual {
		border-color: var(--radio-color);
		background: var(--lumi-color-background-hover);
	}

	.lumi-radio--checked:not(.lumi-radio--disabled):hover .lumi-radio__visual {
		background: var(--lumi-color-surface);
	}

	/* ── Checked ──────────────────────────────── */
	.lumi-radio--checked .lumi-radio__visual {
		border-color: var(--radio-color);
	}

	.lumi-radio--checked .lumi-radio__circle {
		background: var(--radio-color);
		transform: scale(1);
	}

	/* ── Focus ────────────────────────────────── */
	.lumi-radio__input:focus-visible + .lumi-radio__visual {
		box-shadow:
			0 0 0 var(--lumi-border-width-thick) var(--lumi-color-background),
			0 0 0 calc(var(--lumi-border-width-thick) * 2) var(--radio-color);
	}

	/* ── Disabled ─────────────────────────────── */
	.lumi-radio--disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.lumi-radio--disabled .lumi-radio__visual {
		background: var(--lumi-color-background-secondary);
		border-color: var(--lumi-color-border);
	}

	.lumi-radio--disabled.lumi-radio--checked .lumi-radio__visual {
		border-color: var(--lumi-color-border);
	}

	.lumi-radio--disabled.lumi-radio--checked .lumi-radio__circle {
		background: var(--lumi-color-text-muted);
	}

	/* ── Reduced motion ───────────────────────── */
	@media (prefers-reduced-motion: reduce) {
		.lumi-radio__visual,
		.lumi-radio__circle {
			transition: none;
		}
	}
</style>
