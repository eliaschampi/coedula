<script lang="ts">
	import { Icon } from '$lib/components';
	import {
		formatFileSize,
		getDriveServeUrl,
		getDriveTagByHash,
		getDriveTypeLabel,
		getFileColor,
		getFileIcon
	} from '$lib/utils/drive';
	import type { DriveFileItem } from './types';

	interface Props {
		file: DriveFileItem;
		selected?: boolean;
		isTrash?: boolean;
		onclick?: (file: DriveFileItem) => void;
		ondblclick?: (file: DriveFileItem) => void;
		oncontextmenu?: (event: MouseEvent, file: DriveFileItem) => void;
		ondragstart?: (event: DragEvent, file: DriveFileItem) => void;
		ondragend?: () => void;
		ondrop?: (event: DragEvent, file: DriveFileItem) => void;
	}

	const {
		file,
		selected = false,
		isTrash = false,
		onclick,
		ondblclick,
		oncontextmenu,
		ondragstart,
		ondragend,
		ondrop
	}: Props = $props();

	let isDragging = $state(false);
	let isDropTarget = $state(false);
	let dragCounter = $state(0);
	let longPressTimer: ReturnType<typeof setTimeout> | undefined;
	let longPressTriggered = false;
	const tagOption = $derived(getDriveTagByHash(file.tag));
	const previewUrl = $derived(
		file.type === 'img' ? getDriveServeUrl(file.code, { variant: 'thumb' }) : ''
	);
	const typeLabel = $derived(getDriveTypeLabel(file.type));

	const cardClasses = $derived(
		[
			'drive-file-card',
			selected && 'drive-file-card--selected',
			isDragging && 'drive-file-card--dragging',
			isDropTarget && file.type === 'dir' && 'drive-file-card--drop-target'
		]
			.filter(Boolean)
			.join(' ')
	);

	function handleClick() {
		if (longPressTriggered) {
			longPressTriggered = false;
			return;
		}
		onclick?.(file);
	}

	function handleDblClick() {
		ondblclick?.(file);
	}

	function handleContextMenu(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		oncontextmenu?.(event, file);
	}

	function handleDragStart(event: DragEvent) {
		if (isTrash) return;
		isDragging = true;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('application/json', JSON.stringify(file));
		}
		ondragstart?.(event, file);
	}

	function handleDragEnd() {
		isDragging = false;
		isDropTarget = false;
		dragCounter = 0;
		ondragend?.();
	}

	function handleDragEnter() {
		if (file.type === 'dir' && !isTrash && !isDragging) {
			dragCounter += 1;
			isDropTarget = true;
		}
	}

	function handleDragLeave() {
		if (file.type === 'dir' && !isTrash) {
			dragCounter -= 1;
			if (dragCounter <= 0) {
				dragCounter = 0;
				isDropTarget = false;
			}
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();

		if (!event.dataTransfer) {
			return;
		}

		if (file.type === 'dir' && !isTrash && !isDragging) {
			event.dataTransfer.dropEffect = 'move';
		} else {
			event.dataTransfer.dropEffect = 'none';
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();

		if (file.type !== 'dir' || isTrash || isDragging) {
			return;
		}

		dragCounter = 0;
		isDropTarget = false;
		ondrop?.(event, file);
	}

	function handleTouchStart(event: TouchEvent) {
		if (isTrash) return;

		longPressTriggered = false;
		longPressTimer = setTimeout(() => {
			longPressTriggered = true;
			const touch = event.touches[0];
			if (!touch) return;

			const syntheticEvent = new MouseEvent('contextmenu', {
				bubbles: true,
				cancelable: true,
				clientX: touch.clientX,
				clientY: touch.clientY
			});

			oncontextmenu?.(syntheticEvent, file);
		}, 600);
	}

	function clearLongPress() {
		if (longPressTimer !== undefined) {
			clearTimeout(longPressTimer);
			longPressTimer = undefined;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleDblClick();
		}
	}
</script>

<button
	type="button"
	class={cardClasses}
	draggable={!isTrash}
	onclick={handleClick}
	ondblclick={handleDblClick}
	oncontextmenu={handleContextMenu}
	ondragstart={handleDragStart}
	ondragend={handleDragEnd}
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	ontouchstart={handleTouchStart}
	ontouchend={clearLongPress}
	ontouchmove={clearLongPress}
	onkeydown={handleKeydown}
>
	<div class="drive-file-card__preview">
		{#if file.type === 'img'}
			<img
				class="drive-file-card__image"
				src={previewUrl}
				alt={file.name}
				loading="lazy"
				decoding="async"
				fetchpriority="low"
			/>
		{:else}
			<div class="drive-file-card__icon-scene">
				<Icon
					icon={getFileIcon(file.type)}
					size="var(--lumi-drive-file-icon-size)"
					color={getFileColor(file.type)}
				/>
			</div>
		{/if}
		<span class="drive-file-card__kind">{typeLabel}</span>
		{#if tagOption}
			<span class="drive-file-card__tag">
				<span class="drive-file-card__tag-dot" style:--drive-tag-color={tagOption.color}></span>
			</span>
		{/if}
	</div>

	<div class="drive-file-card__content">
		<div class="drive-file-card__name" title={file.name}>
			{file.name}
		</div>
		<div class="drive-file-card__meta">
			<span class="drive-file-card__type">{typeLabel}</span>
			{#if file.type !== 'dir'}
				<span class="drive-file-card__separator">•</span>
				<span class="drive-file-card__size">{formatFileSize(file.size)}</span>
			{/if}
		</div>
	</div>
</button>

<style>
	.drive-file-card {
		--drive-file-card-padding: var(--lumi-drive-file-card-padding);
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: var(--lumi-space-xs);
		width: 100%;
		padding: var(--drive-file-card-padding);
		background:
			linear-gradient(
				165deg,
				color-mix(in srgb, var(--lumi-color-primary) 7%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-info) 4%, transparent) 55%,
				transparent 100%
			),
			var(--lumi-color-surface);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-2xl);
		cursor: pointer;
		transition:
			transform var(--lumi-duration-fast) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-fast) var(--lumi-easing-default),
			border-color var(--lumi-duration-fast) var(--lumi-easing-default),
			background-color var(--lumi-duration-fast) var(--lumi-easing-default);
		text-align: left;
		position: relative;
		overflow: hidden;
		box-shadow: var(--lumi-shadow-sm);
	}

	.drive-file-card:hover {
		transform: translateY(calc(var(--lumi-space-2xs) * -0.5));
		border-color: color-mix(in srgb, var(--lumi-color-primary) 36%, var(--lumi-color-border));
		box-shadow: var(--lumi-shadow-lg);
	}

	.drive-file-card:focus-visible {
		outline: none;
		border-color: color-mix(in srgb, var(--lumi-color-primary) 40%, var(--lumi-color-border));
		box-shadow:
			0 0 0 var(--lumi-border-width-thick)
				color-mix(in srgb, var(--lumi-color-primary) 20%, transparent),
			var(--lumi-shadow-lg);
	}

	.drive-file-card--selected {
		border-color: var(--lumi-color-primary);
		background:
			linear-gradient(
				165deg,
				color-mix(in srgb, var(--lumi-color-primary) 16%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-info) 8%, transparent) 55%,
				transparent 100%
			),
			var(--lumi-color-surface);
		box-shadow: var(--lumi-shadow-md);
	}

	.drive-file-card--dragging {
		opacity: 0.5;
	}

	.drive-file-card--drop-target {
		border: var(--lumi-border-width-thin) dashed var(--lumi-color-primary);
		background: color-mix(in srgb, var(--lumi-color-primary) 8%, var(--lumi-color-surface));
		transform: scale(1.02);
	}

	.drive-file-card__preview {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		aspect-ratio: var(--lumi-drive-file-preview-ratio);
		border-radius: var(--lumi-radius-xl);
		background:
			linear-gradient(
				145deg,
				color-mix(in srgb, var(--lumi-color-primary) 14%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-info) 10%, transparent) 45%,
				color-mix(in srgb, var(--lumi-color-surface) 92%, transparent) 100%
			),
			var(--lumi-color-background-secondary);
		overflow: hidden;
	}

	.drive-file-card__image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--lumi-duration-slow) var(--lumi-easing-default);
	}

	.drive-file-card:hover .drive-file-card__image {
		transform: scale(1.04);
	}

	.drive-file-card__icon-scene {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background:
			radial-gradient(
				circle at 50% 35%,
				color-mix(in srgb, var(--lumi-color-surface) 70%, transparent) 0%,
				transparent 70%
			),
			transparent;
	}

	.drive-file-card__kind {
		position: absolute;
		left: var(--lumi-space-xs);
		top: var(--lumi-space-xs);
		display: inline-flex;
		align-items: center;
		padding: var(--lumi-space-2xs) var(--lumi-space-xs);
		border-radius: var(--lumi-radius-full);
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text-muted);
		background: color-mix(in srgb, var(--lumi-color-surface) 90%, transparent);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
	}

	.drive-file-card__tag {
		position: absolute;
		right: var(--lumi-space-xs);
		bottom: var(--lumi-space-xs);
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		background: color-mix(in srgb, var(--lumi-color-surface) 92%, transparent);
		border-radius: var(--lumi-radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.drive-file-card__tag-dot {
		width: var(--lumi-drive-tag-dot-size);
		height: var(--lumi-drive-tag-dot-size);
		border-radius: var(--lumi-radius-full);
		background: var(--drive-tag-color, var(--lumi-color-border));
	}

	.drive-file-card__content {
		padding: 0;
	}

	.drive-file-card__name {
		width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		word-break: break-word;
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-tight);
		color: var(--lumi-color-text);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		min-height: calc(var(--lumi-font-size-sm) * 2.4);
	}

	.drive-file-card__meta {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-2xs);
	}

	.drive-file-card__type,
	.drive-file-card__size {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
		letter-spacing: 0.01em;
	}

	.drive-file-card__separator {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
	}

	@media (max-width: 640px) {
		.drive-file-card {
			--drive-file-card-padding: var(--lumi-drive-file-card-padding-mobile);
		}
	}
</style>
