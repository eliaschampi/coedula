<script lang="ts">
	import { Icon } from '../Icon';
	import { Loading } from '../Loading';
	import type { FileUploadFile, FileUploadProps } from './types';

	let {
		files = $bindable([]),
		placeholderText = 'Upload your files',
		hintText = 'Drag your files here or click to select',
		accept = '*',
		multiple = false,
		maxSize = 0,
		disabled = false,
		addMoreText = 'Add more files',
		class: className = '',
		validateFile,
		oninvalid,
		maxSizeErrorMessage,
		onchange,
		onremove
	}: FileUploadProps = $props();

	let fileInputRef: HTMLInputElement | undefined = $state();
	let isDragging = $state(false);
	const canTriggerDialogFromDropzone = $derived(!disabled && !(multiple && files.length > 0));

	const dropzoneClasses = $derived(() => {
		const hasError = files.some((file) => file.status === 'error');
		return [
			'lumi-file-upload__dropzone',
			isDragging && 'lumi-file-upload__dropzone--dragging',
			disabled && 'lumi-file-upload__dropzone--disabled',
			!canTriggerDialogFromDropzone && 'lumi-file-upload__dropzone--files-added',
			hasError && 'lumi-file-upload__dropzone--error'
		]
			.filter(Boolean)
			.join(' ');
	});

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
	}

	function buildMaxSizeMessage(file: File): string {
		if (maxSizeErrorMessage) {
			return maxSizeErrorMessage(file, maxSize);
		}

		return `Max size: ${formatFileSize(maxSize)}`;
	}

	function processFiles(fileList: File[]): void {
		if (disabled || fileList.length === 0) {
			return;
		}

		const nextFiles: FileUploadFile[] = [];

		for (const file of fileList) {
			let validationMessage: string | null = null;

			if (maxSize > 0 && file.size > maxSize) {
				validationMessage = buildMaxSizeMessage(file);
			}

			if (!validationMessage && validateFile) {
				validationMessage = validateFile(file);
			}

			if (validationMessage) {
				if (oninvalid) {
					oninvalid(validationMessage, file);
					continue;
				}

				nextFiles.push({
					id: `${file.name}-${file.lastModified}-${Math.random().toString(36).substring(2, 11)}`,
					file,
					status: 'error',
					progress: 0,
					error: validationMessage
				});
				continue;
			}

			nextFiles.push({
				id: `${file.name}-${file.lastModified}-${Math.random().toString(36).substring(2, 11)}`,
				file,
				status: 'selected',
				progress: 0
			});
		}

		if (nextFiles.length === 0) {
			return;
		}

		files = multiple ? [...files, ...nextFiles] : [nextFiles[0]];
		onchange?.(files);
	}

	function handleFileChange(event: Event): void {
		const target = event.currentTarget as HTMLInputElement | null;
		if (!target?.files) {
			return;
		}

		processFiles(Array.from(target.files));
		target.value = '';
	}

	function handleDragOver(event: DragEvent): void {
		event.preventDefault();
		if (!disabled) {
			isDragging = true;
		}
	}

	function handleDragLeave(event: DragEvent): void {
		event.preventDefault();
		isDragging = false;
	}

	function handleDrop(event: DragEvent): void {
		event.preventDefault();
		if (disabled) {
			return;
		}

		isDragging = false;
		if (!event.dataTransfer?.files) {
			return;
		}

		processFiles(Array.from(event.dataTransfer.files));
	}

	function handleDropzoneClick(event: MouseEvent): void {
		if (disabled || !canTriggerDialogFromDropzone) {
			return;
		}

		const target = event.target as HTMLElement;
		if (
			target.closest('.lumi-file-upload__file-item') ||
			target.closest('.lumi-file-upload__add-more')
		) {
			return;
		}

		fileInputRef?.click();
	}

	function handleDropzoneKeydown(event: KeyboardEvent): void {
		if (!canTriggerDialogFromDropzone || (event.key !== 'Enter' && event.key !== ' ')) {
			return;
		}

		const target = event.target as HTMLElement;
		if (
			target.closest('.lumi-file-upload__file-item') ||
			target.closest('.lumi-file-upload__add-more')
		) {
			return;
		}

		event.preventDefault();
		fileInputRef?.click();
	}

	function openFileDialog(): void {
		if (!disabled) {
			fileInputRef?.click();
		}
	}

	function removeFile(id: string): void {
		files = files.filter((file) => file.id !== id);
		onremove?.(id);
		onchange?.(files);
	}

	export const clear = (): void => {
		files = [];
		onchange?.(files);
	};
</script>

<div class="lumi-file-upload {className}">
	<div
		class={dropzoneClasses()}
		onclick={handleDropzoneClick}
		onkeydown={handleDropzoneKeydown}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		role="button"
		tabindex={canTriggerDialogFromDropzone ? 0 : -1}
		aria-disabled={disabled || !canTriggerDialogFromDropzone}
		aria-label="File upload dropzone"
	>
		<input
			bind:this={fileInputRef}
			type="file"
			{accept}
			{multiple}
			{disabled}
			class="lumi-file-upload__input"
			onchange={handleFileChange}
		/>

		{#if files.length === 0}
			<div class="lumi-file-upload__placeholder">
				<div class="lumi-file-upload__icon-wrapper">
					<Icon icon="upload" size="xl" class="lumi-file-upload__placeholder-icon" />
				</div>
				<span class="lumi-file-upload__placeholder-text">{placeholderText}</span>
				<span class="lumi-file-upload__placeholder-info">{hintText}</span>
			</div>
		{:else}
			<div class="lumi-file-upload__file-list" role="list" aria-label="Uploaded files">
				{#each files as fileWrapper (fileWrapper.id)}
					<div
						class="lumi-file-upload__file-item lumi-file-upload__file-item--{fileWrapper.status}"
						role="listitem"
						aria-label="File: {fileWrapper.file.name}"
					>
						<div class="lumi-file-upload__file-icon">
							<Icon icon="file" size="lg" />
						</div>

						<div class="lumi-file-upload__file-item-details">
							<span class="lumi-file-upload__file-item-name" title={fileWrapper.file.name}>
								{fileWrapper.file.name}
							</span>
							<span class="lumi-file-upload__file-item-info">
								{#if fileWrapper.status === 'error'}
									<span class="lumi-text--danger">{fileWrapper.error}</span>
								{:else}
									{formatFileSize(fileWrapper.file.size)}
								{/if}
							</span>
						</div>

						<div class="lumi-file-upload__file-item-actions">
							{#if fileWrapper.status === 'uploading'}
								<Loading size="sm" color="primary" />
							{/if}
							{#if fileWrapper.status === 'success'}
								<Icon icon="checkCircle" color="var(--lumi-color-success)" size="md" />
							{/if}
							{#if ['selected', 'error'].includes(fileWrapper.status) && !disabled}
								<button
									type="button"
									class="lumi-file-upload__remove-btn"
									onclick={() => removeFile(fileWrapper.id)}
									aria-label="Remove file {fileWrapper.file.name}"
								>
									<Icon icon="x" size="sm" />
								</button>
							{/if}
						</div>

						{#if ['uploading', 'success'].includes(fileWrapper.status)}
							<div class="lumi-file-upload__progress-track">
								<div
									class="lumi-file-upload__progress-bar"
									style="width: {fileWrapper.progress}%"
									role="progressbar"
									aria-valuenow={fileWrapper.progress}
									aria-valuemin={0}
									aria-valuemax={100}
								></div>
							</div>
						{/if}
					</div>
				{/each}

				{#if multiple}
					<button
						type="button"
						class="lumi-file-upload__add-more"
						onclick={openFileDialog}
						{disabled}
					>
						<Icon icon="plus" size="sm" />
						<span>{addMoreText}</span>
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.lumi-file-upload {
		width: 100%;
		font-family: var(--lumi-font-family-sans);
	}

	.lumi-file-upload__dropzone {
		display: flex;
		flex-direction: column;
		width: 100%;
		min-height: calc(var(--lumi-space-6xl) + var(--lumi-space-4xl));
		padding: var(--lumi-space-lg);
		border: var(--lumi-border-width-thick) dashed var(--lumi-color-border);
		border-radius: var(--lumi-radius-lg);
		background-color: var(--lumi-color-surface);
		transition: var(--lumi-transition-all);
		position: relative;
		overflow: hidden;
		cursor: pointer;
		font: inherit;
		text-align: left;
	}

	.lumi-file-upload__dropzone:not(.lumi-file-upload__dropzone--disabled):hover {
		border-color: var(--lumi-color-primary);
		background-color: var(--lumi-color-background-hover);
	}

	.lumi-file-upload__dropzone:focus-visible {
		outline: none;
		border-color: var(--lumi-color-primary);
		box-shadow: 0 0 0 var(--lumi-space-2xs) var(--lumi-color-primary-bg);
	}

	.lumi-file-upload__dropzone--dragging {
		border-color: var(--lumi-color-primary);
		background-color: var(--lumi-color-primary-bg);
		transform: scale(1.01);
	}

	.lumi-file-upload__dropzone--disabled {
		opacity: var(--lumi-opacity-disabled);
		cursor: not-allowed;
		background-color: var(--lumi-color-background-secondary);
		border-style: solid;
	}

	.lumi-file-upload__dropzone--files-added {
		cursor: default;
	}

	.lumi-file-upload__dropzone--error {
		border-color: var(--lumi-color-danger);
		background-color: var(--lumi-color-danger-bg);
	}

	.lumi-file-upload__placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: var(--lumi-space-sm);
		flex-grow: 1;
		color: var(--lumi-color-text-muted);
		padding: var(--lumi-space-lg);
	}

	.lumi-file-upload__icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-space-3xl);
		height: var(--lumi-space-3xl);
		border-radius: var(--lumi-radius-full);
		background-color: var(--lumi-color-background-secondary);
		color: var(--lumi-color-text-muted);
		transition: var(--lumi-transition-all);
		margin-bottom: var(--lumi-space-xs);
	}

	.lumi-file-upload__dropzone:hover .lumi-file-upload__icon-wrapper {
		background-color: var(--lumi-color-primary-bg);
		color: var(--lumi-color-primary);
		transform: scale(1.1);
	}

	.lumi-file-upload__placeholder-text {
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		font-size: var(--lumi-font-size-lg);
	}

	.lumi-file-upload__placeholder-info {
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-text-muted);
	}

	.lumi-file-upload__input {
		display: none;
	}

	.lumi-file-upload__file-list {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-sm);
		width: 100%;
	}

	.lumi-file-upload__file-item {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-md);
		min-height: calc(var(--lumi-space-xxl) + var(--lumi-space-lg));
		background-color: var(--lumi-color-background);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-md);
		transition: var(--lumi-transition-all);
		position: relative;
		overflow: hidden;
		cursor: default;
		flex: 0 0 auto;
	}

	.lumi-file-upload__file-item:hover {
		border-color: var(--lumi-color-border-strong);
		box-shadow: var(--lumi-shadow-sm);
	}

	.lumi-file-upload__file-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-space-xxl);
		height: var(--lumi-space-xxl);
		border-radius: var(--lumi-radius-md);
		background-color: var(--lumi-color-background-secondary);
		color: var(--lumi-color-text-muted);
	}

	.lumi-file-upload__file-item-details {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		gap: var(--lumi-space-2xs);
	}

	.lumi-file-upload__file-item-name {
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-file-upload__file-item-info {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
	}

	.lumi-file-upload__file-item-actions {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
	}

	.lumi-file-upload__remove-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--lumi-space-xs);
		border-radius: var(--lumi-radius-sm);
		color: var(--lumi-color-text-muted);
		transition: var(--lumi-transition-all);
	}

	.lumi-file-upload__remove-btn:hover {
		background-color: var(--lumi-color-danger-bg);
		color: var(--lumi-color-danger);
	}

	.lumi-file-upload__file-item--uploading .lumi-file-upload__progress-bar {
		background-color: var(--lumi-color-primary);
	}

	.lumi-file-upload__file-item--success {
		border-color: var(--lumi-color-success);
		background-color: color-mix(in srgb, var(--lumi-color-success) 5%, var(--lumi-color-surface));
	}

	.lumi-file-upload__file-item--success .lumi-file-upload__file-icon {
		background-color: var(--lumi-color-success-bg);
		color: var(--lumi-color-success);
	}

	.lumi-file-upload__file-item--error {
		border-color: var(--lumi-color-danger);
		background-color: var(--lumi-color-danger-bg);
	}

	.lumi-file-upload__file-item--error .lumi-file-upload__file-icon {
		background-color: var(--lumi-color-danger-bg);
		color: var(--lumi-color-danger);
	}

	.lumi-file-upload__progress-track {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: var(--lumi-border-width-thick);
		background-color: transparent;
		overflow: hidden;
		grid-column: 1 / -1;
	}

	.lumi-file-upload__progress-bar {
		height: 100%;
		width: 0;
		background-color: var(--lumi-color-primary);
		transition: width var(--lumi-duration-slow) var(--lumi-easing-default);
	}

	.lumi-file-upload__add-more {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-xs);
		padding: var(--lumi-space-sm);
		background: transparent;
		border: var(--lumi-border-width-thin) dashed var(--lumi-color-border);
		border-radius: var(--lumi-radius-md);
		color: var(--lumi-color-text-muted);
		font-size: var(--lumi-font-size-sm);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		width: 100%;
		flex: 0 0 auto;
	}

	.lumi-file-upload__add-more:hover:not(:disabled) {
		border-color: var(--lumi-color-primary);
		color: var(--lumi-color-primary);
		background-color: var(--lumi-color-primary-bg);
	}

	.lumi-file-upload__add-more:disabled {
		cursor: not-allowed;
		opacity: var(--lumi-opacity-disabled);
	}
</style>
