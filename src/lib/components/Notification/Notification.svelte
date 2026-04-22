<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';
	import { Icon } from '../Icon';
	import { LUMI_CONFIG } from '../config';
	import type { NotificationProps, NotificationType } from './types';

	let {
		type = 'primary',
		title = '',
		message = '',
		closable = true,
		position = 'top-right',
		duration = 0,
		active = $bindable(true),
		class: className = '',
		onclose
	}: NotificationProps = $props();

	const iconMap: Record<NotificationType, string> = {
		success: 'checkCircle',
		warning: 'alertTriangle',
		error: 'xCircle',
		info: 'info',
		primary: 'bell'
	};

	const transitionDuration = LUMI_CONFIG.transitions.base;

	const role = $derived(() => (type === 'error' || type === 'warning' ? 'alert' : 'status'));

	const classes = $derived(() => {
		const classList = [
			'lumi-notification',
			`lumi-notification--${type}`,
			`lumi-notification--position-${position}`,
			duration > 0 && 'lumi-notification--timed'
		];

		if (className) classList.push(className);
		return classList.filter(Boolean).join(' ');
	});

	const styleVars = $derived(() => {
		return `--notification-duration: ${duration}ms; --notification-transition-duration: ${transitionDuration}ms;`;
	});

	$effect(() => {
		if (!active || duration <= 0) return;

		const timer = window.setTimeout(() => {
			handleClose();
		}, duration);

		return () => {
			window.clearTimeout(timer);
		};
	});

	function handleClose(): void {
		if (!active) return;
		active = false;
		onclose?.();
	}
</script>

{#if active}
	<div
		class={classes()}
		style={styleVars()}
		role={role()}
		aria-live={role() === 'alert' ? 'assertive' : 'polite'}
		aria-atomic="true"
		data-position={position}
		transition:fly={{ y: 12, duration: transitionDuration, easing: cubicOut }}
	>
		<div class="lumi-notification__icon" aria-hidden="true">
			<Icon icon={iconMap[type]} size="md" />
		</div>

		<div class="lumi-notification__content">
			{#if title}
				<h4 class="lumi-notification__title">{title}</h4>
			{/if}
			{#if message}
				<p class="lumi-notification__text">{message}</p>
			{/if}
		</div>

		{#if closable}
			<button
				type="button"
				class="lumi-notification__close"
				aria-label="Close notification"
				onclick={handleClose}
			>
				<Icon icon="x" size="sm" />
			</button>
		{/if}
	</div>
{/if}

<style>
	.lumi-notification {
		--notification-color: var(--lumi-color-primary);
		--notification-bg: var(--lumi-color-primary-bg);

		display: flex;
		align-items: flex-start;
		gap: var(--lumi-space-md);
		inline-size: min(100%, var(--lumi-notification-max-inline-size));
		padding: var(--lumi-space-md);
		background:
			linear-gradient(
				120deg,
				color-mix(in srgb, var(--notification-bg) 38%, var(--lumi-color-surface-overlay)),
				var(--lumi-color-surface-overlay)
			),
			var(--lumi-color-surface-overlay);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-inline-start: var(--lumi-space-2xs) solid var(--notification-color);
		border-radius: var(--lumi-layout-floating-radius);
		box-shadow: var(--lumi-shadow-lg);
		pointer-events: auto;
		position: relative;
		overflow: hidden;
		transition:
			transform var(--notification-transition-duration) var(--lumi-easing-default),
			box-shadow var(--notification-transition-duration) var(--lumi-easing-default),
			border-color var(--notification-transition-duration) var(--lumi-easing-default);
		backdrop-filter: blur(var(--lumi-blur-md));
		-webkit-backdrop-filter: blur(var(--lumi-blur-md));
	}

	.lumi-notification::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			120deg,
			rgba(var(--lumi-color-primary-rgb), 0.08),
			transparent 45%,
			rgba(var(--lumi-color-primary-rgb), 0.05)
		);
		pointer-events: none;
	}

	.lumi-notification:hover {
		transform: translateY(calc(var(--lumi-space-2xs) * -1));
		box-shadow: var(--lumi-shadow-xl);
	}

	.lumi-notification--timed::after {
		content: '';
		position: absolute;
		inset-inline: 0;
		bottom: 0;
		height: var(--lumi-border-width-thick);
		background: color-mix(in srgb, var(--notification-color) 70%, var(--lumi-color-surface));
		transform-origin: left;
		animation: lumi-notification-timeout var(--notification-duration) linear forwards;
	}

	.lumi-notification--success {
		--notification-color: var(--lumi-color-success);
		--notification-bg: var(--lumi-color-success-bg);
	}

	.lumi-notification--warning {
		--notification-color: var(--lumi-color-warning);
		--notification-bg: var(--lumi-color-warning-bg);
	}

	.lumi-notification--error {
		--notification-color: var(--lumi-color-danger);
		--notification-bg: var(--lumi-color-danger-bg);
	}

	.lumi-notification--info {
		--notification-color: var(--lumi-color-info);
		--notification-bg: var(--lumi-color-info-bg);
	}

	.lumi-notification__icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-space-xxl);
		height: var(--lumi-space-xxl);
		border-radius: var(--lumi-radius-full);
		color: var(--notification-color);
		background-color: color-mix(in srgb, var(--notification-bg) 90%, var(--lumi-color-surface));
		border: var(--lumi-border-width-thin) solid
			color-mix(in srgb, var(--notification-color) 16%, transparent);
		position: relative;
		z-index: var(--lumi-z-base);
	}

	.lumi-notification__content {
		flex: 1;
		min-width: 0;
		padding-top: var(--lumi-space-2xs);
		position: relative;
		z-index: var(--lumi-z-base);
	}

	.lumi-notification__title {
		margin: 0;
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-tight);
		margin-bottom: var(--lumi-space-2xs);
		font-size: var(--lumi-font-size-base);
	}

	.lumi-notification__text {
		margin: 0;
		color: var(--lumi-color-text-muted);
		line-height: var(--lumi-line-height-normal);
		font-size: var(--lumi-font-size-sm);
		word-break: break-word;
	}

	.lumi-notification__close {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
		padding: 0;
		background: transparent;
		border: var(--lumi-border-width-thin) solid transparent;
		border-radius: var(--lumi-radius-md);
		color: var(--lumi-color-text-muted);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		margin-top: var(--lumi-space-2xs);
		position: relative;
		z-index: var(--lumi-z-base);
	}

	.lumi-notification__close:hover {
		background-color: color-mix(in srgb, var(--lumi-color-background-hover) 85%, transparent);
		color: var(--lumi-color-text);
		border-color: var(--lumi-color-border-light);
	}

	.lumi-notification__close:focus-visible {
		outline: var(--lumi-border-width-thick) solid var(--lumi-color-primary);
		outline-offset: var(--lumi-space-2xs);
	}

	@keyframes lumi-notification-timeout {
		from {
			transform: scaleX(1);
		}

		to {
			transform: scaleX(0);
		}
	}

	@media (max-width: 768px) {
		.lumi-notification {
			inline-size: 100%;
			gap: var(--lumi-space-sm);
			padding: var(--lumi-space-sm);
			border-radius: var(--lumi-layout-floating-radius-mobile);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-notification,
		.lumi-notification__close {
			transition: none;
		}

		.lumi-notification--timed::after {
			animation: none;
		}
	}
</style>
