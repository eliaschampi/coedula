<script lang="ts">
	import type { TextareaProps } from './types';

	let {
		value = $bindable(''),
		name = '',
		label = '',
		placeholder = '',
		error = false,
		hint = '',
		maxlength = undefined,
		disabled = false,
		readonly = false,
		rows = 3,
		size = 'md',
		color = 'primary',
		required = false,
		'aria-label': ariaLabel = '',
		showCount = false,
		class: className = '',
		oninput,
		onfocus,
		onblur,
		onkeydown
	}: TextareaProps = $props();

	let textareaRef: HTMLTextAreaElement | undefined = $state();
	let isFocused = $state(false);

	const id = `lumi-textarea-${crypto.randomUUID().slice(0, 8)}`;
	const hasError = $derived(Boolean(error && typeof error === 'string'));
	const describedBy = $derived.by(() => {
		const ids: string[] = [];
		if (hasError) ids.push(`${id}-error`);
		if (hint) ids.push(`${id}-hint`);
		return ids.join(' ');
	});

	const classes = $derived(
		[
			'lumi-textarea',
			`lumi-textarea--${size}`,
			`lumi-textarea--${color}`,
			isFocused && 'lumi-textarea--focused',
			error && 'lumi-textarea--error',
			disabled && 'lumi-textarea--disabled',
			readonly && 'lumi-textarea--readonly',
			className
		]
			.filter(Boolean)
			.join(' ')
	);

	const charCount = $derived(value?.length || 0);

	function handleInput(event: Event): void {
		value = (event.target as HTMLTextAreaElement).value;
		oninput?.(event);
	}

	function handleFocus(event: FocusEvent): void {
		isFocused = true;
		onfocus?.(event);
	}

	function handleBlur(event: FocusEvent): void {
		isFocused = false;
		onblur?.(event);
	}

	function handleKeydown(event: KeyboardEvent): void {
		onkeydown?.(event);
	}

	// Public methods (exposed via bind:this)
	export const focus = () => textareaRef?.focus();
	export const blur = () => textareaRef?.blur();
</script>

<div class={classes}>
	{#if label}
		<label for={id} class="lumi-textarea__label">
			{label}
			{#if required}
				<span class="lumi-textarea__required">*</span>
			{/if}
		</label>
	{/if}

	<div class="lumi-textarea__wrapper">
		<textarea
			{id}
			bind:this={textareaRef}
			{name}
			{placeholder}
			{disabled}
			{readonly}
			{required}
			{rows}
			{maxlength}
			{value}
			aria-label={ariaLabel || label || placeholder || undefined}
			aria-invalid={Boolean(error) || undefined}
			aria-describedby={describedBy || undefined}
			class="lumi-textarea__input"
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			onkeydown={handleKeydown}
		></textarea>

		{#if maxlength && showCount}
			<div class="lumi-textarea__counter">{charCount}/{maxlength}</div>
		{/if}
	</div>

	{#if hasError}
		<div id={`${id}-error`} class="lumi-textarea__error">{error}</div>
	{/if}

	{#if hint}
		<div id={`${id}-hint`} class="lumi-textarea__hint">{hint}</div>
	{/if}
</div>

<style>
	.lumi-textarea {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
		width: 100%;
		--textarea-color: var(--lumi-color-primary);
		--textarea-bg: color-mix(
			in srgb,
			var(--lumi-color-background-hover) 60%,
			var(--lumi-color-surface) 40%
		);
		--textarea-bg-focus: color-mix(
			in srgb,
			var(--lumi-color-surface) 95%,
			var(--textarea-color) 5%
		);
	}

	.lumi-textarea__label {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		cursor: pointer;
		transition: color var(--lumi-duration-base) var(--lumi-easing-default);
	}

	.lumi-textarea__required {
		color: var(--lumi-color-danger);
		margin-left: var(--lumi-space-2xs);
	}

	.lumi-textarea__wrapper {
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.lumi-textarea__input {
		width: 100%;
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		background: var(--textarea-bg);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-md);
		font-family: inherit;
		font-size: var(--lumi-font-size-base);
		line-height: var(--lumi-line-height-normal);
		color: var(--lumi-color-text);
		resize: none;
		field-sizing: content;
		min-height: calc(var(--lumi-space-3xl) + var(--lumi-space-sm));
		overflow-y: hidden;
		transition:
			border-color var(--lumi-duration-base) var(--lumi-easing-default),
			background-color var(--lumi-duration-base) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-base) var(--lumi-easing-default);
	}

	.lumi-textarea__input::placeholder {
		color: var(--lumi-color-text-muted);
	}

	.lumi-textarea__input:focus {
		outline: none;
		border-color: var(--textarea-color);
		background: var(--textarea-bg-focus);
		box-shadow: 0 0 0 var(--lumi-border-width-thick)
			color-mix(in srgb, var(--textarea-color) 20%, transparent);
	}

	.lumi-textarea__input:hover:not(:focus):not(:disabled) {
		border-color: var(--lumi-color-border-strong);
		background: color-mix(in srgb, var(--textarea-bg) 88%, var(--lumi-color-surface) 12%);
	}

	.lumi-textarea__input:disabled {
		opacity: var(--lumi-opacity-disabled);
		cursor: not-allowed;
		background: var(--lumi-color-background-secondary);
		border-color: var(--lumi-color-border);
	}

	.lumi-textarea__input:read-only {
		cursor: default;
		background: var(--textarea-bg);
	}

	.lumi-textarea__input:-webkit-autofill,
	.lumi-textarea__input:-webkit-autofill:hover,
	.lumi-textarea__input:-webkit-autofill:focus {
		-webkit-text-fill-color: var(--lumi-color-text);
		caret-color: var(--lumi-color-text);
		-webkit-box-shadow: 0 0 0 1000px var(--textarea-bg) inset;
		box-shadow: 0 0 0 1000px var(--textarea-bg) inset;
		transition: background-color 99999s ease-out 0s;
	}

	.lumi-textarea--focused .lumi-textarea__input:-webkit-autofill,
	.lumi-textarea--focused .lumi-textarea__input:-webkit-autofill:hover,
	.lumi-textarea--focused .lumi-textarea__input:-webkit-autofill:focus {
		-webkit-box-shadow: 0 0 0 1000px var(--textarea-bg-focus) inset;
		box-shadow: 0 0 0 1000px var(--textarea-bg-focus) inset;
	}

	.lumi-textarea__counter {
		position: absolute;
		bottom: var(--lumi-space-xs);
		right: var(--lumi-space-xs);
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
		background: var(--lumi-color-surface);
		padding: var(--lumi-space-2xs);
		border-radius: var(--lumi-radius-xl);
		pointer-events: none;
	}

	.lumi-textarea__error {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-danger);
		margin-top: var(--lumi-space-2xs);
	}

	.lumi-textarea__hint {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
		margin-top: var(--lumi-space-2xs);
	}

	/* Size variants */
	.lumi-textarea--sm .lumi-textarea__input {
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-textarea--sm .lumi-textarea__counter {
		font-size: var(--lumi-font-size-xs);
		padding: calc(var(--lumi-space-2xs) / 2) var(--lumi-space-2xs);
	}

	.lumi-textarea--md .lumi-textarea__input {
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		font-size: var(--lumi-font-size-base);
	}

	.lumi-textarea--lg .lumi-textarea__input {
		padding: var(--lumi-space-md) var(--lumi-space-lg);
		font-size: var(--lumi-font-size-lg);
	}

	/* Color variants */
	.lumi-textarea--secondary {
		--textarea-color: var(--lumi-color-secondary);
	}
	.lumi-textarea--success {
		--textarea-color: var(--lumi-color-success);
	}
	.lumi-textarea--warning {
		--textarea-color: var(--lumi-color-warning);
	}
	.lumi-textarea--danger {
		--textarea-color: var(--lumi-color-danger);
	}
	.lumi-textarea--info {
		--textarea-color: var(--lumi-color-info);
	}

	/* State variants */
	.lumi-textarea--focused .lumi-textarea__input {
		border-color: var(--textarea-color);
		background: var(--textarea-bg-focus);
	}

	.lumi-textarea--error .lumi-textarea__input {
		border-color: var(--lumi-color-danger);
	}

	.lumi-textarea--error .lumi-textarea__input:focus {
		border-color: var(--lumi-color-danger);
	}

	.lumi-textarea--disabled .lumi-textarea__input {
		opacity: var(--lumi-opacity-disabled);
		cursor: not-allowed;
		background: var(--lumi-color-background-secondary);
		border-color: var(--lumi-color-border);
	}

	.lumi-textarea--readonly .lumi-textarea__input {
		cursor: default;
		background: var(--textarea-bg);
	}
</style>
