<script lang="ts">
	import type { CheckboxProps } from './types';
	import Icon from '../Icon/Icon.svelte';
	import { getIconSize } from '../config';

	let {
		checked = $bindable(false),
		indeterminate = $bindable(false),
		label = '',
		size = 'md',
		color = 'primary',
		disabled = false,
		class: className = '',
		children,
		onchange,
		'aria-label': ariaLabel = ''
	}: CheckboxProps = $props();

	// Generate unique ID
	const checkboxId = `lumi-checkbox-${Math.random().toString(36).substring(2, 11)}`;

	// Computed classes
	const classes = $derived(() => {
		return [
			'lumi-checkbox',
			`lumi-checkbox--${size}`,
			`lumi-checkbox--${color}`,
			(checked || indeterminate) && 'lumi-checkbox--checked',
			disabled && 'lumi-checkbox--disabled',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	const iconSize = $derived(() => `${size === 'sm' ? getIconSize('xs') : getIconSize('sm')}px`);

	// Handle change event
	const handleChange = (event: Event) => {
		if (disabled) return;
		const target = event.target as HTMLInputElement;
		checked = target.checked;
		indeterminate = false; // Reset indeterminate on user interaction
		if (onchange) onchange(checked, event);
	};
</script>

<label for={checkboxId} class={classes()}>
	<!-- Hidden input -->
	<input
		id={checkboxId}
		type="checkbox"
		{checked}
		{disabled}
		aria-label={ariaLabel || label || undefined}
		class="lumi-checkbox__input"
		onchange={handleChange}
		bind:indeterminate
	/>

	<!-- Visual checkbox -->
	<div class="lumi-checkbox__visual" aria-hidden="true">
		{#if indeterminate}
			<Icon icon="minus" size={iconSize()} class="lumi-checkbox__icon" stroke={3} />
		{:else if checked}
			<Icon icon="check" size={iconSize()} class="lumi-checkbox__icon" stroke={3} />
		{/if}
	</div>

	<!-- Label -->
	{#if label || children}
		<span class="lumi-checkbox__label">
			{#if children}
				{@render children()}
			{:else}
				{label}
			{/if}
		</span>
	{/if}
</label>

<style>
	.lumi-checkbox {
		--checkbox-size: var(--lumi-icon-md);
		--checkbox-label-size: var(--lumi-font-size-base);
		--checkbox-radius: var(--lumi-radius-md);
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		cursor: pointer;
		user-select: none;
		font-family: var(--lumi-font-family-sans);
		transition: var(--lumi-transition-opacity);
	}

	/* Hidden input */
	.lumi-checkbox__input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 0;
		height: 0;
	}

	/* Visual checkbox */
	.lumi-checkbox__visual {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--checkbox-size);
		height: var(--checkbox-size);
		border: var(--lumi-border-width-thick) solid var(--lumi-color-border);
		border-radius: var(--checkbox-radius);
		background: var(--lumi-color-surface);
		transition: var(--lumi-transition-all);
		flex-shrink: 0;
		overflow: hidden;
	}

	/* Check mark icon */
	:global(.lumi-checkbox__icon) {
		color: var(--lumi-color-white);
		opacity: 0;
		transform: scale(0.6);
		transition: var(--lumi-transition-all);
		pointer-events: none;
	}

	/* Label */
	.lumi-checkbox__label {
		color: var(--lumi-color-text);
		font-size: var(--checkbox-label-size);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-tight);
		cursor: pointer;
	}

	/* Sizes */
	.lumi-checkbox--sm {
		--checkbox-size: var(--lumi-icon-sm);
		--checkbox-label-size: var(--lumi-font-size-sm);
		--checkbox-radius: var(--lumi-radius-sm);
	}

	.lumi-checkbox--md {
		--checkbox-size: var(--lumi-icon-md);
		--checkbox-label-size: var(--lumi-font-size-base);
		--checkbox-radius: var(--lumi-radius-md);
	}

	/* Color variants */
	.lumi-checkbox {
		--checkbox-color: var(--lumi-color-primary);
	}
	.lumi-checkbox--secondary {
		--checkbox-color: var(--lumi-color-secondary);
	}
	.lumi-checkbox--success {
		--checkbox-color: var(--lumi-color-success);
	}
	.lumi-checkbox--warning {
		--checkbox-color: var(--lumi-color-warning);
	}
	.lumi-checkbox--danger {
		--checkbox-color: var(--lumi-color-danger);
	}
	.lumi-checkbox--info {
		--checkbox-color: var(--lumi-color-info);
	}

	/* Checked / Indeterminate state */
	.lumi-checkbox--checked .lumi-checkbox__visual {
		background: var(--checkbox-color);
		border-color: var(--checkbox-color);
	}

	.lumi-checkbox--checked :global(.lumi-checkbox__icon) {
		opacity: 1;
		transform: scale(1);
	}

	.lumi-checkbox__input:focus-visible + .lumi-checkbox__visual {
		box-shadow:
			0 0 0 var(--lumi-border-width-thick) var(--lumi-color-background),
			0 0 0 calc(var(--lumi-border-width-thick) * 2) var(--checkbox-color);
	}

	.lumi-checkbox:not(.lumi-checkbox--disabled):hover .lumi-checkbox__visual {
		border-color: var(--checkbox-color);
		background: var(--lumi-color-background-hover);
	}

	.lumi-checkbox--checked:not(.lumi-checkbox--disabled):hover .lumi-checkbox__visual {
		background: var(--checkbox-color);
	}

	/* Disabled state */
	.lumi-checkbox--disabled {
		cursor: not-allowed;
		opacity: var(--lumi-opacity-disabled);
	}

	.lumi-checkbox--disabled .lumi-checkbox__visual {
		background: var(--lumi-color-background-secondary);
		border-color: var(--lumi-color-border);
	}

	.lumi-checkbox--disabled.lumi-checkbox--checked .lumi-checkbox__visual {
		background: var(--lumi-color-border);
		border-color: var(--lumi-color-border);
	}
</style>
