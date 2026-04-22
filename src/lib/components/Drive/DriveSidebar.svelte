<script lang="ts">
	import { Icon, List, ListItem, Progress, TagOption } from '$lib/components';
	import type { DriveTagOption } from '$lib/utils/drive';
	import { DRIVE_MENU_OPTIONS, TAG_OPTIONS, formatFileSize } from '$lib/utils/drive';

	interface StorageInfo {
		used: number;
		total: number;
		percentage: number;
	}

	interface MenuOption {
		name: string;
		value: string;
		icon: string;
	}

	interface Props {
		selectedMenu: MenuOption | null;
		selectedTag: DriveTagOption | null;
		storageInfo: StorageInfo;
		closable?: boolean;
		onmenuselect?: (menu: MenuOption | null) => void;
		ontagselect?: (tag: DriveTagOption) => void;
		onclose?: () => void;
	}

	const {
		selectedMenu,
		selectedTag,
		storageInfo,
		closable = false,
		onmenuselect,
		ontagselect,
		onclose
	}: Props = $props();

	const isMyDriveActive = $derived(!selectedMenu && !selectedTag);
</script>

{#if closable}
	<div class="drive-sidebar__header">
		<span class="lumi-text--sm lumi-font--bold">Drive</span>
		<button type="button" class="drive-sidebar__close" onclick={onclose} aria-label="Cerrar">
			<Icon icon="x" size="sm" />
		</button>
	</div>
{/if}

<div class="lumi-page-sidebar__section">
	<p class="lumi-page-sidebar__label">Navegación</p>
	<List size="sm" color="primary" class="drive-sidebar__nav">
		<ListItem
			title="Mi unidad"
			subtitle="Archivos y carpetas"
			icon="hardDrive"
			clickable
			active={isMyDriveActive}
			onclick={() => onmenuselect?.(null)}
		/>
		{#each DRIVE_MENU_OPTIONS.main as menu (menu.value)}
			<ListItem
				title={menu.name}
				subtitle={menu.value === 'recent' ? 'Actividad reciente' : 'Mayor tamaño'}
				icon={menu.icon}
				clickable
				active={selectedMenu?.value === menu.value}
				onclick={() => onmenuselect?.(menu)}
			/>
		{/each}
		{#each DRIVE_MENU_OPTIONS.trash as menu (menu.value)}
			<ListItem
				title={menu.name}
				subtitle="Eliminados temporalmente"
				icon={menu.icon}
				clickable
				active={selectedMenu?.value === menu.value}
				onclick={() => onmenuselect?.(menu)}
			/>
		{/each}
	</List>
</div>

<div class="lumi-page-sidebar__section">
	<p class="lumi-page-sidebar__label">Acceso rápido</p>
	<div class="drive-sidebar__meta">
		<div class="drive-sidebar__meta-item">
			<Icon icon="shieldCheck" size="sm" color="success" />
			<span class="lumi-text--xs">Permisos y seguridad por alcance</span>
		</div>
		<div class="drive-sidebar__meta-item">
			<Icon icon="star" size="sm" color="info" />
			<span class="lumi-text--xs">Vista optimizada para media</span>
		</div>
	</div>
</div>

<div class="lumi-page-sidebar__section">
	<p class="lumi-page-sidebar__label">Etiquetas</p>
	<div class="drive-sidebar__tags">
		{#each TAG_OPTIONS as tag (tag.hash)}
			<TagOption
				label={tag.name}
				color={tag.color}
				active={selectedTag?.hash === tag.hash}
				onclick={() => ontagselect?.(tag)}
			/>
		{/each}
	</div>
</div>

<div class="lumi-page-sidebar__section">
	<p class="lumi-page-sidebar__label">Almacenamiento</p>
	<Progress value={storageInfo.percentage} color="primary" />
	<div class="drive-sidebar__storage-meta">
		<span class="lumi-text--xs lumi-text--muted">{formatFileSize(storageInfo.used)} usado</span>
		<span class="lumi-text--xs lumi-text--muted">{storageInfo.percentage}%</span>
	</div>
</div>

<style>
	:global(.drive-sidebar__nav) {
		max-height: var(--lumi-drive-sidebar-nav-max-height);
	}

	.drive-sidebar__meta {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
		padding: var(--lumi-space-xs);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-lg);
		background: color-mix(in srgb, var(--lumi-color-surface) 75%, transparent);
	}

	.drive-sidebar__meta-item {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
	}

	.drive-sidebar__tags {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
	}

	.drive-sidebar__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.drive-sidebar__close {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--lumi-space-2xs);
		border: none;
		border-radius: var(--lumi-radius-full);
		background: transparent;
		color: var(--lumi-color-text-muted);
		cursor: pointer;
		transition: var(--lumi-transition-all);
	}

	.drive-sidebar__close:hover {
		background: var(--lumi-color-background-hover);
		color: var(--lumi-color-text);
	}

	.drive-sidebar__storage-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
</style>
