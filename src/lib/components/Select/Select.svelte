<script lang="ts">
	import { tick } from 'svelte';
	import { portal } from '$lib/actions/portal';
	import { createFloating } from '$lib/utils/floating.svelte';
	import Icon from '../Icon/Icon.svelte';
	import { getIconSize } from '../config';
	import type { SelectProps } from './types';

	type OptionValue = string | number | Record<string, unknown>;

	interface NormalizedOption {
		value: OptionValue | null;
		label: string;
		disabled: boolean;
		key: string;
	}

	let {
		value = $bindable(null),
		options = [],
		placeholder = 'Selecciona una opción',
		label = '',
		name = '',
		'aria-label': ariaLabel = '',
		size = 'md',
		disabled = false,
		autocomplete = false,
		error = false,
		errorMessage = '',
		noDataText = 'Sin opciones disponibles',
		width = '100%',
		valueKey = 'value',
		labelKey = 'label',
		disabledKey = 'disabled',
		clearable = true,
		loading = false,
		placement = 'bottom-start',
		maxHeight = 250,
		offset = 4,
		class: className = '',
		onchange,
		onopen,
		onclose,
		onsearch
	}: SelectProps = $props();

	let selectRef: HTMLDivElement | undefined = $state();
	let inputRef: HTMLInputElement | undefined = $state();
	let dropdownRef: HTMLDivElement | undefined = $state();
	let focusedIndex = $state(-1);
	let filterText = $state('');

	const floating = createFloating(
		() => selectRef,
		() => dropdownRef,
		() => ({
			placement,
			matchWidth: true,
			maxHeight,
			offset,
			zIndex: 'var(--lumi-z-dropdown)',
			strategy: 'fixed'
		})
	);

	// ── Deep equality ──────────────────────────
	function isEqual(a: unknown, b: unknown): boolean {
		if (a === b) return true;
		if (a == null || b == null) return false;
		if (typeof a !== typeof b) return false;
		if (typeof a !== 'object') return false;

		const objA = a as Record<string, unknown>;
		const objB = b as Record<string, unknown>;
		const keysA = Object.keys(objA);

		if (keysA.length !== Object.keys(objB).length) return false;
		return keysA.every(
			(key) => Object.prototype.hasOwnProperty.call(objB, key) && isEqual(objA[key], objB[key])
		);
	}

	function toOptionKey(optionValue: OptionValue | null, index: number): string {
		if (optionValue == null) return `opt-${index}`;
		if (typeof optionValue === 'object') {
			try {
				return `opt-${index}-${JSON.stringify(optionValue)}`;
			} catch {
				return `opt-${index}`;
			}
		}
		return `${String(optionValue)}-${index}`;
	}

	// ── IDs ────────────────────────────────────
	const uniqueId = crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);
	const inputId = `lumi-select-${uniqueId}`;
	const dropdownId = `lumi-select-dropdown-${uniqueId}`;
	const errorId = `${inputId}-error`;

	const iconSize = $derived(`${getIconSize(size)}px`);

	// ── Normalize options ──────────────────────
	const normalizedOptions = $derived.by(() => {
		if (!options?.length) return [];

		return options.map((option, index) => {
			if (typeof option === 'object' && option !== null) {
				const rec = option as Record<string, unknown>;
				const optValue = (rec[valueKey] ?? null) as OptionValue | null;
				const optLabel = rec[labelKey] ?? optValue ?? '';

				return {
					value: optValue,
					label: String(optLabel),
					disabled: Boolean(rec[disabledKey]),
					key: toOptionKey(optValue, index)
				} satisfies NormalizedOption;
			}

			return {
				value: option as string | number,
				label: String(option),
				disabled: false,
				key: toOptionKey(option, index)
			} satisfies NormalizedOption;
		});
	});

	// ── Derived state ──────────────────────────
	const selectedOption = $derived.by(() =>
		normalizedOptions.find((opt) => isEqual(opt.value, value))
	);
	const selectedKey = $derived(selectedOption?.key ?? null);
	const selectedLabel = $derived(selectedOption?.label ?? '');
	const displayValue = $derived(floating.isOpen && autocomplete ? filterText : selectedLabel);
	const hasValue = $derived(value != null && value !== '');
	const showClearButton = $derived(clearable && hasValue && !disabled && !loading);

	const isFilterActive = $derived.by(() => {
		if (!autocomplete || !filterText || !floating.isOpen) return false;
		return filterText.toLowerCase() !== selectedLabel.toLowerCase();
	});

	const visibleOptions = $derived.by(() => {
		if (!isFilterActive) return normalizedOptions;
		const query = filterText.toLowerCase();
		return normalizedOptions.filter((opt) => opt.label.toLowerCase().includes(query));
	});

	const navigableIndices = $derived(
		visibleOptions.reduce<number[]>((acc, opt, i) => {
			if (!opt.disabled) acc.push(i);
			return acc;
		}, [])
	);

	// ── Methods ────────────────────────────────
	function getOptionId(index: number): string {
		return `${dropdownId}-opt-${index}`;
	}

	function toggleDropdown(): void {
		if (floating.isOpen) {
			closeDropdown();
			return;
		}
		openDropdown();
	}

	function handleInputClick(): void {
		if (disabled || loading) return;

		if (!floating.isOpen) {
			openDropdown();
			return;
		}

		if (!autocomplete) {
			closeDropdown();
		}
	}

	function handleTriggerClick(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
		toggleDropdown();
		inputRef?.focus();
	}

	function openDropdown(): void {
		if (disabled || loading || floating.isOpen) return;
		floating.open();
		inputRef?.focus();
		filterText = selectedLabel;
		focusedIndex = selectedOption
			? visibleOptions.findIndex((opt) => isEqual(opt.value, selectedOption.value))
			: -1;
		onopen?.();
	}

	function closeDropdown(): void {
		if (!floating.isOpen) return;
		floating.close();
		focusedIndex = -1;
		filterText = '';
		onclose?.();
	}

	function handleInput(event: Event): void {
		if (!autocomplete) return;
		if (!floating.isOpen) openDropdown();
		const val = (event.target as HTMLInputElement).value;
		filterText = val;
		focusedIndex = -1;
		onsearch?.(val);
	}

	async function scrollToFocused(): Promise<void> {
		await tick();
		dropdownRef
			?.querySelector(`[id="${getOptionId(focusedIndex)}"]`)
			?.scrollIntoView({ block: 'nearest' });
	}

	function moveFocus(direction: 1 | -1): void {
		if (!navigableIndices.length) return;
		const currentIdx = navigableIndices.indexOf(focusedIndex);
		const nextIdx =
			currentIdx === -1 && direction === 1
				? navigableIndices[0]
				: navigableIndices[currentIdx + direction];
		if (nextIdx !== undefined) {
			focusedIndex = nextIdx;
			scrollToFocused();
		}
	}

	function handleKeydown(event: KeyboardEvent): void {
		switch (event.key) {
			case 'Enter':
				event.preventDefault();
				if (!floating.isOpen) {
					openDropdown();
				} else if (focusedIndex >= 0) {
					const option = visibleOptions[focusedIndex];
					if (option && !option.disabled) selectOption(option);
				}
				break;

			case 'Escape':
				event.preventDefault();
				closeDropdown();
				break;

			case 'ArrowDown':
				event.preventDefault();
				if (!floating.isOpen) openDropdown();
				else moveFocus(1);
				break;

			case 'ArrowUp':
				event.preventDefault();
				if (!floating.isOpen) openDropdown();
				else moveFocus(-1);
				break;

			case 'Home':
				if (floating.isOpen && navigableIndices.length) {
					event.preventDefault();
					focusedIndex = navigableIndices[0];
					scrollToFocused();
				}
				break;

			case 'End':
				if (floating.isOpen && navigableIndices.length) {
					event.preventDefault();
					focusedIndex = navigableIndices.at(-1)!;
					scrollToFocused();
				}
				break;
		}
	}

	function selectOption(option: NormalizedOption): void {
		if (option.disabled) return;
		value = option.value;
		onchange?.(option.value);
		closeDropdown();
	}

	function clearValue(event: MouseEvent): void {
		event.stopPropagation();
		value = null;
		onchange?.(null);
		filterText = '';
		if (autocomplete) inputRef?.focus();
	}

	function handleClickOutside(event: MouseEvent): void {
		const target = event.target as Node;
		if (selectRef?.contains(target) || dropdownRef?.contains(target)) return;
		closeDropdown();
	}

	$effect(() => {
		if (floating.isOpen) {
			document.addEventListener('pointerdown', handleClickOutside, true);
			return () => document.removeEventListener('pointerdown', handleClickOutside, true);
		}
	});
</script>

<div
	bind:this={selectRef}
	class="lumi-select lumi-select--{size} {className}"
	class:lumi-select--active={floating.isOpen}
	class:lumi-select--disabled={disabled}
	class:lumi-select--error={error}
	class:lumi-select--loading={loading}
	style={width ? `width: ${width}` : undefined}
>
	{#if label}
		<label for={inputId} class="lumi-select__label">
			{label}
		</label>
	{/if}

	<div class="lumi-select__container">
		{#if name}
			<input
				type="hidden"
				{name}
				value={value == null
					? ''
					: typeof value === 'object'
						? JSON.stringify(value)
						: String(value)}
			/>
		{/if}

		<input
			bind:this={inputRef}
			id={inputId}
			type="text"
			readonly={!autocomplete}
			{disabled}
			{placeholder}
			class="lumi-select__input"
			role="combobox"
			aria-expanded={floating.isOpen}
			aria-controls={dropdownId}
			aria-haspopup="listbox"
			aria-autocomplete={autocomplete ? 'list' : 'none'}
			aria-activedescendant={focusedIndex > -1 ? getOptionId(focusedIndex) : undefined}
			aria-label={ariaLabel || label || placeholder}
			aria-invalid={error || undefined}
			aria-errormessage={error && errorMessage ? errorId : undefined}
			value={displayValue}
			onclick={handleInputClick}
			onkeydown={handleKeydown}
			oninput={handleInput}
		/>

		{#if loading}
			<div class="lumi-select__suffix" aria-hidden="true">
				<div class="lumi-select__spinner"></div>
			</div>
		{:else if showClearButton}
			<button
				type="button"
				class="lumi-select__clear"
				aria-label="Clear selection"
				tabindex="-1"
				onclick={clearValue}
			>
				<Icon icon="x" size={iconSize} />
			</button>
		{:else}
			<button
				type="button"
				class="lumi-select__trigger lumi-select__arrow"
				aria-label={floating.isOpen ? 'Cerrar opciones' : 'Abrir opciones'}
				tabindex="-1"
				onclick={handleTriggerClick}
			>
				<Icon icon="chevronDown" size={iconSize} />
			</button>
		{/if}
	</div>

	{#if floating.isOpen}
		<div
			bind:this={dropdownRef}
			use:portal
			id={dropdownId}
			class="lumi-select__dropdown"
			style:position={floating.floatingStyles.position}
			style:top={floating.floatingStyles.top}
			style:left={floating.floatingStyles.left}
			style:z-index={floating.floatingStyles.zIndex}
			style:width={floating.floatingStyles.width}
			style:max-height={floating.floatingStyles.maxHeight}
			role="listbox"
			aria-label={label || placeholder}
		>
			<div class="lumi-select__dropdown-content">
				{#if loading}
					<div class="lumi-select__empty">
						<div class="lumi-select__spinner"></div>
						<span>Loading options...</span>
					</div>
				{:else if visibleOptions.length === 0}
					<div class="lumi-select__empty">
						{noDataText}
					</div>
				{:else}
					{#each visibleOptions as option, index (option.key)}
						{@const isItemSelected = option.key === selectedKey}
						{@const isItemFocused = focusedIndex === index}
						<div
							id={getOptionId(index)}
							class="lumi-select__option"
							class:lumi-select__option--selected={isItemSelected}
							class:lumi-select__option--focused={isItemFocused}
							class:lumi-select__option--disabled={option.disabled}
							role="option"
							aria-selected={isItemSelected}
							aria-disabled={option.disabled || undefined}
							onclick={() => selectOption(option)}
							onkeydown={(event) => {
								if (option.disabled) return;
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									selectOption(option);
								}
							}}
							onmouseenter={() => {
								if (!option.disabled) focusedIndex = index;
							}}
							tabindex="-1"
						>
							{#if isItemSelected}
								<span class="lumi-select__option-check" aria-hidden="true">
									<Icon icon="check" size={iconSize} />
								</span>
							{/if}
							<span class="lumi-select__option-label">{option.label}</span>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}

	<div
		class="lumi-select__footer"
		class:lumi-select__footer--visible={!!(error && errorMessage)}
		aria-live="polite"
	>
		{#if error && errorMessage}
			<span id={errorId} class="lumi-select__error">{errorMessage}</span>
		{/if}
	</div>
</div>

<style>
	.lumi-select {
		position: relative;
		width: 100%;
		font-family: var(--lumi-font-family-sans);
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
		--select-border: var(--lumi-color-border);
		--select-focus: var(--lumi-color-primary);
		--select-bg: color-mix(
			in srgb,
			var(--lumi-color-background-hover) 70%,
			var(--lumi-color-surface) 30%
		);
		--select-bg-focus: color-mix(in srgb, var(--lumi-color-surface) 88%, var(--select-focus) 12%);
	}

	/* ── Label ────────────────────────────────── */
	.lumi-select__label {
		display: block;
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		cursor: pointer;
		transition: color var(--lumi-duration-base) var(--lumi-easing-default);
	}

	.lumi-select--active .lumi-select__label {
		color: var(--select-focus);
	}

	/* ── Container ────────────────────────────── */
	.lumi-select__container {
		position: relative;
		display: flex;
		align-items: center;
		min-height: var(--lumi-control-height-md);
		background: var(--select-bg);
		border: var(--lumi-border-width-thin) solid var(--select-border);
		border-radius: var(--lumi-radius-md);
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease,
			background-color 0.2s ease;
		cursor: pointer;
		overflow: hidden;
	}

	.lumi-select:not(.lumi-select--error, .lumi-select--active, .lumi-select--disabled)
		.lumi-select__container:hover {
		border-color: var(--lumi-color-border-strong);
	}

	.lumi-select--active .lumi-select__container {
		border-color: var(--select-focus);
		background: var(--select-bg-focus);
		box-shadow: 0 0 0 var(--lumi-border-width-thick)
			color-mix(in srgb, var(--select-focus) 20%, transparent);
	}

	/* ── Input ────────────────────────────────── */
	.lumi-select__input {
		flex: 1;
		width: 100%;
		min-width: 0;
		padding-block: var(--lumi-space-xs);
		padding-inline: var(--lumi-space-sm);
		background: transparent;
		border: none;
		outline: none;
		font-size: var(--lumi-font-size-base);
		color: var(--lumi-color-text);
		cursor: pointer;
		font-family: inherit;
		line-height: var(--lumi-line-height-normal);
	}

	.lumi-select__input::placeholder {
		color: var(--lumi-color-text-muted);
		opacity: 0.7;
	}

	.lumi-select__input:not([readonly]) {
		cursor: text;
	}

	.lumi-select__input:-webkit-autofill,
	.lumi-select__input:-webkit-autofill:hover,
	.lumi-select__input:-webkit-autofill:focus {
		-webkit-text-fill-color: var(--lumi-color-text);
		caret-color: var(--lumi-color-text);
		-webkit-box-shadow: 0 0 0 1000px var(--select-bg) inset;
		box-shadow: 0 0 0 1000px var(--select-bg) inset;
		transition: background-color 99999s ease-out 0s;
	}

	.lumi-select--active .lumi-select__input:-webkit-autofill,
	.lumi-select--active .lumi-select__input:-webkit-autofill:hover,
	.lumi-select--active .lumi-select__input:-webkit-autofill:focus {
		-webkit-box-shadow: 0 0 0 1000px var(--select-bg-focus) inset;
		box-shadow: 0 0 0 1000px var(--select-bg-focus) inset;
	}

	/* ── Suffix (arrow / spinner) ─────────────── */
	.lumi-select__suffix {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 var(--lumi-space-sm);
		color: var(--lumi-color-text-muted);
		flex-shrink: 0;
		pointer-events: none;
	}

	.lumi-select__arrow {
		transition:
			transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
			color 0.2s ease;
	}

	.lumi-select__trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 var(--lumi-space-sm);
		color: var(--lumi-color-text-muted);
		background: transparent;
		border: none;
		cursor: pointer;
		flex-shrink: 0;
		transition: color var(--lumi-duration-base) var(--lumi-easing-default);
	}

	.lumi-select--active .lumi-select__arrow {
		transform: rotate(180deg);
		color: var(--select-focus);
	}

	/* ── Clear button ─────────────────────────── */
	.lumi-select__clear {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--lumi-space-2xs);
		margin-right: var(--lumi-space-xs);
		background: transparent;
		border: none;
		border-radius: var(--lumi-radius-full);
		color: var(--lumi-color-text-muted);
		cursor: pointer;
		flex-shrink: 0;
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}

	.lumi-select__clear:hover {
		background: var(--lumi-color-background-hover);
		color: var(--lumi-color-danger);
	}

	.lumi-select__clear:focus-visible {
		outline: var(--lumi-border-width-thick) solid
			color-mix(in srgb, var(--select-focus) 35%, transparent);
		outline-offset: calc(var(--lumi-space-2xs) * -1);
	}

	/* ── Dropdown ─────────────────────────────── */
	.lumi-select__dropdown {
		background:
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--select-focus) 5%, transparent) 0%,
				transparent 22%
			),
			var(--lumi-color-surface-overlay);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-xl);
		overflow: hidden;
		box-shadow: var(--lumi-shadow-lg);
		padding: var(--lumi-space-xs);
		display: flex;
		flex-direction: column;
		backdrop-filter: blur(var(--lumi-blur-md));
		-webkit-backdrop-filter: blur(var(--lumi-blur-md));
		animation: select-dropdown-in 0.15s cubic-bezier(0.2, 0, 0.13, 1.5);
		transform-origin: top center;
	}

	@keyframes select-dropdown-in {
		from {
			opacity: 0;
			transform: scaleY(0.96) translateY(-4px);
		}
		to {
			opacity: 1;
			transform: scaleY(1) translateY(0);
		}
	}

	.lumi-select__dropdown-content {
		overflow-y: auto;
		max-height: inherit;
		overscroll-behavior: contain;
	}

	.lumi-select__dropdown-content::-webkit-scrollbar {
		width: var(--lumi-space-2xs);
	}

	.lumi-select__dropdown-content::-webkit-scrollbar-track {
		background: transparent;
	}

	.lumi-select__dropdown-content::-webkit-scrollbar-thumb {
		background: var(--lumi-color-border);
		border-radius: var(--lumi-radius-full);
	}

	/* ── Options ──────────────────────────────── */
	.lumi-select__option {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		cursor: pointer;
		user-select: none;
		color: var(--lumi-color-text);
		font-size: var(--lumi-font-size-base);
		border-radius: var(--lumi-radius-md);
		transition: background-color var(--lumi-duration-fast) var(--lumi-easing-default);
	}

	.lumi-select__option--focused:not(.lumi-select__option--disabled) {
		background: var(--lumi-color-background-hover);
	}

	.lumi-select__option--selected {
		color: var(--lumi-color-primary);
		font-weight: var(--lumi-font-weight-medium);
	}

	.lumi-select__option--selected.lumi-select__option--focused {
		background: color-mix(in srgb, var(--lumi-color-primary) 12%, transparent);
	}

	.lumi-select__option--disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.lumi-select__option-check {
		display: inline-flex;
		flex-shrink: 0;
		color: var(--lumi-color-primary);
	}

	.lumi-select__option-label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* ── Empty / no-data ──────────────────────── */
	.lumi-select__empty {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-lg) var(--lumi-space-md);
		color: var(--lumi-color-text-muted);
		font-size: var(--lumi-font-size-sm);
	}

	/* ── Footer (error message) ───────────────── */
	.lumi-select__footer {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows var(--lumi-duration-base) var(--lumi-easing-default);
		overflow: hidden;
		margin-top: calc(var(--lumi-space-2xs) * -1);
	}

	.lumi-select__footer--visible {
		grid-template-rows: 1fr;
	}

	.lumi-select__footer > span {
		overflow: hidden;
		min-height: 0;
	}

	.lumi-select__error {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-danger);
		padding-top: var(--lumi-space-2xs);
	}

	/* ── Size variants ────────────────────────── */
	.lumi-select--sm .lumi-select__container {
		min-height: var(--lumi-control-height-sm);
	}

	.lumi-select--sm .lumi-select__input {
		padding-block: var(--lumi-space-xs);
		padding-inline: var(--lumi-space-sm);
		font-size: var(--lumi-font-size-sm);
	}
	.lumi-select--sm .lumi-select__option {
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-select--md .lumi-select__container {
		min-height: var(--lumi-control-height-md);
	}

	.lumi-select--md .lumi-select__input {
		padding-block: var(--lumi-space-xs);
		padding-inline: var(--lumi-space-sm);
		font-size: var(--lumi-font-size-base);
	}

	.lumi-select--lg .lumi-select__container {
		min-height: var(--lumi-control-height-lg);
	}

	.lumi-select--lg .lumi-select__input {
		padding-block: var(--lumi-space-md);
		padding-inline: var(--lumi-space-md);
		font-size: var(--lumi-font-size-lg);
	}
	.lumi-select--lg .lumi-select__option {
		padding: var(--lumi-space-sm) var(--lumi-space-lg);
		font-size: var(--lumi-font-size-lg);
	}

	/* ── States ───────────────────────────────── */
	.lumi-select--disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.lumi-select--error {
		--select-border: var(--lumi-color-danger);
		--select-focus: var(--lumi-color-danger);
	}

	/* ── Spinner ──────────────────────────────── */
	.lumi-select__spinner {
		width: 1em;
		height: 1em;
		border: var(--lumi-border-width-thick) solid var(--lumi-color-border);
		border-top-color: var(--select-focus);
		border-radius: 50%;
		animation: lumi-select-spin 0.6s linear infinite;
	}

	@keyframes lumi-select-spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ── Reduced motion ───────────────────────── */
	@media (prefers-reduced-motion: reduce) {
		.lumi-select__dropdown {
			animation: none;
		}
		.lumi-select__arrow,
		.lumi-select__container,
		.lumi-select__clear,
		.lumi-select__option {
			transition: none;
		}
	}
</style>
