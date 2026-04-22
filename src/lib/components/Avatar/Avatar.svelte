<script lang="ts">
	import { Icon } from '../Icon';
	import type { AvatarProps } from './types';
	import { getIconSize } from '../config';

	const {
		text = '',
		src = '',
		icon = '',
		alt = '',
		color = 'primary',
		size = 'md',
		class: className = '',
		onerror
	}: AvatarProps = $props();

	let imageError = $state(false);

	const imageSrc = $derived(() => {
		const rawSrc = typeof src === 'string' ? src.trim() : '';
		if (!rawSrc) {
			return '';
		}

		if (
			rawSrc.startsWith('/') ||
			rawSrc.startsWith('http://') ||
			rawSrc.startsWith('https://') ||
			rawSrc.startsWith('//') ||
			rawSrc.startsWith('data:') ||
			rawSrc.startsWith('blob:')
		) {
			return rawSrc;
		}

		return `/${rawSrc}`;
	});

	$effect(() => {
		if (src !== undefined) {
			imageError = false;
		}
	});

	// Compute icon size based on avatar size
	const iconSizePx = $derived(() => `${getIconSize(size)}px`);

	const displayText = $derived(() => {
		if (!text) return '';

		const textStr = String(text);
		if (textStr.length <= 5) return textStr;

		const words = textStr.split(/\s+/);
		if (words.length > 1) {
			return words
				.map((word) => word[0]?.toUpperCase() || '')
				.join('')
				.slice(0, 5);
		}

		return textStr[0]?.toUpperCase() || '';
	});

	const classes = $derived(() => {
		return ['lumi-avatar', `lumi-avatar--${color}`, `lumi-avatar--${size}`, className]
			.filter(Boolean)
			.join(' ');
	});

	const handleImageError = (event: Event) => {
		imageError = true;
		if (onerror) onerror(event);
	};
</script>

<div class={classes()} aria-label={alt || text || 'Avatar'}>
	{#if imageSrc() && !imageError}
		<img src={imageSrc()} {alt} class="lumi-avatar__image" onerror={handleImageError} />
	{:else if icon}
		<span class="lumi-avatar__icon">
			<Icon {icon} size={iconSizePx()} />
		</span>
	{:else if text || (imageSrc() && imageError)}
		<span class="lumi-avatar__text">
			{displayText()}
		</span>
	{/if}
</div>

<style>
	/* ============================================================================
	 * AVATAR COMPONENT - Clean and consistent design
	 * ============================================================================ */

	.lumi-avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--lumi-radius-full);
		font-weight: var(--lumi-font-weight-semibold);
		line-height: var(--lumi-line-height-none);
		white-space: nowrap;
		user-select: none;
		overflow: hidden;
		flex-shrink: 0;
	}

	/* Size variants */
	.lumi-avatar--sm {
		width: var(--lumi-space-xl);
		height: var(--lumi-space-xl);
		font-size: var(--lumi-font-size-xs);
	}

	.lumi-avatar--md {
		width: var(--lumi-space-xxl);
		height: var(--lumi-space-xxl);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-avatar--lg {
		width: var(--lumi-space-3xl);
		height: var(--lumi-space-3xl);
		font-size: var(--lumi-font-size-base);
	}

	.lumi-avatar--xl {
		width: var(--lumi-space-4xl);
		height: var(--lumi-space-4xl);
		font-size: var(--lumi-font-size-lg);
	}

	/* Color variants */
	.lumi-avatar--primary {
		background-color: var(--lumi-color-primary);
		color: var(--lumi-color-white);
	}

	.lumi-avatar--secondary {
		background-color: var(--lumi-color-secondary);
		color: var(--lumi-color-white);
	}

	.lumi-avatar--success {
		background-color: var(--lumi-color-success);
		color: var(--lumi-color-white);
	}

	.lumi-avatar--warning {
		background-color: var(--lumi-color-warning);
		color: var(--lumi-color-white);
	}

	.lumi-avatar--danger {
		background-color: var(--lumi-color-danger);
		color: var(--lumi-color-white);
	}

	.lumi-avatar--info {
		background-color: var(--lumi-color-info);
		color: var(--lumi-color-white);
	}

	/* Text styling */
	.lumi-avatar__text {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	/* Icon styling */
	.lumi-avatar__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.lumi-avatar__icon :global(svg) {
		width: 60%;
		height: 60%;
	}

	/* Image styling */
	.lumi-avatar__image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
</style>
