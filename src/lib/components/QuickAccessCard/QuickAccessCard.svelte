<script lang="ts">
	import Card from '../Card/Card.svelte';
	import Title from '../Title/Title.svelte';
	import IconBadge from '../IconBadge/IconBadge.svelte';
	import { resolve } from '$app/paths';
	import type { QuickAccessCardProps } from './types';

	const {
		title,
		description,
		icon,
		color = 'primary',
		href,
		hoverable = true,
		class: className = ''
	}: QuickAccessCardProps = $props();

	const cardClasses = $derived(() => {
		return ['lumi-quick-access-card', className].filter(Boolean).join(' ');
	});
</script>

<a href={resolve(href as '/')} class="lumi-block lumi-text-decoration--none">
	<Card {hoverable} class={cardClasses()}>
		<div class="lumi-quick-access-card__container">
			<IconBadge {icon} {color} size="lg" />
			<Title {title} size="md" {color} />
			<p class="lumi-quick-access-card__description">{description}</p>
		</div>
	</Card>
</a>

<style>
	.lumi-quick-access-card__container {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: var(--lumi-space-lg);
		gap: var(--lumi-space-sm);
	}

	.lumi-quick-access-card__description {
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-text-muted);
		margin: 0;
	}
</style>
