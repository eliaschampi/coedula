<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import type { ListHeaderProps } from './types';

	interface Props extends ListHeaderProps {
		children?: Snippet;
		actions?: Snippet;
	}

	const { title, color, icon, class: className = '', children, actions }: Props = $props();

	const classes = $derived(() => {
		return ['lumi-list-header', color && `lumi-list-header--${color}`, className]
			.filter(Boolean)
			.join(' ');
	});
</script>

<div class={classes()}>
	{#if icon}
		<div class="lumi-list-header__icon">
			<Icon {icon} size="sm" />
		</div>
	{/if}

	<div class="lumi-list-header__content">
		{#if title}
			<div class="lumi-list-header__title">
				{title}
			</div>
		{/if}
	</div>

	{#if actions}
		<div class="lumi-list-header__actions">
			{@render actions()}
		</div>
	{:else if children}
		<div class="lumi-list-header__actions">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.lumi-list-header {
		--list-header-color: var(--lumi-color-text-muted);
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		color: var(--list-header-color);
		border-bottom: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		margin-bottom: var(--lumi-space-2xs);
	}

	.lumi-list-header__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: inherit;
		opacity: 0.85;
		flex-shrink: 0;
	}

	.lumi-list-header__content {
		flex: 1;
		min-width: 0;
	}

	.lumi-list-header__title {
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-semibold);
		color: inherit;
		letter-spacing: 0.04em;
		line-height: var(--lumi-line-height-tight);
		text-transform: uppercase;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lumi-list-header__actions {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
		margin-left: auto;
	}

	/* Color variants */
	.lumi-list-header--primary {
		--list-header-color: var(--lumi-color-primary);
	}

	.lumi-list-header--secondary {
		--list-header-color: var(--lumi-color-secondary);
	}

	.lumi-list-header--success {
		--list-header-color: var(--lumi-color-success);
	}

	.lumi-list-header--warning {
		--list-header-color: var(--lumi-color-warning);
	}

	.lumi-list-header--danger {
		--list-header-color: var(--lumi-color-danger);
	}

	.lumi-list-header--info {
		--list-header-color: var(--lumi-color-info);
	}
</style>
