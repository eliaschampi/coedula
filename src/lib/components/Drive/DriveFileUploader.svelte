<script lang="ts">
	import { Alert, Button, Dialog, FileUpload } from '$lib/components';
	import type { FileUploadFile } from '$lib/components';
	import {
		DRIVE_IMAGE_COMPRESSION_THRESHOLD_BYTES,
		formatFileSize,
		MAX_FILE_SIZE
	} from '$lib/utils/drive';

	interface Props {
		open: boolean;
		onupload?: (file: File, customName?: string) => Promise<void>;
		onclose?: () => void;
	}

	let { open = $bindable(false), onupload, onclose }: Props = $props();

	let queue = $state<FileUploadFile[]>([]);
	let uploading = $state(false);
	let errorMessage = $state('');

	const pendingUploadsCount = $derived(
		queue.filter((item) => item.status === 'selected' || item.status === 'error').length
	);

	const uploaderHintText = $derived(
		`Máximo ${formatFileSize(MAX_FILE_SIZE)} por archivo - Las imágenes mayores a ${formatFileSize(
			DRIVE_IMAGE_COMPRESSION_THRESHOLD_BYTES
		)} se optimizan automáticamente`
	);

	function validateDriveFile(file: File): string | null {
		if (file.size === 0) {
			return `"${file.name}" está vacío`;
		}

		return null;
	}

	function updateQueueItem(id: string, updater: (item: FileUploadFile) => void): void {
		const item = queue.find((current) => current.id === id);
		if (!item) {
			return;
		}

		updater(item);
		queue = [...queue];
	}

	function resetDialogState(): void {
		queue = [];
		errorMessage = '';
	}

	$effect(() => {
		if (!open && !uploading && (queue.length > 0 || errorMessage)) {
			resetDialogState();
		}
	});

	function closeDialog(): void {
		if (uploading) {
			return;
		}

		resetDialogState();
		open = false;
		onclose?.();
	}

	async function uploadQueuedFiles(): Promise<void> {
		if (pendingUploadsCount === 0 || uploading) {
			return;
		}

		if (!onupload) {
			errorMessage = 'No se configuró el servicio de subida de archivos';
			return;
		}

		uploading = true;
		errorMessage = '';
		let hasFailures = false;

		for (const item of queue) {
			if (item.status !== 'selected' && item.status !== 'error') {
				continue;
			}

			updateQueueItem(item.id, (queueItem) => {
				queueItem.status = 'uploading';
				queueItem.progress = 30;
				queueItem.error = undefined;
			});

			try {
				await onupload(item.file);

				updateQueueItem(item.id, (queueItem) => {
					queueItem.status = 'success';
					queueItem.progress = 100;
					queueItem.error = undefined;
				});
			} catch (caught) {
				hasFailures = true;
				const message = caught instanceof Error ? caught.message : 'Error al subir archivos';

				if (!errorMessage) {
					errorMessage = message;
				}

				updateQueueItem(item.id, (queueItem) => {
					queueItem.status = 'error';
					queueItem.progress = 0;
					queueItem.error = message;
				});
			}
		}

		uploading = false;

		if (!hasFailures) {
			resetDialogState();
			open = false;
			onclose?.();
		}
	}
</script>

<Dialog bind:open title="Subir archivos" size="md" persistent={uploading}>
	<div class="lumi-stack lumi-stack--md">
		{#if errorMessage}
			<Alert type="warning" closable onclose={() => (errorMessage = '')}>{errorMessage}</Alert>
		{/if}

		<div class="drive-uploader__file-upload">
			<FileUpload
				bind:files={queue}
				multiple
				maxSize={MAX_FILE_SIZE}
				disabled={uploading}
				placeholderText="Arrastra archivos aquí o haz clic para seleccionar"
				hintText={uploaderHintText}
				addMoreText="Agregar más archivos"
				validateFile={validateDriveFile}
				maxSizeErrorMessage={(file) =>
					`"${file.name}" excede el tamaño máximo de ${formatFileSize(MAX_FILE_SIZE)}`}
				oninvalid={(message) => {
					errorMessage = message;
				}}
			/>
		</div>
	</div>

	{#snippet footer()}
		<Button type="border" onclick={closeDialog} disabled={uploading}>Cancelar</Button>
		<Button
			type="filled"
			color="primary"
			icon="upload"
			loading={uploading}
			disabled={pendingUploadsCount === 0}
			onclick={() => void uploadQueuedFiles()}
		>
			Subir {pendingUploadsCount > 0 ? `(${pendingUploadsCount})` : ''}
		</Button>
	{/snippet}
</Dialog>

<style>
	.drive-uploader__file-upload :global(.lumi-file-upload__file-list) {
		max-height: var(--lumi-drive-uploader-queue-max-height);
		overflow-y: auto;
	}
</style>
