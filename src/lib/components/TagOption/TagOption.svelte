<script lang="ts">
	import type { TagOptionProps } from './types';

	const {
		label,
		color = 'primary',
		active = false,
		disabled = false,
		onclick
	}: TagOptionProps = $props();
</script>

<button
	type="button"
	class="lumi-tag-option lumi-tag-option--{color}"
	class:lumi-tag-option--active={active}
	class:lumi-tag-option--disabled={disabled}
	{disabled}
	{onclick}
>
	<span class="lumi-tag-option__dot"></span>
	<span class="lumi-tag-option__label">{label}</span>
</button>

<style>
	.lumi-tag-option {
		--color: var(--lumi-color-primary);

		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		width: 100%;
		padding: var(--lumi-space-md);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-lg);
		background: var(--lumi-color-surface);
		color: var(--lumi-color-text);
		font-family: inherit;
		font-size: var(--lumi-font-size-sm);
		cursor: pointer;
		text-align: left;
		transition:
			border-color var(--lumi-duration-base) var(--lumi-easing-default),
			background-color var(--lumi-duration-base) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-base) var(--lumi-easing-default);
	}

	/* Color variants — set the single --color token used by all states */
	.lumi-tag-option--primary {
		--color: var(--lumi-color-primary);
	}
	.lumi-tag-option--secondary {
		--color: var(--lumi-color-secondary);
	}
	.lumi-tag-option--success {
		--color: var(--lumi-color-success);
	}
	.lumi-tag-option--warning {
		--color: var(--lumi-color-warning);
	}
	.lumi-tag-option--danger {
		--color: var(--lumi-color-danger);
	}
	.lumi-tag-option--info {
		--color: var(--lumi-color-info);
	}

	.lumi-tag-option:hover {
		border-color: color-mix(in srgb, var(--color) 26%, var(--lumi-color-border));
		background: color-mix(in srgb, var(--color) 4%, var(--lumi-color-surface));
	}

	.lumi-tag-option:focus-visible {
		outline: var(--lumi-border-width-thick) solid color-mix(in srgb, var(--color) 35%, transparent);
		outline-offset: var(--lumi-space-2xs);
	}

	.lumi-tag-option--active {
		border-color: color-mix(in srgb, var(--color) 40%, var(--lumi-color-border));
		background: color-mix(in srgb, var(--color) 8%, var(--lumi-color-surface));
	}

	.lumi-tag-option--active:hover {
		background: color-mix(in srgb, var(--color) 14%, var(--lumi-color-surface));
	}

	.lumi-tag-option--disabled {
		opacity: var(--lumi-opacity-disabled);
		cursor: not-allowed;
		pointer-events: none;
	}

	.lumi-tag-option__dot {
		width: var(--lumi-icon-xs);
		height: var(--lumi-icon-xs);
		border-radius: var(--lumi-radius-full);
		flex-shrink: 0;
		background: var(--color);
		box-shadow: 0 0 0 var(--lumi-border-width-thick)
			color-mix(in srgb, var(--color) 20%, transparent);
	}

	.lumi-tag-option__label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-tag-option {
			transition: none;
		}
	}
</style>
