// Lumi UI - Floating Element Utility (Svelte 5 Runes)
// Manages floating elements positioning (dropdowns, tooltips, etc.)

export interface FloatingPosition {
	top: number;
	left: number;
	width?: number;
	maxHeight?: number;
}

export type FloatingPlacement =
	| 'bottom-start'
	| 'bottom-end'
	| 'top-start'
	| 'top-end'
	| 'bottom'
	| 'top';

export interface UseFloatingOptions {
	offset?: number;
	placement?: FloatingPlacement;
	matchWidth?: boolean;
	maxHeight?: number;
	viewportPadding?: number;
	zIndex?: string;
	strategy?: 'fixed' | 'absolute';
}

export type FloatingController = {
	isOpen: boolean;
	position: FloatingPosition;
	floatingStyles: Record<string, string>;
	open: () => void;
	close: () => void;
	toggle: () => void;
	updatePosition: () => void;
};

export type FloatingOptionsInput = UseFloatingOptions | (() => UseFloatingOptions);

export function createFloating(
	triggerElement: () => HTMLElement | undefined,
	floatingElement: () => HTMLElement | undefined,
	options: FloatingOptionsInput = {} as UseFloatingOptions
): FloatingController {
	const optionsGetter: () => UseFloatingOptions =
		typeof options === 'function' ? options : () => options;
	const resolvedOptions = $derived(() => {
		const current = optionsGetter() ?? {};
		return {
			offset: 8,
			placement: 'bottom-start',
			matchWidth: false,
			maxHeight: 300,
			viewportPadding: 16,
			zIndex: 'var(--lumi-z-dropdown)',
			strategy: 'fixed',
			...current
		};
	});

	let isOpen = $state(false);
	let position = $state<FloatingPosition>({ top: 0, left: 0 });
	let hasPosition = $state(false);

	const floatingStyles = $derived(() => {
		const { strategy, zIndex, matchWidth } = resolvedOptions();
		const styles: Record<string, string> = {
			position: strategy,
			top: `${position.top}px`,
			left: `${position.left}px`,
			zIndex,
			visibility: hasPosition ? 'visible' : 'hidden'
		};

		if (position.width && matchWidth) {
			styles.width = `${position.width}px`;
		}

		if (position.maxHeight) {
			styles.maxHeight = `${position.maxHeight}px`;
		}

		return styles;
	});

	function calculatePosition(): void {
		const trigger = triggerElement();
		if (!trigger || !isOpen) return;

		const { offset, placement, matchWidth, maxHeight, viewportPadding, strategy } =
			resolvedOptions();
		const triggerRect = trigger.getBoundingClientRect();
		const viewport = {
			width: window.innerWidth,
			height: window.innerHeight
		};

		// Initial position based on trigger rect (relative to viewport for fixed)
		let top = triggerRect.bottom + offset;
		let left = triggerRect.left;

		// If absolute strategy, we might need to adjust for scroll if the parent isn't the viewport
		// But for simplicity and "breaking out" of containers like Dialogs, 'fixed' is preferred.
		// If strategy is absolute, we assume the user handles the relative parent or we add scroll offset.
		if (strategy === 'absolute') {
			top += window.scrollY;
			left += window.scrollX;
		}

		const calculatedWidth = matchWidth ? triggerRect.width : undefined;
		const calculatedMaxHeight = maxHeight;

		// Handle placement variations
		if (placement.includes('top')) {
			top = (strategy === 'absolute' ? triggerRect.top + window.scrollY : triggerRect.top) - offset;
		}

		// Get floating element dimensions if available
		const floating = floatingElement();
		let floatingWidth = calculatedWidth || 200;
		let floatingHeight = calculatedMaxHeight;

		if (floating) {
			const floatingRect = floating.getBoundingClientRect();
			if (!calculatedWidth) floatingWidth = floatingRect.width || floatingWidth;
			floatingHeight = Math.min(floatingRect.height || floatingHeight, calculatedMaxHeight);
		}

		if (placement.includes('end')) {
			left =
				(strategy === 'absolute' ? triggerRect.right + window.scrollX : triggerRect.right) -
				floatingWidth;
		} else if (placement === 'bottom' || placement === 'top') {
			// Center alignment
			left =
				(strategy === 'absolute' ? triggerRect.left + window.scrollX : triggerRect.left) +
				triggerRect.width / 2;
			left -= floatingWidth / 2;
		}

		// Viewport boundary adjustments - Horizontal
		// Only apply strict viewport bounds if fixed, or if we want to keep it on screen
		const scrollLeft = strategy === 'absolute' ? window.scrollX : 0;
		const scrollTop = strategy === 'absolute' ? window.scrollY : 0;

		if (left < viewportPadding + scrollLeft) {
			left = viewportPadding + scrollLeft;
		} else if (left + floatingWidth > viewport.width - viewportPadding + scrollLeft) {
			left = viewport.width - floatingWidth - viewportPadding + scrollLeft;
		}

		// Viewport boundary adjustments - Vertical
		// Check if it fits below (default)
		const bottomSpace = viewport.height - (strategy === 'absolute' ? top - scrollTop : top);
		const topSpace =
			(strategy === 'absolute' ? top - scrollTop : top) -
			(placement.includes('top') ? 0 : triggerRect.height + offset * 2);

		if (placement.includes('top')) {
			// It's already trying to be on top.
			// If it doesn't fit on top, try bottom?
			// top is currently the bottom edge of the floating element if we were to position it
			// Wait, logic above set 'top' to the top edge of the floating element.

			// Let's simplify: 'top' variable currently holds the intended TOP coordinate of the floating element.

			if ((strategy === 'absolute' ? top - scrollTop : top) - floatingHeight < viewportPadding) {
				// Not enough space on top, flip to bottom
				top =
					(strategy === 'absolute' ? triggerRect.bottom + window.scrollY : triggerRect.bottom) +
					offset;
			} else {
				top = top - floatingHeight;
			}
		} else {
			// Default bottom
			// If not enough space below, and more space above, flip to top
			if (bottomSpace < floatingHeight + viewportPadding && topSpace > bottomSpace) {
				top =
					(strategy === 'absolute' ? triggerRect.top + window.scrollY : triggerRect.top) -
					offset -
					floatingHeight;
			}
		}

		position = {
			top,
			left,
			width: calculatedWidth,
			maxHeight: calculatedMaxHeight
		};
		hasPosition = true;
	}

	function open(): void {
		hasPosition = false;
		isOpen = true;
		// Try immediate position to avoid first-frame flash at 0,0.
		calculatePosition();
		requestAnimationFrame(() => calculatePosition());
	}

	function close(): void {
		isOpen = false;
		hasPosition = false;
	}

	function toggle(): void {
		if (isOpen) {
			close();
		} else {
			open();
		}
	}

	function updatePosition(): void {
		if (isOpen) {
			calculatePosition();
		}
	}

	// Auto-update on scroll/resize
	$effect(() => {
		if (isOpen) {
			window.addEventListener('scroll', updatePosition, { passive: true, capture: true });
			window.addEventListener('resize', updatePosition, { passive: true });

			return () => {
				window.removeEventListener('scroll', updatePosition, { capture: true });
				window.removeEventListener('resize', updatePosition);
			};
		}
	});

	return {
		get isOpen() {
			return isOpen;
		},
		get position() {
			return position;
		},
		get floatingStyles() {
			return floatingStyles();
		},
		open,
		close,
		toggle,
		updatePosition
	};
}
