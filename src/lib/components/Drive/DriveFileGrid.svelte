<script lang="ts">
	import DriveFileCard from './DriveFileCard.svelte';
	import type { DriveFileItem } from './types';

	interface Props {
		files: DriveFileItem[];
		selectedFiles: string[];
		isTrash?: boolean;
		onfileclick?: (file: DriveFileItem) => void;
		onfiledblclick?: (file: DriveFileItem) => void;
		onfilecontextmenu?: (event: MouseEvent, file: DriveFileItem) => void;
		onfiledragstart?: (event: DragEvent, file: DriveFileItem) => void;
		onfiledragend?: () => void;
		onfiledrop?: (event: DragEvent, file: DriveFileItem) => void;
	}

	const {
		files,
		selectedFiles,
		isTrash = false,
		onfileclick,
		onfiledblclick,
		onfilecontextmenu,
		onfiledragstart,
		onfiledragend,
		onfiledrop
	}: Props = $props();

	const selectedFileSet = $derived(new Set(selectedFiles));
</script>

<div class="lumi-grid lumi-grid--gap-md drive-file-grid">
	{#each files as file (file.code)}
		<DriveFileCard
			{file}
			selected={selectedFileSet.has(file.code)}
			{isTrash}
			onclick={onfileclick}
			ondblclick={onfiledblclick}
			oncontextmenu={onfilecontextmenu}
			ondragstart={onfiledragstart}
			ondragend={onfiledragend}
			ondrop={onfiledrop}
		/>
	{/each}
</div>

<style>
	.drive-file-grid {
		grid-template-columns: repeat(auto-fill, minmax(var(--lumi-drive-file-grid-min-desktop), 1fr));
	}

	@media (max-width: 1024px) {
		.drive-file-grid {
			grid-template-columns: repeat(auto-fill, minmax(var(--lumi-drive-file-grid-min-tablet), 1fr));
		}
	}

	@media (max-width: 768px) {
		.drive-file-grid {
			grid-template-columns: repeat(auto-fill, minmax(var(--lumi-drive-file-grid-min-mobile), 1fr));
		}
	}

	@media (max-width: 480px) {
		.drive-file-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
