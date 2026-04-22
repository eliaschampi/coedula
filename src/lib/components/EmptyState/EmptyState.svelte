<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import type { EmptyStateProps } from './types';
	import { getIconSize } from '../config';

	interface Props extends EmptyStateProps {
		visual?: Snippet;
		titleSlot?: Snippet;
		descriptionSlot?: Snippet;
		actions?: Snippet;
	}

	const {
		title = 'No hay datos disponibles aquí',
		description = '',
		image = '',
		icon = '',
		iconColor = 'muted',
		class: className = '',
		visual,
		titleSlot,
		descriptionSlot,
		actions
	}: Props = $props();

	// Use 2xl icon size (40px) for empty states - as per design system
	// Note: For a 64px icon, consider adding --lumi-icon-3xl to tokens.css
	const emptyStateIconSize = `${getIconSize('2xl')}px`;

	const classes = $derived(() => {
		return ['lumi-empty-state', className].filter(Boolean).join(' ');
	});

	const imageUrl = $derived(() => {
		if (!image) return '';

		// If it's already a full URL, return as is
		if (image.startsWith('http') || image.startsWith('/')) {
			return image;
		}

		// Otherwise, assume it's in assets
		return `/assets/images/${image}`;
	});
</script>

<div class={classes()}>
	<!-- Image/Icon -->
	<div class="lumi-empty-state__visual">
		{#if visual}
			{@render visual()}
		{:else if image}
			<img src={imageUrl()} alt={title || 'Empty state'} class="lumi-empty-state__image" />
		{:else if icon}
			<div class="lumi-empty-state__icon">
				<Icon {icon} size={emptyStateIconSize} color={`var(--lumi-color-${iconColor})`} />
			</div>
		{:else}
			<div class="lumi-empty-state__default-icon">
				<Icon icon="inbox" size={emptyStateIconSize} color="var(--lumi-color-text-muted)" />
			</div>
		{/if}
	</div>

	<!-- Content -->
	<div class="lumi-empty-state__content">
		<!-- Title -->
		{#if title || titleSlot}
			<h3 class="lumi-empty-state__title">
				{#if titleSlot}
					{@render titleSlot()}
				{:else}
					{title}
				{/if}
			</h3>
		{/if}

		<!-- Description -->
		{#if description || descriptionSlot}
			<p class="lumi-empty-state__description">
				{#if descriptionSlot}
					{@render descriptionSlot()}
				{:else}
					{description}
				{/if}
			</p>
		{/if}

		<!-- Actions -->
		{#if actions}
			<div class="lumi-empty-state__actions">
				{@render actions()}
			</div>
		{/if}
	</div>
</div>

<style>
	.lumi-empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-lg);
		padding: var(--lumi-space-2xl);
		text-align: center;
		font-family: var(--lumi-font-family-sans);
		line-height: var(--lumi-line-height-normal);
		transition: var(--lumi-transition-all);
	}

	/* Visual container */
	.lumi-empty-state__visual {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-space-4xl);
		height: var(--lumi-space-4xl);
		color: var(--lumi-color-text-muted);
	}

	/* Icon styling */
	.lumi-empty-state__icon {
		width: 100%;
		height: 100%;
		opacity: 0.6;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: var(--lumi-transition-opacity);
	}

	/* Default icon */
	.lumi-empty-state__default-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		opacity: 0.4;
		transition: var(--lumi-transition-opacity);
	}

	/* Image styling */
	.lumi-empty-state__image {
		width: 100%;
		height: 100%;
		object-fit: contain;
		border-radius: var(--lumi-radius-lg);
		opacity: 0.8;
		transition: var(--lumi-transition-opacity);
	}

	/* Content container */
	.lumi-empty-state__content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--lumi-space-md);
		max-width: 400px;
	}

	/* Title */
	.lumi-empty-state__title {
		margin: 0;
		font-size: var(--lumi-font-size-xl);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-tight);
	}

	/* Description */
	.lumi-empty-state__description {
		margin: 0;
		font-size: var(--lumi-font-size-base);
		font-weight: var(--lumi-font-weight-normal);
		color: var(--lumi-color-text-muted);
		line-height: var(--lumi-line-height-normal);
	}

	/* Actions container */
	.lumi-empty-state__actions {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		margin-top: var(--lumi-space-sm);
	}

	/* Hover effects */
	.lumi-empty-state:hover .lumi-empty-state__visual {
		transform: scale(1.02);
	}

	.lumi-empty-state:hover .lumi-empty-state__icon,
	.lumi-empty-state:hover .lumi-empty-state__default-icon {
		opacity: 0.8;
	}

	.lumi-empty-state:hover .lumi-empty-state__image {
		opacity: 1;
	}

	/* Focus styles */
	.lumi-empty-state:focus-visible {
		outline: var(--lumi-border-width-thick) solid var(--lumi-color-primary);
		outline-offset: var(--lumi-space-2xs);
		border-radius: var(--lumi-radius-lg);
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.lumi-empty-state,
		.lumi-empty-state__visual,
		.lumi-empty-state__icon,
		.lumi-empty-state__default-icon,
		.lumi-empty-state__image {
			transition: none;
		}

		.lumi-empty-state:hover .lumi-empty-state__visual {
			transform: none;
		}
	}
</style>
