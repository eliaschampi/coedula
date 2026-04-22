<script lang="ts">
	import { tick } from 'svelte';
	import Alert from '../Alert/Alert.svelte';
	import Avatar from '../Avatar/Avatar.svelte';
	import Button from '../Button/Button.svelte';
	import Dialog from '../Dialog/Dialog.svelte';
	import EmptyState from '../EmptyState/EmptyState.svelte';
	import LumiImage from '../Image/Image.svelte';
	import { MAX_FILE_SIZE } from '$lib/utils/drive';

	interface CropArea {
		x: number;
		y: number;
		size: number;
	}

	interface ImagePlacement {
		x: number;
		y: number;
		width: number;
		height: number;
		scaleFactor: number;
	}

	interface Props {
		value?: string;
		pendingFile?: File | null;
		label?: string;
		alt?: string;
		disabled?: boolean;
	}

	let {
		value = $bindable(''),
		pendingFile = $bindable<File | null>(null),
		label = 'Foto del alumno',
		alt = 'Foto del alumno',
		disabled = false
	}: Props = $props();

	// Component State
	let open = $state(false);
	let uploading = $state(false);
	let errorMessage = $state('');
	let canvas = $state<HTMLCanvasElement | null>(null);
	let canvasContainer = $state<HTMLDivElement | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let imageData = $state<HTMLImageElement | null>(null);

	// Drag & Crop State
	let dragging = $state(false);
	let dragOffsetX = $state(0);
	let dragOffsetY = $state(0);
	let cropArea = $state<CropArea>({ x: 0, y: 0, size: 220 });
	let lastPlacement = $state<ImagePlacement | null>(null);
	let localPreviewUrl = $state('');

	const previewSource = $derived(localPreviewUrl || value.trim());
	const hasPhoto = $derived(previewSource.length > 0);

	function clearTransientState(): void {
		errorMessage = '';
		imageData = null;
		dragging = false;
		lastPlacement = null;
		cropArea = { x: 0, y: 0, size: 220 };
	}

	function clamp(valueToClamp: number, min: number, max: number): number {
		return Math.min(Math.max(valueToClamp, min), max);
	}

	function getPlacement(image: HTMLImageElement, targetCanvas: HTMLCanvasElement): ImagePlacement {
		const widthRatio = targetCanvas.width / image.width;
		const heightRatio = targetCanvas.height / image.height;
		const scaleFactor = Math.min(widthRatio, heightRatio); // object-fit: contain
		const width = image.width * scaleFactor;
		const height = image.height * scaleFactor;

		return {
			x: (targetCanvas.width - width) / 2,
			y: (targetCanvas.height - height) / 2,
			width,
			height,
			scaleFactor
		};
	}

	function drawImage(): void {
		if (!canvas || !imageData) return;
		const context = canvas.getContext('2d');
		if (!context) return;

		context.clearRect(0, 0, canvas.width, canvas.height);
		const placement = getPlacement(imageData, canvas);
		lastPlacement = placement;
		context.drawImage(imageData, placement.x, placement.y, placement.width, placement.height);
	}

	async function prepareCanvas(): Promise<void> {
		await tick();
		if (!canvas || !canvasContainer) return;

		canvas.width = canvasContainer.clientWidth;
		canvas.height = canvasContainer.clientHeight;

		if (imageData) {
			drawImage(); // Draw first to get lastPlacement

			if (lastPlacement) {
				// Make crop area 85% of the shortest side of the actual image
				const maxImageDim = Math.min(lastPlacement.width, lastPlacement.height);
				const nextSize = maxImageDim * 0.85;

				// Center it precisely on the image
				cropArea = {
					x: lastPlacement.x + (lastPlacement.width - nextSize) / 2,
					y: lastPlacement.y + (lastPlacement.height - nextSize) / 2,
					size: nextSize
				};
			}
		}
	}

	function openFileDialog(): void {
		if (!disabled && !uploading) fileInput?.click();
	}

	function closeDialog(): void {
		open = false;
		clearTransientState();
	}

	function clearPreviewUrl(): void {
		if (localPreviewUrl.startsWith('blob:')) {
			URL.revokeObjectURL(localPreviewUrl);
		}
		localPreviewUrl = '';
	}

	function updatePendingPreview(file: File): void {
		clearPreviewUrl();
		pendingFile = file;
		localPreviewUrl = URL.createObjectURL(file);
	}

	function validateSelectedFile(file: File): string | null {
		if (!file.type.startsWith('image/')) return 'Solo se permiten imágenes';
		if (file.size > MAX_FILE_SIZE) return 'La imagen excede el tamaño máximo permitido';
		return null;
	}

	function loadFile(file: File): void {
		const validationMessage = validateSelectedFile(file);
		if (validationMessage) {
			errorMessage = validationMessage;
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			const image = new window.Image();
			image.onload = async () => {
				imageData = image;
				errorMessage = '';
				await prepareCanvas();
			};
			image.src = typeof reader.result === 'string' ? reader.result : '';
		};
		reader.readAsDataURL(file);
	}

	function handleFileChange(event: Event): void {
		const target = event.currentTarget as HTMLInputElement | null;
		const file = target?.files?.[0];
		if (file) loadFile(file);
		if (target) target.value = '';
	}

	async function pasteImage(): Promise<void> {
		if (!navigator.clipboard?.read) {
			errorMessage = 'Tu navegador no soporta pegado de imágenes';
			return;
		}

		try {
			const clipboardItems = await navigator.clipboard.read();
			const matchingItem = clipboardItems.find((item) =>
				item.types.some((type) => type.startsWith('image/'))
			);

			if (!matchingItem) {
				errorMessage = 'No se encontró una imagen en el portapapeles';
				return;
			}

			const preferredType = matchingItem.types.find((type) => type.startsWith('image/'));
			if (!preferredType) return;

			const blob = await matchingItem.getType(preferredType);
			loadFile(new File([blob], 'student-photo.png', { type: blob.type }));
		} catch {
			errorMessage = 'No se pudo pegar la imagen';
		}
	}

	// --- Enhanced Pointer Drag Logic ---
	function startDrag(event: PointerEvent): void {
		if (uploading) return;

		const target = event.currentTarget as HTMLElement;
		target.setPointerCapture(event.pointerId); // Locks pointer to this element (smooth fast dragging)

		dragging = true;
		dragOffsetX = event.offsetX;
		dragOffsetY = event.offsetY;
	}

	function stopDrag(event: PointerEvent): void {
		dragging = false;
		const target = event.currentTarget as HTMLElement;
		if (target.hasPointerCapture(event.pointerId)) {
			target.releasePointerCapture(event.pointerId);
		}
	}

	function handleDrag(event: PointerEvent): void {
		if (!dragging || !canvas || !lastPlacement) return;

		const rect = canvas.getBoundingClientRect();
		const nextX = event.clientX - rect.left - dragOffsetX;
		const nextY = event.clientY - rect.top - dragOffsetY;

		// Constrain dragging completely inside the IMAGE bounds, not just the canvas
		const minX = lastPlacement.x;
		const minY = lastPlacement.y;
		const maxX = lastPlacement.x + lastPlacement.width - cropArea.size;
		const maxY = lastPlacement.y + lastPlacement.height - cropArea.size;

		cropArea = {
			...cropArea,
			x: clamp(nextX, minX, maxX),
			y: clamp(nextY, minY, maxY)
		};
	}

	async function saveCroppedImage(): Promise<void> {
		if (!canvas || !imageData || !lastPlacement || uploading) return;

		uploading = true;
		errorMessage = '';

		try {
			const targetSize = 500; // Final square output size
			const exportCanvas = document.createElement('canvas');
			exportCanvas.width = targetSize;
			exportCanvas.height = targetSize;
			const exportContext = exportCanvas.getContext('2d');

			if (!exportContext) throw new Error('No se pudo preparar la imagen');

			const sourceX = (cropArea.x - lastPlacement.x) / lastPlacement.scaleFactor;
			const sourceY = (cropArea.y - lastPlacement.y) / lastPlacement.scaleFactor;
			const sourceSize = cropArea.size / lastPlacement.scaleFactor;

			exportContext.drawImage(
				imageData,
				clamp(sourceX, 0, imageData.width),
				clamp(sourceY, 0, imageData.height),
				clamp(sourceSize, 1, imageData.width),
				clamp(sourceSize, 1, imageData.height),
				0,
				0,
				targetSize,
				targetSize
			);

			const blob = await new Promise<Blob>((resolve, reject) => {
				exportCanvas.toBlob((result) => {
					if (result) resolve(result);
					else reject(new Error('No se pudo exportar la foto'));
				}, 'image/png');
			});

			updatePendingPreview(new File([blob], 'student-photo.png', { type: blob.type }));
			closeDialog();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'No se pudo preparar la foto';
		} finally {
			uploading = false;
		}
	}

	function removePhoto(): void {
		value = '';
		pendingFile = null;
		clearPreviewUrl();
	}

	// --- Effects ---
	$effect(() => {
		if (!open) clearTransientState();
	});

	$effect(() => {
		if (!pendingFile) clearPreviewUrl();
	});

	$effect(() => {
		if (!open) return;
		void prepareCanvas();

		const handleResize = () => void prepareCanvas();
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
			dragging = false;
		};
	});

	$effect(() => {
		return () => clearPreviewUrl(); // Component unmount cleanup
	});
</script>

<div
	class="lumi-student-photo-field lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--gap-md lumi-flex--mobile-column"
>
	<div class="lumi-stack lumi-stack--sm lumi-flex-item--grow lumi-width--full">
		<div class="lumi-stack lumi-stack--2xs">
			<span class="lumi-student-photo-field__label">{label}</span>
			<span class="lumi-text--xs lumi-text--muted">
				Recorta y prepara una foto cuadrada. Se guardará junto con el formulario del alumno.
			</span>
		</div>

		<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
			<Button type="border" icon="imagePlus" onclick={() => (open = true)} {disabled}>
				{hasPhoto ? 'Cambiar foto' : 'Subir foto'}
			</Button>

			{#if hasPhoto}
				<Button type="flat" color="danger" icon="trash" onclick={removePhoto} {disabled}>
					Quitar
				</Button>
			{/if}
		</div>
	</div>

	<div class="lumi-student-photo-field__preview">
		{#if hasPhoto}
			<LumiImage
				src={previewSource}
				{alt}
				radius="lg"
				disableSkeleton
				class="lumi-student-photo-field__preview-image"
			/>
		{:else}
			<div class="lumi-student-photo-field__preview-placeholder">
				<Avatar text={alt || label} size="xl" color="primary" />
			</div>
		{/if}
	</div>
</div>

<Dialog bind:open title="Subir foto del alumno" size="lg" persistent={uploading}>
	<div class="lumi-stack lumi-stack--md">
		{#if errorMessage}
			<Alert type="warning" closable onclose={() => (errorMessage = '')}>{errorMessage}</Alert>
		{/if}

		<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
			<Button type="border" icon="folderOpen" onclick={openFileDialog} disabled={uploading}>
				Seleccionar imagen
			</Button>
			<Button type="flat" icon="clipboard" onclick={() => void pasteImage()} disabled={uploading}>
				Pegar imagen
			</Button>
			<input
				bind:this={fileInput}
				type="file"
				accept="image/*"
				class="lumi-student-photo-field__input"
				onchange={handleFileChange}
			/>
		</div>

		{#if imageData}
			<div class="lumi-stack lumi-stack--sm">
				<div
					bind:this={canvasContainer}
					class="lumi-student-photo-field__canvas-shell"
					role="presentation"
				>
					<canvas bind:this={canvas} class="lumi-student-photo-field__canvas"></canvas>

					<!-- Bound CSS variables directly in markup (Svelte 5 best practice) -->
					<button
						type="button"
						class="lumi-student-photo-field__crop-area"
						style="--lumi-student-photo-crop-x: {cropArea.x}px; --lumi-student-photo-crop-y: {cropArea.y}px; --lumi-student-photo-crop-size: {cropArea.size}px;"
						onpointerdown={startDrag}
						onpointermove={handleDrag}
						onpointerup={stopDrag}
						onpointercancel={stopDrag}
						aria-label="Mover recorte"
						disabled={uploading}
					>
						<span class="lumi-student-photo-field__crop-area-hint">Arrastra para centrar</span>
					</button>
				</div>
				<p class="lumi-text--xs lumi-text--muted lumi-margin--none">
					El área resaltada será la foto final del alumno.
				</p>
			</div>
		{:else}
			<EmptyState
				title="Selecciona una imagen"
				description="Puedes elegir un archivo o pegar una captura para recortarla antes de adjuntarla al formulario."
				icon="image"
			/>
		{/if}
	</div>

	{#snippet footer()}
		<Button type="border" onclick={closeDialog} disabled={uploading}>Cancelar</Button>
		<Button
			type="filled"
			color="primary"
			icon="check"
			loading={uploading}
			disabled={!imageData}
			onclick={() => void saveCroppedImage()}
		>
			Guardar recorte
		</Button>
	{/snippet}
</Dialog>

<style>
	/* All CSS kept perfectly consistent with your original file */
	.lumi-student-photo-field {
		padding: var(--lumi-space-md);
		border-radius: var(--lumi-radius-2xl);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		background:
			linear-gradient(
				135deg,
				color-mix(in srgb, var(--lumi-color-primary) 5%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-info) 8%, transparent) 100%
			),
			var(--lumi-color-surface);
		box-shadow: var(--lumi-shadow-sm);
	}

	.lumi-student-photo-field__label {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
	}

	.lumi-student-photo-field__preview {
		inline-size: calc(var(--lumi-space-5xl) * 2);
		block-size: calc(var(--lumi-space-5xl) * 2);
		border-radius: var(--lumi-radius-2xl);
		overflow: hidden;
		border: var(--lumi-border-width-thin) solid
			color-mix(in srgb, var(--lumi-color-primary) 18%, var(--lumi-color-border));
		box-shadow: var(--lumi-shadow-md);
		background: var(--lumi-color-background-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.lumi-student-photo-field__preview :global(.lumi-image),
	.lumi-student-photo-field__preview :global(.lumi-image__img) {
		inline-size: 100%;
		block-size: 100%;
	}

	.lumi-student-photo-field__preview-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		inline-size: 100%;
		block-size: 100%;
	}

	.lumi-student-photo-field__input {
		display: none;
	}

	.lumi-student-photo-field__canvas-shell {
		position: relative;
		height: calc(var(--lumi-space-5xl) * 4);
		border-radius: var(--lumi-radius-2xl);
		overflow: hidden;
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		background:
			radial-gradient(
				circle at top,
				color-mix(in srgb, var(--lumi-color-info) 10%, transparent),
				transparent 55%
			),
			color-mix(in srgb, var(--lumi-color-surface) 70%, var(--lumi-color-background-hover) 30%);
		box-shadow: inset 0 0 0 var(--lumi-border-width-thin)
			color-mix(in srgb, var(--lumi-color-white) 25%, transparent);
	}

	.lumi-student-photo-field__canvas {
		width: 100%;
		height: 100%;
		display: block;
	}

	.lumi-student-photo-field__crop-area {
		position: absolute;
		left: var(--lumi-student-photo-crop-x, 0px);
		top: var(--lumi-student-photo-crop-y, 0px);
		inline-size: var(--lumi-student-photo-crop-size, 0px);
		block-size: var(--lumi-student-photo-crop-size, 0px);
		border: var(--lumi-border-width-thick) solid var(--lumi-color-white);
		border-radius: var(--lumi-radius-xl);
		box-shadow:
			0 0 0 calc(var(--lumi-border-width-thick) * 2)
				color-mix(in srgb, var(--lumi-color-black) 20%, transparent),
			0 0 0 999rem color-mix(in srgb, var(--lumi-color-black) 42%, transparent);
		background: transparent;
		cursor: grab;
		display: flex;
		align-items: end;
		justify-content: center;
		padding: var(--lumi-space-sm);
		touch-action: none; /* Prevents mobile scrolling while dragging */
	}

	.lumi-student-photo-field__crop-area:active {
		cursor: grabbing;
	}

	.lumi-student-photo-field__crop-area-hint {
		padding: var(--lumi-space-2xs) var(--lumi-space-xs);
		border-radius: var(--lumi-radius-full);
		background: color-mix(in srgb, var(--lumi-color-black) 65%, transparent);
		color: var(--lumi-color-white);
		font-size: var(--lumi-font-size-xs);
		pointer-events: none; /* Prevents text from interfering with drag events */
	}

	@media (max-width: 768px) {
		.lumi-student-photo-field__preview {
			inline-size: calc(var(--lumi-space-5xl) * 1.5);
			block-size: calc(var(--lumi-space-5xl) * 1.5);
		}

		.lumi-student-photo-field__canvas-shell {
			block-size: calc(var(--lumi-space-5xl) * 3);
		}
	}
</style>
