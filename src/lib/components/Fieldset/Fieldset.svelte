<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { FieldsetProps } from './types';

	interface Props extends FieldsetProps {
		children?: Snippet;
	}

	const { legend = '', class: className = '', children }: Props = $props();

	const classes = $derived.by(() => ['lumi-fieldset', className].filter(Boolean).join(' '));
</script>

<fieldset class={classes}>
	{#if legend}
		<legend class="lumi-fieldset__legend">{legend}</legend>
	{/if}
	<div class="lumi-fieldset__content">
		{#if children}
			{@render children()}
		{/if}
	</div>
</fieldset>

<style>
	.lumi-fieldset {
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-2xl);
		padding: var(--lumi-space-md);
		margin: 0;
		background:
			linear-gradient(
				180deg,
				rgba(var(--lumi-color-primary-rgb), 0.06) 0%,
				rgba(var(--lumi-color-primary-rgb), 0) 35%
			),
			rgba(var(--lumi-color-background-rgb), 0.3);
		position: relative;
		box-shadow: var(--lumi-shadow-sm);
		transition:
			box-shadow var(--lumi-duration-fast) var(--lumi-easing-default),
			border-color var(--lumi-duration-fast) var(--lumi-easing-default);
	}

	.lumi-fieldset__legend {
		background: var(--lumi-color-background);
		color: var(--lumi-color-text-muted);
		padding: 0 var(--lumi-space-sm);
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		margin-left: var(--lumi-space-md);
		border-radius: var(--lumi-radius-base);
		position: relative;
		z-index: 1;
	}

	.lumi-fieldset__content {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-md);
	}
</style>
