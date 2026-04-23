<script lang="ts">
	import { browser } from '$app/environment';
	import { Button, Chip } from '$lib/components';
	import type { EvaluationProcessingErrorData } from '$lib/types/evaluation';
	import { processEvaluationImageWithCanvas } from '$lib/utils';

	type PendingOperation = 'rotate' | 'flip' | 'crop' | null;
	type RotationValue = 0 | 90 | 180 | 270;

	interface Props {
		imageUrl: string;
		fileName?: string;
		status?: 'pending' | 'processing' | 'success' | 'error';
		fileIndex?: number;
		totalFiles?: number;
		error?: EvaluationProcessingErrorData | null;
		onimagesave?: (processedImageData: string) => void;
	}

	const A5_RATIO = 1 / 1.414;
	const ZOOM_MIN = 1;
	const ZOOM_MAX = 3;
	const ZOOM_STEP = 0.03;

	let {
		imageUrl,
		fileName = '',
		status = 'pending',
		fileIndex = 0,
		totalFiles = 0,
		error = null,
		onimagesave
	}: Props = $props();

	let containerRef = $state<HTMLDivElement | null>(null);
	let lastImageUrl = $state('');
	let baseImageUrl = $state('');
	let displayedImageUrl = $state('');
	let naturalWidth = $state(0);
	let naturalHeight = $state(0);
	let pendingOperation = $state<PendingOperation>(null);
	let rotation = $state<RotationValue>(0);
	let flipX = $state(false);
	let flipY = $state(false);
	let cropMode = $state(false);
	let zoomLevel = $state(1);
	let cropFrame = $state<{ x: number; y: number; w: number; h: number } | null>(null);
	let dragging = $state(false);
	let dragOffset = $state<{ x: number; y: number } | null>(null);
	let processing = $state(false);
	let localError = $state('');

	const displayError = $derived(error?.message || localError);
	const imageStyle = $derived.by(() => {
		const transform = cropMode
			? `scale(${zoomLevel})`
			: `rotate(${rotation}deg) scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`;
		return `transform: ${transform}; transform-origin: center;`;
	});
	const canRevert = $derived(baseImageUrl !== imageUrl && !processing);
	const canSave = $derived(
		Boolean(pendingOperation) && (!cropMode || Boolean(cropFrame)) && !processing
	);
	const statusLabel = $derived.by(() => {
		if (status === 'processing') return 'Procesando';
		if (status === 'success') return 'Procesada';
		if (status === 'error') return 'Con error';
		return 'Pendiente';
	});
	const statusColor = $derived.by(() => {
		if (status === 'processing') return 'info';
		if (status === 'success') return 'success';
		if (status === 'error') return 'danger';
		return 'warning';
	});
	const pendingLabel = $derived.by(() => {
		if (cropMode) {
			return `Recorte A5 ${Math.round(zoomLevel * 100)}%`;
		}

		if (pendingOperation === 'rotate') {
			return `Rotación ${rotation}°`;
		}

		if (pendingOperation === 'flip') {
			return `Volteo ${flipX ? 'horizontal' : 'vertical'}`;
		}

		return 'Sin cambios';
	});

	function resetState(): void {
		pendingOperation = null;
		rotation = 0;
		flipX = false;
		flipY = false;
		cropMode = false;
		zoomLevel = 1;
		cropFrame = null;
		dragging = false;
		dragOffset = null;
		localError = '';
	}

	async function loadDimensions(source: string): Promise<void> {
		if (!browser || !source) {
			naturalWidth = 0;
			naturalHeight = 0;
			return;
		}

		const image = new window.Image();

		await new Promise<void>((resolve, reject) => {
			image.onload = () => {
				naturalWidth = image.naturalWidth;
				naturalHeight = image.naturalHeight;
				resolve();
			};
			image.onerror = () => {
				naturalWidth = 0;
				naturalHeight = 0;
				reject(new Error('No se pudo leer la imagen seleccionada'));
			};
			image.src = source;
		}).catch((caught) => {
			localError =
				caught instanceof Error ? caught.message : 'No se pudo leer la imagen seleccionada';
		});
	}

	function initCropFrame(): void {
		if (!containerRef) {
			return;
		}

		const rect = containerRef.getBoundingClientRect();
		const padding = 32;
		const maxWidth = Math.max(rect.width - padding, 120);
		const maxHeight = Math.max(rect.height - padding, 160);
		let width = maxWidth * 0.88;
		let height = width / A5_RATIO;

		if (height > maxHeight * 0.9) {
			height = maxHeight * 0.9;
			width = height * A5_RATIO;
		}

		cropFrame = {
			x: (rect.width - width) / 2,
			y: (rect.height - height) / 2,
			w: width,
			h: height
		};
	}

	function revert(): void {
		if (processing) {
			return;
		}

		baseImageUrl = imageUrl;
		displayedImageUrl = imageUrl;
		resetState();
	}

	function rotate(clockwise: boolean): void {
		if (cropMode || processing) {
			return;
		}

		localError = '';
		rotation = ((rotation + (clockwise ? 90 : -90) + 360) % 360) as RotationValue;
		pendingOperation = rotation === 0 ? null : 'rotate';
		flipX = false;
		flipY = false;
		displayedImageUrl = baseImageUrl;
	}

	function flip(horizontal: boolean): void {
		if (cropMode || processing) {
			return;
		}

		localError = '';
		rotation = 0;
		if (horizontal) {
			flipX = !flipX;
			flipY = false;
		} else {
			flipY = !flipY;
			flipX = false;
		}

		pendingOperation = flipX || flipY ? 'flip' : null;
		displayedImageUrl = baseImageUrl;
	}

	function toggleCrop(): void {
		if (processing) {
			return;
		}

		localError = '';
		cropMode = !cropMode;

		if (cropMode) {
			pendingOperation = 'crop';
			rotation = 0;
			flipX = false;
			flipY = false;
			zoomLevel = 1;
		} else {
			pendingOperation = null;
			zoomLevel = 1;
			cropFrame = null;
		}
	}

	function zoom(direction: 'in' | 'out'): void {
		if (!cropMode || processing) {
			return;
		}

		zoomLevel = Math.min(
			ZOOM_MAX,
			Math.max(ZOOM_MIN, zoomLevel + (direction === 'in' ? ZOOM_STEP : -ZOOM_STEP))
		);
	}

	function startDrag(event: MouseEvent): void {
		if (!cropMode || !cropFrame || !containerRef || processing) {
			return;
		}

		event.preventDefault();
		const rect = containerRef.getBoundingClientRect();
		dragging = true;
		dragOffset = {
			x: event.clientX - rect.left - cropFrame.x,
			y: event.clientY - rect.top - cropFrame.y
		};
	}

	function moveDrag(event: MouseEvent): void {
		if (!dragging || !dragOffset || !cropFrame || !containerRef) {
			return;
		}

		const rect = containerRef.getBoundingClientRect();
		let x = event.clientX - rect.left - dragOffset.x;
		let y = event.clientY - rect.top - dragOffset.y;

		x = Math.max(0, Math.min(rect.width - cropFrame.w, x));
		y = Math.max(0, Math.min(rect.height - cropFrame.h, y));
		cropFrame = { ...cropFrame, x, y };
	}

	function endDrag(): void {
		dragging = false;
		dragOffset = null;
	}

	function calculateCrop(): {
		x: number;
		y: number;
		width: number;
		height: number;
	} | null {
		if (!cropFrame || !containerRef || !naturalWidth || !naturalHeight) {
			return null;
		}

		const rect = containerRef.getBoundingClientRect();
		const imageRatio = naturalWidth / naturalHeight;
		const containerRatio = rect.width / rect.height;
		const [renderedWidth, renderedHeight] =
			imageRatio > containerRatio
				? [rect.width, rect.width / imageRatio]
				: [rect.height * imageRatio, rect.height];

		const imageOffsetX = (rect.width - renderedWidth) / 2;
		const imageOffsetY = (rect.height - renderedHeight) / 2;
		const scale = naturalWidth / renderedWidth;
		const originX = imageOffsetX + renderedWidth / 2;
		const originY = imageOffsetY + renderedHeight / 2;
		const frameX = (cropFrame.x - originX) / zoomLevel + renderedWidth / 2;
		const frameY = (cropFrame.y - originY) / zoomLevel + renderedHeight / 2;

		return {
			x: frameX * scale,
			y: frameY * scale,
			width: (cropFrame.w / zoomLevel) * scale,
			height: (cropFrame.h / zoomLevel) * scale
		};
	}

	async function save(): Promise<void> {
		if (!browser || !pendingOperation || processing || !naturalWidth || !naturalHeight) {
			return;
		}

		processing = true;
		localError = '';

		try {
			const image = new window.Image();
			image.src = baseImageUrl;

			await new Promise<void>((resolve, reject) => {
				image.onload = () => resolve();
				image.onerror = () => reject(new Error('No se pudo preparar la imagen'));
			});

			const result = processEvaluationImageWithCanvas(image, {
				rotation: pendingOperation === 'rotate' ? rotation : undefined,
				flip:
					pendingOperation === 'flip'
						? {
								horizontal: flipX,
								vertical: flipY
							}
						: undefined,
				crop: pendingOperation === 'crop' ? (calculateCrop() ?? undefined) : undefined
			});

			baseImageUrl = result;
			displayedImageUrl = result;
			onimagesave?.(result);
			resetState();
		} catch (caught) {
			localError = caught instanceof Error ? caught.message : 'No se pudo procesar la imagen';
		} finally {
			processing = false;
		}
	}

	$effect(() => {
		if (imageUrl !== lastImageUrl) {
			lastImageUrl = imageUrl;
			baseImageUrl = imageUrl;
			displayedImageUrl = imageUrl;
			resetState();
		}
	});

	$effect(() => {
		void loadDimensions(baseImageUrl);
	});

	$effect(() => {
		if (cropMode) {
			initCropFrame();
		}
	});

	$effect(() => {
		if (!browser || !dragging) {
			return;
		}

		const handleMove = (event: MouseEvent) => moveDrag(event);
		const handleUp = () => endDrag();

		document.addEventListener('mousemove', handleMove);
		document.addEventListener('mouseup', handleUp);

		return () => {
			document.removeEventListener('mousemove', handleMove);
			document.removeEventListener('mouseup', handleUp);
		};
	});
</script>

<div class="evaluation-image-editor">
	<div class="evaluation-image-editor__header">
		<div class="lumi-stack lumi-stack--2xs">
			<h3 class="lumi-margin--none">Previsualización</h3>
			{#if fileName}
				<p class="lumi-margin--none lumi-text--sm lumi-text--muted">{fileName}</p>
			{/if}
		</div>
		<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
			{#if totalFiles > 0}
				<Chip color="secondary" size="sm">{fileIndex + 1}/{totalFiles}</Chip>
			{/if}
			<Chip color={statusColor} size="sm">{statusLabel}</Chip>
		</div>
	</div>

	<div class="evaluation-image-editor__toolbar">
		<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
			<Button
				type="border"
				size="sm"
				icon="rotateCcw"
				disabled={cropMode || processing}
				onclick={() => rotate(false)}
			>
				Girar izq.
			</Button>
			<Button
				type="border"
				size="sm"
				icon="refreshCw"
				disabled={cropMode || processing}
				onclick={() => rotate(true)}
			>
				Girar der.
			</Button>
			<Button
				type="border"
				size="sm"
				icon="flipHorizontal"
				disabled={cropMode || processing}
				onclick={() => flip(true)}
			>
				Voltear H
			</Button>
			<Button
				type="border"
				size="sm"
				icon="flipVertical"
				disabled={cropMode || processing}
				onclick={() => flip(false)}
			>
				Voltear V
			</Button>
			<Button
				type={cropMode ? 'filled' : 'border'}
				color={cropMode ? 'warning' : 'primary'}
				size="sm"
				icon={cropMode ? 'x' : 'crop'}
				disabled={processing}
				onclick={toggleCrop}
			>
				{cropMode ? 'Cancelar recorte' : 'Recortar A5'}
			</Button>
			{#if cropMode}
				<Button
					type="flat"
					size="sm"
					icon="zoomOut"
					disabled={zoomLevel <= ZOOM_MIN || processing}
					onclick={() => zoom('out')}
				/>
				<Button
					type="flat"
					size="sm"
					icon="zoomIn"
					disabled={zoomLevel >= ZOOM_MAX || processing}
					onclick={() => zoom('in')}
				/>
			{/if}
			<Button type="flat" size="sm" icon="refresh" disabled={!canRevert} onclick={revert}>
				Revertir
			</Button>
			<Button
				type="filled"
				color="success"
				size="sm"
				icon="check"
				disabled={!canSave}
				loading={processing}
				onclick={() => void save()}
			>
				Guardar ajuste
			</Button>
		</div>

		<Chip color={pendingOperation ? 'warning' : 'info'} size="sm">{pendingLabel}</Chip>
	</div>

	{#if displayError}
		<div class="evaluation-image-editor__error">
			<p class="lumi-margin--none lumi-text--sm">{displayError}</p>
		</div>
	{/if}

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={containerRef}
		class="evaluation-image-editor__viewport"
		style={cropMode ? (dragging ? 'cursor: grabbing;' : 'cursor: grab;') : ''}
	>
		{#if displayedImageUrl}
			<img
				src={displayedImageUrl}
				alt={fileName || 'Previsualización de hoja'}
				class="evaluation-image-editor__image"
				style={imageStyle}
				draggable="false"
			/>
		{/if}

		{#if cropMode && cropFrame}
			<div
				class="evaluation-image-editor__crop-frame"
				style={`left:${cropFrame.x}px; top:${cropFrame.y}px; width:${cropFrame.w}px; height:${cropFrame.h}px;`}
				onmousedown={startDrag}
			></div>
			<div
				class="evaluation-image-editor__mask evaluation-image-editor__mask--top"
				style={`height:${cropFrame.y}px;`}
			></div>
			<div
				class="evaluation-image-editor__mask evaluation-image-editor__mask--bottom"
				style={`height:${Math.max((containerRef?.clientHeight ?? 0) - cropFrame.y - cropFrame.h, 0)}px;`}
			></div>
			<div
				class="evaluation-image-editor__mask evaluation-image-editor__mask--left"
				style={`top:${cropFrame.y}px; width:${cropFrame.x}px; height:${cropFrame.h}px;`}
			></div>
			<div
				class="evaluation-image-editor__mask evaluation-image-editor__mask--right"
				style={`top:${cropFrame.y}px; width:${Math.max((containerRef?.clientWidth ?? 0) - cropFrame.x - cropFrame.w, 0)}px; height:${cropFrame.h}px;`}
			></div>
		{/if}
	</div>
</div>

<style>
	.evaluation-image-editor {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-md);
	}

	.evaluation-image-editor__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--lumi-space-sm);
		flex-wrap: wrap;
	}

	.evaluation-image-editor__toolbar {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-sm);
	}

	.evaluation-image-editor__error {
		padding: var(--lumi-space-sm);
		border-radius: var(--lumi-radius-lg);
		border: var(--lumi-border-width-thin) solid
			color-mix(in srgb, var(--lumi-color-danger) 30%, var(--lumi-color-border));
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--lumi-color-danger) 12%, var(--lumi-color-surface)) 0%,
			var(--lumi-color-surface) 100%
		);
		color: var(--lumi-color-danger);
	}

	.evaluation-image-editor__viewport {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 24rem;
		border-radius: var(--lumi-radius-2xl);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		background:
			radial-gradient(
				circle at top,
				color-mix(in srgb, var(--lumi-color-info) 8%, transparent),
				transparent 58%
			),
			color-mix(in srgb, var(--lumi-color-surface) 88%, var(--lumi-color-background-hover) 12%);
		overflow: hidden;
	}

	.evaluation-image-editor__image {
		display: block;
		width: 100%;
		height: 100%;
		max-height: 32rem;
		object-fit: contain;
		user-select: none;
		transition: transform var(--lumi-duration-fast) var(--lumi-easing-default);
	}

	.evaluation-image-editor__crop-frame {
		position: absolute;
		border: 2px dashed var(--lumi-color-primary);
		border-radius: var(--lumi-radius-md);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--lumi-color-surface) 80%, transparent);
		z-index: 3;
	}

	.evaluation-image-editor__mask {
		position: absolute;
		background: rgba(0, 0, 0, 0.62);
		pointer-events: none;
		z-index: 2;
	}

	.evaluation-image-editor__mask--top,
	.evaluation-image-editor__mask--bottom {
		left: 0;
		right: 0;
	}

	.evaluation-image-editor__mask--top {
		top: 0;
	}

	.evaluation-image-editor__mask--bottom {
		bottom: 0;
	}

	.evaluation-image-editor__mask--left {
		left: 0;
	}

	.evaluation-image-editor__mask--right {
		right: 0;
	}

	@media (max-width: 720px) {
		.evaluation-image-editor__viewport {
			min-height: 18rem;
		}
	}
</style>
