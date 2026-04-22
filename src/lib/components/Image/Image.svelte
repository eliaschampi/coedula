<script lang="ts">
	import type { ImageProps } from './types';

	const {
		src,
		srcSet = '',
		sizes = '',
		alt = '',
		width,
		height,
		radius = 'lg',
		loading = 'lazy',
		isZoomed = false,
		removeWrapper = false,
		disableSkeleton = false,
		class: className = '',
		onload,
		onerror
	}: ImageProps = $props();

	let isLoading = $derived(loading === 'lazy');
	let hasError = $state(false);

	const classes = $derived(() => {
		return [
			'lumi-image',
			radius !== 'none' && `lumi-image--radius-${radius}`,
			isZoomed && 'lumi-image--zoomed',
			isLoading && 'lumi-image--loading',
			hasError && 'lumi-image--error',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	const wrapperStyles = $derived(() => {
		const styles: string[] = [];
		if (width) styles.push(`width: ${width}px`);
		if (height) styles.push(`height: ${height}px`);
		return styles.join('; ');
	});

	const handleImageLoad = (event: Event) => {
		isLoading = false;
		hasError = false;
		if (onload) onload(event);
	};

	const handleImageError = () => {
		isLoading = false;
		hasError = true;
		if (onerror) onerror();
	};

	$effect(() => {
		if (loading === 'eager') {
			isLoading = false;
		}
	});
</script>

{#if !removeWrapper}
	<div class={classes()} style={wrapperStyles()}>
		<!-- Main image -->
		<img
			{src}
			{alt}
			srcset={srcSet}
			{sizes}
			{width}
			{height}
			class="lumi-image__img"
			{loading}
			onload={handleImageLoad}
			onerror={handleImageError}
		/>

		<!-- Loading skeleton -->
		{#if !disableSkeleton && isLoading}
			<div class="lumi-image__skeleton"></div>
		{/if}

		<!-- Zoomed wrapper for hover effect -->
		{#if isZoomed}
			<div class="lumi-image__zoomed-wrapper">
				<img {src} {alt} class="lumi-image__zoomed" />
			</div>
		{/if}
	</div>
{:else}
	<!-- Without wrapper -->
	<img
		{src}
		{alt}
		srcset={srcSet}
		{sizes}
		{width}
		{height}
		class="lumi-image__img"
		{loading}
		onload={handleImageLoad}
		onerror={handleImageError}
	/>
{/if}

<style>
	.lumi-image {
		position: relative;
		display: inline-block;
		overflow: hidden;
		background: var(--lumi-color-background-secondary);
	}

	.lumi-image__img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	/* Radius variants */
	.lumi-image--radius-sm {
		border-radius: var(--lumi-radius-sm);
	}

	.lumi-image--radius-md {
		border-radius: var(--lumi-radius-md);
	}

	.lumi-image--radius-lg {
		border-radius: var(--lumi-radius-lg);
	}

	.lumi-image--radius-full {
		border-radius: var(--lumi-radius-full);
	}

	/* Loading skeleton */
	.lumi-image__skeleton {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: linear-gradient(
			90deg,
			var(--lumi-color-background-secondary) 25%,
			var(--lumi-color-background-hover) 50%,
			var(--lumi-color-background-secondary) 75%
		);
		background-size: 200% 100%;
		animation: lumi-shimmer 1.5s infinite;
	}

	/* Zoom effect */
	.lumi-image--zoomed {
		cursor: zoom-in;
	}

	.lumi-image--zoomed:hover .lumi-image__img {
		transform: scale(1.1);
		transition: transform var(--lumi-duration-slow) var(--lumi-easing-default);
	}

	.lumi-image__zoomed-wrapper {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
		pointer-events: none;
	}

	.lumi-image__zoomed {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		transition: opacity var(--lumi-duration-slow) var(--lumi-easing-default);
	}

	.lumi-image--zoomed:hover .lumi-image__zoomed {
		opacity: 1;
	}

	/* Loading state */
	.lumi-image--loading .lumi-image__img {
		opacity: 0;
	}

	/* Error state */
	.lumi-image--error {
		background: var(--lumi-color-background-secondary);
	}

	.lumi-image--error::after {
		content: '⚠️';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: var(--lumi-font-size-2xl);
	}

	/* Animations */
	@keyframes lumi-shimmer {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.lumi-image__skeleton {
			animation: none;
		}

		.lumi-image--zoomed:hover .lumi-image__img {
			transform: none;
		}
	}
</style>
