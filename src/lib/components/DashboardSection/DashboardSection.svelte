<script lang="ts">
	import Card from '../Card/Card.svelte';
	import Title from '../Title/Title.svelte';
	import type { DashboardSectionProps } from './types';

	const {
		title,
		subtitle = '',
		icon = '',
		titleColor = 'text',
		spaced = true,
		children,
		actions,
		footer,
		class: className = ''
	}: DashboardSectionProps = $props();

	const classes = $derived(['lumi-dashboard-section', className].filter(Boolean).join(' '));
</script>

<Card class={classes} {spaced}>
	<div
		class="lumi-flex lumi-flex--gap-sm lumi-flex--wrap lumi-justify--between lumi-align-items--start"
	>
		<Title {title} {subtitle} {icon} size="md" color={titleColor} iconColor="primary" />

		{#if actions}
			<div class="lumi-flex lumi-flex--gap-sm lumi-flex--wrap lumi-justify--end">
				{@render actions()}
			</div>
		{/if}
	</div>

	{#if children}
		{@render children()}
	{/if}

	{#if footer}
		<div class="lumi-dashboard-section__footer">
			{@render footer()}
		</div>
	{/if}
</Card>

<style>
	.lumi-dashboard-section__footer {
		padding-top: var(--lumi-space-md);
		border-top: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
	}
</style>
