<script lang="ts">
	import Icon from '../Icon/Icon.svelte';
	import { getIconSize } from '../config';
	import type { DividerProps } from './types';

	const {
		position = 'center',
		icon = undefined,
		text = undefined,
		spaced = true,
		'aria-label': ariaLabel = '',
		class: className = '',
		onclick
	}: DividerProps = $props();

	const hasContent = $derived(!!icon || !!text);
	const iconSize = `${getIconSize('sm')}px`;

	const dividerClasses = $derived(() => {
		return [
			'lumi-divider',
			`lumi-divider--${position}`,
			onclick && 'lumi-divider--interactive',
			hasContent && 'lumi-divider--with-content',
			spaced && 'lumi-divider--spaced',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	function handleKeydown(e: KeyboardEvent) {
		if (onclick && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			// Create a synthetic MouseEvent for keyboard activation
			const syntheticEvent = new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
				view: window
			});
			onclick(syntheticEvent);
		}
	}
</script>

{#snippet dividerContent()}
	{#if hasContent && position !== 'left'}
		<span class="lumi-divider__line lumi-divider__line--before"></span>
	{/if}

	{#if hasContent}
		<span class="lumi-divider__content">
			{#if icon}
				<Icon {icon} size={iconSize} class="lumi-divider__icon" />
			{:else}
				<span>{text}</span>
			{/if}
		</span>
	{/if}

	{#if hasContent && position !== 'right'}
		<span class="lumi-divider__line lumi-divider__line--after"></span>
	{:else if !hasContent}
		<span class="lumi-divider__line lumi-divider__line--full"></span>
	{/if}
{/snippet}

{#if onclick}
	<button
		type="button"
		class={dividerClasses()}
		{onclick}
		onkeydown={handleKeydown}
		aria-label={ariaLabel || 'Divider button'}
	>
		{@render dividerContent()}
	</button>
{:else}
	<div class={dividerClasses()} role="separator">
		{@render dividerContent()}
	</div>
{/if}

<style>
	.lumi-divider {
		display: flex;
		align-items: center;
		width: 100%;
		color: var(--lumi-color-text-muted);
		background: transparent;
		border: none;
		padding: 0;
	}

	.lumi-divider--spaced {
		margin: var(--lumi-space-md) 0;
	}

	.lumi-divider__line {
		flex: 1;
		height: var(--lumi-border-width-thin);
		background: linear-gradient(
			90deg,
			var(--lumi-color-border-light),
			var(--lumi-color-border),
			var(--lumi-color-border-light)
		);
	}

	.lumi-divider__line--full {
		width: 100%;
	}

	.lumi-divider__line--before {
		margin-right: var(--lumi-space-sm);
	}

	.lumi-divider__line--after {
		margin-left: var(--lumi-space-sm);
	}

	.lumi-divider__content {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		color: var(--lumi-color-text-muted);
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		white-space: nowrap;
		background: var(--lumi-color-surface-overlay);
		border-radius: var(--lumi-radius-2xl);
		border: none;
		min-width: fit-content;
		flex-shrink: 0;
		backdrop-filter: blur(var(--lumi-blur-sm));
		-webkit-backdrop-filter: blur(var(--lumi-blur-sm));
		transition: var(--lumi-transition-colors);
	}

	.lumi-divider__icon {
		width: var(--lumi-space-md);
		height: var(--lumi-space-md);
		color: inherit;
	}

	.lumi-divider:hover .lumi-divider__line {
		background: var(--lumi-color-border-strong);
	}

	.lumi-divider--interactive {
		cursor: pointer;
	}

	.lumi-divider--interactive:focus-visible {
		outline: var(--lumi-border-width-thick) solid
			color-mix(in srgb, var(--lumi-color-primary) 30%, transparent);
		outline-offset: var(--lumi-space-2xs);
		border-radius: var(--lumi-radius-md);
	}

	.lumi-divider--left .lumi-divider__line--after {
		margin-left: var(--lumi-space-sm);
	}

	.lumi-divider--right .lumi-divider__line--before {
		margin-right: var(--lumi-space-sm);
	}

	.lumi-divider--center .lumi-divider__line--before,
	.lumi-divider--center .lumi-divider__line--after {
		flex: 1;
	}
</style>
