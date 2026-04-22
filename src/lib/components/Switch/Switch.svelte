<script lang="ts">
	import type { SwitchProps } from './types';

	let {
		checked = $bindable(false),
		name = '',
		label = '',
		size = 'md',
		color = 'primary',
		disabled = false,
		class: className = '',
		children,
		onchange,
		'aria-label': ariaLabel = ''
	}: SwitchProps = $props();

	const switchId = `lumi-switch-${crypto.randomUUID().slice(0, 8)}`;

	const classes = $derived(
		[
			'lumi-switch',
			`lumi-switch--${size}`,
			`lumi-switch--${color}`,
			checked && 'lumi-switch--checked',
			disabled && 'lumi-switch--disabled',
			className
		]
			.filter(Boolean)
			.join(' ')
	);

	function handleChange(event: Event) {
		if (disabled) return;
		const target = event.target as HTMLInputElement;
		checked = target.checked;
		onchange?.(checked, event);
	}
</script>

<label for={switchId} class={classes}>
	<input
		id={switchId}
		type="checkbox"
		role="switch"
		{name}
		{checked}
		{disabled}
		aria-checked={checked}
		aria-label={ariaLabel || label || undefined}
		class="lumi-switch__input"
		onchange={handleChange}
	/>

	<div class="lumi-switch__track">
		<div class="lumi-switch__thumb"></div>
	</div>

	{#if label || children}
		<span class="lumi-switch__label">
			{#if children}
				{@render children()}
			{:else}
				{label}
			{/if}
		</span>
	{/if}
</label>

<style>
	/* ============================================================================
	 * SWITCH COMPONENT
	 *
	 * Arquitectura de dimensiones:
	 * - track-w/track-h: dimensiones externas del track
	 * - switch-inset: espacio entre borde del track y thumb
	 * - thumb = track-h - 2*inset (automático, siempre centrado)
	 * - travel = track-w - track-h (distancia de desplazamiento)
	 * - Se usa box-shadow inset como "borde" para evitar cálculos con border-box
	 * ============================================================================ */

	.lumi-switch {
		/* Track dimensions using design tokens */
		/* md size: 44px x 24px using closest token values */
		--switch-track-w: calc(var(--lumi-space-xxl) + var(--lumi-space-2xs));
		--switch-track-h: var(--lumi-space-lg);
		--switch-inset: 2px;
		--switch-thumb: calc(var(--switch-track-h) - var(--switch-inset) * 2);
		--switch-travel: calc(var(--switch-track-w) - var(--switch-track-h));
		--switch-stretch: 4px;
		--switch-color: var(--lumi-color-primary);
		--switch-label-size: var(--lumi-font-size-sm);

		position: relative;
		display: inline-flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		cursor: pointer;
		user-select: none;
		font-family: var(--lumi-font-family-sans);
	}

	.lumi-switch__input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 0;
		height: 0;
	}

	/* ── Track ────────────────────────────────── */
	.lumi-switch__track {
		display: flex;
		align-items: center;
		width: var(--switch-track-w);
		height: var(--switch-track-h);
		padding: var(--switch-inset);
		box-sizing: border-box;
		background: var(--lumi-color-border-strong);
		box-shadow: inset 0 0 0 var(--lumi-border-width-thin)
			color-mix(in srgb, var(--lumi-color-border) 60%, transparent);
		border-radius: var(--lumi-radius-full);
		transition:
			background-color var(--lumi-duration-base) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-base) var(--lumi-easing-default);
		flex-shrink: 0;
	}

	/* ── Thumb ───────────────────���────────────── */
	.lumi-switch__thumb {
		width: var(--switch-thumb);
		height: var(--switch-thumb);
		background: var(--lumi-color-white);
		border-radius: var(--lumi-radius-full);
		box-shadow: var(--lumi-shadow-sm);
		flex-shrink: 0;
		transition:
			transform var(--lumi-duration-base) var(--lumi-easing-default),
			width var(--lumi-duration-base) var(--lumi-easing-default);
	}

	/* ── Label ────────────────────────────────── */
	.lumi-switch__label {
		color: var(--lumi-color-text);
		font-size: var(--switch-label-size);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-normal);
	}

	/* ── Checked state ────────────────────────── */
	.lumi-switch--checked .lumi-switch__track {
		background: var(--switch-color);
		box-shadow:
			inset 0 0 0 var(--lumi-border-width-thin)
				color-mix(in srgb, var(--switch-color) 80%, transparent),
			0 0 0 var(--lumi-border-width-thin) color-mix(in srgb, var(--switch-color) 20%, transparent);
	}

	.lumi-switch--checked .lumi-switch__thumb {
		transform: translateX(var(--switch-travel));
	}

	/* ── Hover ────────────────────────────────── */
	.lumi-switch:not(.lumi-switch--disabled):hover .lumi-switch__track {
		box-shadow:
			inset 0 0 0 var(--lumi-border-width-thin)
				color-mix(in srgb, var(--switch-color) 40%, transparent),
			0 0 8px color-mix(in srgb, var(--switch-color) 12%, transparent);
	}

	.lumi-switch--checked:not(.lumi-switch--disabled):hover .lumi-switch__track {
		background: color-mix(in srgb, var(--switch-color) 88%, var(--lumi-color-white));
		box-shadow:
			inset 0 0 0 var(--lumi-border-width-thin)
				color-mix(in srgb, var(--switch-color) 80%, transparent),
			0 0 12px color-mix(in srgb, var(--switch-color) 22%, transparent);
	}

	.lumi-switch:not(.lumi-switch--disabled):hover .lumi-switch__thumb {
		box-shadow: var(--lumi-shadow-md);
	}

	/* ── Active / pressed ─────────────────────── */
	.lumi-switch:not(.lumi-switch--disabled):active .lumi-switch__thumb {
		width: calc(var(--switch-thumb) + var(--switch-stretch));
	}

	.lumi-switch--checked:not(.lumi-switch--disabled):active .lumi-switch__thumb {
		transform: translateX(calc(var(--switch-travel) - var(--switch-stretch)));
	}

	/* ── Focus visible ────────────────────────── */
	.lumi-switch__input:focus-visible + .lumi-switch__track {
		box-shadow:
			0 0 0 var(--lumi-border-width-thick) var(--lumi-color-background),
			0 0 0 calc(var(--lumi-border-width-thick) * 2) var(--switch-color);
	}

	/* ── Size variants ────────────────────────── */
	.lumi-switch--sm {
		/* 36px x 20px track using tokens */
		--switch-track-w: calc(var(--lumi-space-xl) + var(--lumi-space-2xs));
		--switch-track-h: var(--lumi-icon-md);
		--switch-stretch: 3px;
		--switch-label-size: var(--lumi-font-size-xs);
		gap: var(--lumi-space-xs);
	}

	/* md size uses base values from .lumi-switch */

	.lumi-switch--lg {
		/* 52px x 28px track using tokens */
		--switch-track-w: calc(var(--lumi-space-3xl) + var(--lumi-space-2xs));
		--switch-track-h: calc(var(--lumi-space-lg) + var(--lumi-space-2xs));
		--switch-stretch: 5px;
		--switch-label-size: var(--lumi-font-size-base);
		gap: var(--lumi-space-md);
	}

	/* ── Color variants ───────────────────────── */
	.lumi-switch--primary {
		--switch-color: var(--lumi-color-primary);
	}
	.lumi-switch--secondary {
		--switch-color: var(--lumi-color-secondary);
	}
	.lumi-switch--success {
		--switch-color: var(--lumi-color-success);
	}
	.lumi-switch--warning {
		--switch-color: var(--lumi-color-warning);
	}
	.lumi-switch--danger {
		--switch-color: var(--lumi-color-danger);
	}
	.lumi-switch--info {
		--switch-color: var(--lumi-color-info);
	}

	/* ── Disabled state ───────────────────────── */
	.lumi-switch--disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.lumi-switch--disabled .lumi-switch__label {
		cursor: not-allowed;
	}

	.lumi-switch--disabled.lumi-switch--checked .lumi-switch__track {
		background: color-mix(in srgb, var(--switch-color) 55%, var(--lumi-color-border));
	}

	.lumi-switch--disabled:not(.lumi-switch--checked) .lumi-switch__track {
		background: var(--lumi-color-border);
		box-shadow: none;
	}

	/* ── Reduced motion ───────────────────────── */
	@media (prefers-reduced-motion: reduce) {
		.lumi-switch__thumb,
		.lumi-switch__track {
			transition: none;
		}
	}
</style>
