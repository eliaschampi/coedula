<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import Icon from '../Icon/Icon.svelte';
	import { LUMI_CONFIG } from '../config';
	import type { DialogProps } from './types';

	interface Props extends DialogProps {
		children?: Snippet;
		header?: Snippet;
		footer?: Snippet;
	}

	let {
		open = $bindable(false),
		title = '',
		size = 'md',
		persistent = false,
		scrollable = false,
		fullScreen = false,
		hideClose = false,
		closeLabel = 'Close dialog',
		closeOnEscape = true,
		class: className = '',
		onclose,
		onopen,
		onafteropen,
		onafterclose,
		children,
		header,
		footer
	}: Props = $props();

	let dialogElement: HTMLDivElement | undefined = $state();
	let previousActiveElement: HTMLElement | null = null;
	let bodyOverflow = '';
	let afterCloseTimer: number | undefined;
	let pointerDownOnOverlay = false;

	const uniqueId = Math.random().toString(36).substring(2, 11);
	const titleId = `lumi-dialog-title-${uniqueId}`;
	const contentId = `lumi-dialog-content-${uniqueId}`;
	const transitionDuration = LUMI_CONFIG.transitions.base;
	const transitionDurationMs = `${transitionDuration}ms`;
	const focusableSelector =
		'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

	const dialogClasses = $derived(() => {
		return [
			'lumi-dialog',
			!fullScreen && `lumi-dialog--${size}`,
			scrollable && 'lumi-dialog--scrollable',
			fullScreen && 'lumi-dialog--full-screen',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	const overlayClasses = $derived(() => {
		return ['lumi-dialog-overlay', persistent && 'lumi-dialog-overlay--persistent']
			.filter(Boolean)
			.join(' ');
	});

	const styleVars = $derived(() => `--dialog-transition-duration: ${transitionDurationMs};`);

	function handleClose(): void {
		if (!open) return;
		open = false;
		onclose?.();
	}

	function handleOverlayPointerDown(event: PointerEvent): void {
		pointerDownOnOverlay = !persistent && event.target === event.currentTarget;
	}

	function handleOverlayClick(event: MouseEvent): void {
		const wasPointerDownOnOverlay = pointerDownOnOverlay;
		pointerDownOnOverlay = false;

		if (persistent) return;
		if (!wasPointerDownOnOverlay) return;
		if (event.target !== event.currentTarget) return;

		handleClose();
	}

	function handleEscapeKey(event: KeyboardEvent): void {
		if (!open || !closeOnEscape || event.key !== 'Escape') return;
		event.preventDefault();
		handleClose();
	}

	function trapFocus(event: KeyboardEvent): void {
		if (!dialogElement || event.key !== 'Tab') return;

		const focusableElements = Array.from(
			dialogElement.querySelectorAll<HTMLElement>(focusableSelector)
		);

		if (focusableElements.length === 0) {
			event.preventDefault();
			dialogElement.focus();
			return;
		}

		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		if (event.shiftKey) {
			if (document.activeElement === firstElement) {
				event.preventDefault();
				lastElement.focus();
			}
		} else {
			if (document.activeElement === lastElement) {
				event.preventDefault();
				firstElement.focus();
			}
		}
	}

	function lockBodyScroll(): void {
		bodyOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
	}

	function unlockBodyScroll(): void {
		document.body.style.overflow = bodyOverflow;
	}

	function focusDialog(): void {
		requestAnimationFrame(() => {
			if (!dialogElement) return;
			const firstFocusable = dialogElement.querySelector<HTMLElement>(focusableSelector);
			(firstFocusable ?? dialogElement).focus();
		});
	}

	$effect(() => {
		if (!open) return;

		previousActiveElement =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		lockBodyScroll();
		document.addEventListener('keydown', handleEscapeKey);
		document.addEventListener('keydown', trapFocus);
		onopen?.();
		focusDialog();

		const afterOpenTimer = window.setTimeout(() => {
			onafteropen?.();
		}, transitionDuration);

		return () => {
			window.clearTimeout(afterOpenTimer);
			document.removeEventListener('keydown', handleEscapeKey);
			document.removeEventListener('keydown', trapFocus);
			unlockBodyScroll();

			if (previousActiveElement?.isConnected) {
				previousActiveElement.focus();
			}
			previousActiveElement = null;

			if (afterCloseTimer) {
				window.clearTimeout(afterCloseTimer);
			}
			afterCloseTimer = window.setTimeout(() => {
				onafterclose?.();
			}, transitionDuration);
		};
	});

	$effect(() => {
		return () => {
			if (afterCloseTimer) {
				window.clearTimeout(afterCloseTimer);
			}
			document.removeEventListener('keydown', handleEscapeKey);
			document.removeEventListener('keydown', trapFocus);
			unlockBodyScroll();
		};
	});
</script>

{#if open}
	<div
		class={overlayClasses()}
		style={styleVars()}
		transition:fade={{ duration: transitionDuration }}
		onpointerdown={handleOverlayPointerDown}
		onclick={handleOverlayClick}
		role="presentation"
	>
		<div
			bind:this={dialogElement}
			class={dialogClasses()}
			transition:scale={{ duration: transitionDuration, start: 0.96 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? titleId : undefined}
			aria-label={!title ? 'Dialog' : undefined}
			aria-describedby={contentId}
			tabindex="-1"
		>
			{#if header || title || !hideClose}
				<header class="lumi-dialog__header">
					<div class="lumi-dialog__header-content">
						{#if header}
							{@render header()}
						{:else if title}
							<h2 id={titleId} class="lumi-dialog__title">
								{title}
							</h2>
						{/if}
					</div>

					{#if !hideClose}
						<button
							class="lumi-dialog__close"
							type="button"
							aria-label={closeLabel}
							onclick={handleClose}
						>
							<Icon icon="x" size="md" />
						</button>
					{/if}
				</header>
			{/if}

			<div id={contentId} class="lumi-dialog__content">
				{#if children}
					{@render children()}
				{/if}
			</div>

			{#if footer}
				<footer class="lumi-dialog__footer">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	.lumi-dialog-overlay {
		position: fixed;
		inset: 0;
		background:
			radial-gradient(circle at top, rgba(var(--lumi-color-primary-rgb), 0.18), transparent 45%),
			var(--lumi-color-overlay);
		backdrop-filter: blur(var(--lumi-blur-md));
		-webkit-backdrop-filter: blur(var(--lumi-blur-md));
		z-index: var(--lumi-z-modal-backdrop);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--lumi-dialog-overlay-padding);
		cursor: pointer;
		overflow-y: auto;
		transition: opacity var(--dialog-transition-duration) var(--lumi-easing-default);
	}

	.lumi-dialog-overlay--persistent {
		cursor: default;
	}

	.lumi-dialog {
		position: relative;
		background:
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--lumi-color-primary-bg) 42%, transparent),
				transparent 35%
			),
			var(--lumi-color-surface-overlay);
		border-radius: var(--lumi-layout-floating-radius);
		max-height: var(--lumi-dialog-max-height);
		width: 100%;
		display: flex;
		flex-direction: column;
		cursor: default;
		z-index: var(--lumi-z-modal);
		box-shadow: var(--lumi-shadow-xl);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		transition: var(--lumi-transition-all);
		overflow: hidden;
		backdrop-filter: blur(var(--lumi-blur-lg));
		-webkit-backdrop-filter: blur(var(--lumi-blur-lg));
	}

	.lumi-dialog:focus {
		outline: none;
	}

	.lumi-dialog--sm {
		max-width: var(--lumi-dialog-width-sm);
		width: 100%;
	}

	.lumi-dialog--md {
		max-width: var(--lumi-dialog-width-md);
		width: 100%;
	}

	.lumi-dialog--lg {
		max-width: var(--lumi-dialog-width-lg);
		width: 100%;
	}

	.lumi-dialog--xl {
		max-width: var(--lumi-dialog-width-xl);
		width: 100%;
	}

	.lumi-dialog--scrollable .lumi-dialog__content {
		overflow-y: auto;
		max-height: var(--lumi-dialog-content-max-height);
	}

	.lumi-dialog--full-screen {
		max-width: none;
		max-height: none;
		width: var(--lumi-dialog-full-width);
		height: var(--lumi-dialog-full-height);
		border-radius: 0;
	}

	.lumi-dialog--full-screen .lumi-dialog__content {
		flex: 1;
		overflow-y: auto;
	}

	.lumi-dialog__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--lumi-space-lg);
		border-bottom: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--lumi-color-surface) 92%, var(--lumi-color-primary-bg)),
			var(--lumi-color-surface)
		);
		border-top-left-radius: var(--lumi-layout-floating-radius);
		border-top-right-radius: var(--lumi-layout-floating-radius);
		flex-shrink: 0;
	}

	.lumi-dialog__header-content {
		flex: 1;
		min-width: 0;
	}

	.lumi-dialog__title {
		margin: 0;
		font-size: var(--lumi-font-size-xl);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-tight);
	}

	.lumi-dialog__close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-space-xl);
		height: var(--lumi-space-xl);
		margin-left: var(--lumi-space-md);
		background: transparent;
		border: var(--lumi-border-width-thin) solid transparent;
		border-radius: var(--lumi-radius-lg);
		color: var(--lumi-color-text-muted);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		flex-shrink: 0;
	}

	.lumi-dialog__close:hover {
		background: color-mix(in srgb, var(--lumi-color-primary-bg) 45%, transparent);
		color: var(--lumi-color-text);
		border-color: color-mix(in srgb, var(--lumi-color-primary) 20%, var(--lumi-color-border));
		transform: scale(1.02);
	}

	.lumi-dialog__close:active {
		transform: scale(0.98);
	}

	.lumi-dialog__close:focus-visible {
		outline: var(--lumi-border-width-thick) solid var(--lumi-color-primary);
		outline-offset: var(--lumi-space-2xs);
	}

	.lumi-dialog__content {
		flex: 1;
		padding: var(--lumi-space-lg);
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-normal);
		background: color-mix(in srgb, var(--lumi-color-surface) 94%, transparent);
		overflow-y: auto;
	}

	.lumi-dialog__content::-webkit-scrollbar {
		width: var(--lumi-space-2xs);
	}

	.lumi-dialog__content::-webkit-scrollbar-track {
		background: transparent;
	}

	.lumi-dialog__content::-webkit-scrollbar-thumb {
		background: var(--lumi-color-border);
		border-radius: var(--lumi-radius-full);
	}

	.lumi-dialog__footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-lg);
		border-top: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		flex-shrink: 0;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--lumi-color-surface) 92%, transparent),
			var(--lumi-color-surface)
		);
		border-bottom-left-radius: var(--lumi-layout-floating-radius);
		border-bottom-right-radius: var(--lumi-layout-floating-radius);
	}

	@media (max-width: 768px) {
		.lumi-dialog-overlay {
			padding: var(--lumi-dialog-overlay-padding-mobile);
			align-items: center;
		}

		.lumi-dialog {
			max-width: var(--lumi-dialog-mobile-max-width);
			max-height: var(--lumi-dialog-mobile-max-height);
			border-radius: var(--lumi-layout-floating-radius-mobile);
		}

		.lumi-dialog--full-screen {
			height: var(--lumi-dialog-full-height);
			max-height: var(--lumi-dialog-full-height);
			border-radius: 0;
		}

		.lumi-dialog__header {
			padding: var(--lumi-space-md);
			border-top-left-radius: var(--lumi-layout-floating-radius-mobile);
			border-top-right-radius: var(--lumi-layout-floating-radius-mobile);
		}

		.lumi-dialog__content {
			padding: var(--lumi-space-md);
		}

		.lumi-dialog__footer {
			padding: var(--lumi-space-md);
			flex-direction: column-reverse;
			gap: var(--lumi-space-sm);
			border-bottom-left-radius: var(--lumi-layout-floating-radius-mobile);
			border-bottom-right-radius: var(--lumi-layout-floating-radius-mobile);
		}

		.lumi-dialog__footer :global(.lumi-button) {
			width: 100%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-dialog-overlay,
		.lumi-dialog,
		.lumi-dialog__close {
			transition: none;
		}
	}
</style>
