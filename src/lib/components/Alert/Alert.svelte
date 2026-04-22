<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { AlertProps } from './types';
	import { Icon } from '../Icon';
	import { LUMI_CONFIG, getIconSize } from '../config';

	type Props = AlertProps & {
		children?: Snippet;
		onclose?: (event: MouseEvent) => void;
	};

	let {
		type = 'info',
		title,
		icon = true,
		closable = false,
		class: className,
		onclose,
		children,
		active = $bindable(true)
	}: Props = $props();

	// Icon mapping for alert types
	const iconMap: Record<string, string> = {
		success: 'checkCircle',
		warning: 'alertTriangle',
		danger: 'xCircle',
		info: 'info',
		primary: 'info',
		secondary: 'info'
	};

	const alertIcon = $derived(iconMap[type] || 'info');
	const iconSizePx = `${getIconSize('md')}px`;
	const closeIconSizePx = `${getIconSize('sm')}px`;
	const transitionDuration = LUMI_CONFIG.transitions.base;

	const alertClasses = $derived(() => {
		const classes = ['lumi-alert', `lumi-alert--${type}`];
		if (className) classes.push(className);
		return classes.join(' ');
	});

	function handleClose(event: MouseEvent) {
		active = false;
		if (onclose) {
			onclose(event);
		}
	}
</script>

{#if active}
	<div class={alertClasses()} transition:fade={{ duration: transitionDuration }}>
		<!-- Alert content -->
		<div class="lumi-alert__content">
			<!-- Icon -->
			{#if icon}
				<div class="lumi-alert__icon">
					<Icon icon={alertIcon} size={iconSizePx} />
				</div>
			{/if}

			<!-- Content wrapper -->
			<div class="lumi-alert__body">
				<!-- Title -->
				{#if title}
					<h4 class="lumi-alert__title">{title}</h4>
				{/if}

				<!-- Message -->
				<div class="lumi-alert__message">
					{#if children}
						{@render children()}
					{/if}
				</div>
			</div>
		</div>

		<!-- Close button -->
		{#if closable}
			<button
				class="lumi-alert__close"
				type="button"
				aria-label="Close alert"
				onclick={handleClose}
			>
				<Icon icon="x" size={closeIconSizePx} />
			</button>
		{/if}
	</div>
{/if}

<style>
	.lumi-alert {
		/* Base alert styles */
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-md);
		border-radius: var(--lumi-radius-2xl);
		border-left: var(--lumi-space-2xs) solid transparent;
		background: var(--lumi-color-surface);
		transition: var(--lumi-transition-all);
		box-shadow: var(--lumi-shadow-sm);
	}

	.lumi-alert:hover {
		transform: translateY(-1px);
		box-shadow: var(--lumi-shadow-md);
	}

	/* Icon styling */
	.lumi-alert__icon {
		flex-shrink: 0;
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Content layout */
	.lumi-alert__content {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		flex: 1;
		min-width: 0;
	}

	/* Body content */
	.lumi-alert__body {
		flex: 1;
		min-width: 0;
	}

	/* Title styling */
	.lumi-alert__title {
		font-size: var(--lumi-font-size-base);
		font-weight: var(--lumi-font-weight-semibold);
		line-height: var(--lumi-line-height-tight);
		margin: 0 0 var(--lumi-space-xs) 0;
		color: var(--lumi-color-text);
	}

	/* Message styling */
	.lumi-alert__message {
		font-size: var(--lumi-font-size-sm);
		line-height: var(--lumi-line-height-relaxed);
		margin: 0;
		color: var(--lumi-color-text-muted);
	}

	/* Close button */
	.lumi-alert__close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-space-xl);
		height: var(--lumi-space-xl);
		padding: 0;
		background: transparent;
		border: none;
		border-radius: var(--lumi-radius-full);
		color: var(--lumi-color-text-muted);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		flex-shrink: 0;
		opacity: 0.7;
	}

	.lumi-alert__close:hover {
		opacity: 1;
		background: var(--lumi-color-background-hover);
		color: var(--lumi-color-text);
		transform: scale(1.1);
	}

	.lumi-alert__close:focus-visible {
		outline: var(--lumi-border-width-thick) solid var(--lumi-color-primary);
		outline-offset: var(--lumi-space-2xs);
	}

	/* Color variants */
	.lumi-alert--primary {
		background: var(--lumi-color-primary-bg);
		border-color: color-mix(in srgb, var(--lumi-color-primary) 20%, transparent);
	}

	.lumi-alert--primary .lumi-alert__icon {
		color: var(--lumi-color-primary);
	}

	.lumi-alert--secondary {
		background: color-mix(in srgb, var(--lumi-color-secondary) 10%, transparent);
		border-color: color-mix(in srgb, var(--lumi-color-secondary) 20%, transparent);
	}

	.lumi-alert--secondary .lumi-alert__icon {
		color: var(--lumi-color-secondary);
	}

	.lumi-alert--success {
		background: var(--lumi-color-success-bg);
		border-color: color-mix(in srgb, var(--lumi-color-success) 20%, transparent);
	}

	.lumi-alert--success .lumi-alert__icon {
		color: var(--lumi-color-success);
	}

	.lumi-alert--warning {
		background: var(--lumi-color-warning-bg);
		border-color: color-mix(in srgb, var(--lumi-color-warning) 20%, transparent);
	}

	.lumi-alert--warning .lumi-alert__icon {
		color: var(--lumi-color-warning);
	}

	.lumi-alert--danger {
		background: var(--lumi-color-danger-bg);
		border-color: color-mix(in srgb, var(--lumi-color-danger) 20%, transparent);
	}

	.lumi-alert--danger .lumi-alert__icon {
		color: var(--lumi-color-danger);
	}

	.lumi-alert--info {
		background: var(--lumi-color-info-bg);
		border-color: color-mix(in srgb, var(--lumi-color-info) 20%, transparent);
	}

	.lumi-alert--info .lumi-alert__icon {
		color: var(--lumi-color-info);
	}
</style>
