/**
 * Lumi UI - Shared Component Configuration
 * Central configuration for all component defaults
 * Ensures consistency across the entire design system
 */

export const LUMI_CONFIG = {
	/**
	 * Standard size scale used across all components
	 */
	sizes: {
		xs: 'xs',
		sm: 'sm',
		md: 'md',
		lg: 'lg',
		xl: 'xl',
		'2xl': '2xl'
	} as const,

	/**
	 * Semantic color palette
	 */
	colors: {
		primary: 'primary',
		secondary: 'secondary',
		success: 'success',
		warning: 'warning',
		danger: 'danger',
		info: 'info'
	} as const,

	/**
	 * Icon size mapping (in pixels)
	 * Maps size scale to actual pixel values
	 */
	iconSizes: {
		xs: 12,
		sm: 16,
		md: 20,
		lg: 24,
		xl: 32,
		'2xl': 40
	} as const,

	/**
	 * Transition durations (in milliseconds)
	 */
	transitions: {
		fast: 150,
		base: 200,
		slow: 300,
		slower: 500
	} as const,

	/**
	 * Default component props
	 */
	defaults: {
		size: 'md',
		color: 'primary'
	} as const
} as const;

// Type exports for TypeScript
export type LumiSize = keyof typeof LUMI_CONFIG.sizes;
export type LumiColor = keyof typeof LUMI_CONFIG.colors;
export type LumiIconSize = keyof typeof LUMI_CONFIG.iconSizes;
export type LumiTransition = keyof typeof LUMI_CONFIG.transitions;

/**
 * Helper function to get icon size in pixels
 */
export function getIconSize(size: LumiSize): number {
	return LUMI_CONFIG.iconSizes[size] ?? LUMI_CONFIG.iconSizes.md;
}
