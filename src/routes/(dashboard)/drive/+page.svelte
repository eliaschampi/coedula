<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		Alert,
		Button,
		Card,
		Context,
		ContextItem,
		Dialog,
		DriveFileGrid,
		DriveFileList,
		DriveFilePreview,
		DriveFileUploader,
		DriveSidebar,
		EmptyState,
		Input,
		Loading,
		PageHeader,
		PageSidebar,
		Radio,
		SegmentedControl,
		Select,
		TagOption
	} from '$lib/components';
	import type { DriveFileItem, SelectOption } from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import {
		DRIVE_SCOPE_OPTIONS,
		TAG_OPTIONS,
		getDriveServeUrl,
		isValidDriveScope,
		type DriveBreadcrumb,
		type DriveScope,
		type DriveTagOption
	} from '$lib/utils/drive';

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

	interface FolderListResponse {
		files: DriveFileItem[];
	}

	interface DriveListResponse {
		files: DriveFileItem[];
	}

	interface DriveUsageResponse {
		used: number;
	}

	let files = $state<DriveFileItem[]>([]);
	let loading = $state(false);
	let errorMessage = $state('');
	let viewMode = $state<'grid' | 'list'>('grid');

	let currentScope = $state<DriveScope>('shared');
	let breadcrumbs = $state<DriveBreadcrumb[]>([{ label: 'Drive institucional', code: null }]);
	let currentParent = $state<string | null>(null);

	let selectedMenu = $state<MenuOption | null>(null);
	let selectedTag = $state<DriveTagOption | null>(null);
	let storageInfo = $state<StorageInfo>({
		used: 0,
		total: 1_073_741_824,
		percentage: 0
	});

	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;

	let showUploader = $state(false);
	let showPreview = $state(false);
	let showCreateDir = $state(false);
	let showRename = $state(false);
	let showTagDialog = $state(false);
	let showMoveDialog = $state(false);
	let showMobileSidebar = $state(false);

	let previewFile = $state<DriveFileItem | null>(null);
	let contextFile = $state<DriveFileItem | null>(null);

	let newDirName = $state('');
	let renameName = $state('');
	let moveScope = $state<DriveScope>('shared');
	let moveParentCode = $state<string | null>(null);
	let selectedTagHash = $state<string | null>(null);
	let folderOptions = $state<SelectOption[]>([]);

	let fetchId = 0;

	let fileContextMenu:
		| {
				open: (event: MouseEvent, data?: unknown) => void;
				close: () => void;
		  }
		| undefined = $state();

	const canCreate = $derived(can('drive:create'));
	const canUpdate = $derived(can('drive:update'));
	const canDelete = $derived(can('drive:delete'));
	const scopeOptions = $derived.by(() =>
		DRIVE_SCOPE_OPTIONS.map((scopeOption) => ({
			label: scopeOption.name,
			value: scopeOption.value
		}))
	);

	const viewModeOptions = $derived([
		{ label: 'Grid', value: 'grid', icon: 'grid' },
		{ label: 'Lista', value: 'list', icon: 'list' }
	]);

	const isTrashView = $derived(selectedMenu?.value === 'trash');
	const currentScopeLabel = $derived.by(() => {
		return DRIVE_SCOPE_OPTIONS.find((scopeOption) => scopeOption.value === currentScope)?.name;
	});

	const pageTitle = $derived.by(() => {
		if (selectedMenu?.value === 'trash') {
			return 'Papelera';
		}

		if (selectedMenu) {
			return selectedMenu.name;
		}

		if (selectedTag) {
			return selectedTag.name;
		}

		return breadcrumbs[breadcrumbs.length - 1]?.label ?? 'Drive';
	});

	const showBreadcrumbs = $derived(
		breadcrumbs.length > 1 && !selectedMenu && !selectedTag && !searchQuery.trim()
	);

	function getRootLabel(scope: DriveScope): string {
		if (scope === 'shared') {
			return 'Drive institucional';
		}

		if (scope === 'user_private') {
			return 'Mi espacio';
		}

		return 'Drive';
	}

	function getRootOptionLabel(scope: DriveScope): string {
		const rootLabel = getRootLabel(scope);
		return `Raíz (${rootLabel})`;
	}

	function resetNavigationState(scope = currentScope): void {
		selectedMenu = null;
		selectedTag = null;
		searchQuery = '';
		currentParent = null;
		breadcrumbs = [{ label: getRootLabel(scope), code: null }];
	}

	onMount(async () => {
		await fetchFiles();
		await fetchStorageUsage();
		await fetchFolderOptions();
	});

	onDestroy(() => {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
	});

	async function fetchFiles() {
		const requestId = ++fetchId;
		loading = true;
		errorMessage = '';

		try {
			const queryParts = [`scope=${encodeURIComponent(currentScope)}`];

			if (selectedMenu?.value === 'trash') {
				queryParts.push('trashed=true');
			} else if (selectedMenu?.value === 'recent' || selectedMenu?.value === 'heavy') {
				queryParts.push(`view=${encodeURIComponent(selectedMenu.value)}`);
			} else if (selectedTag) {
				queryParts.push(`tag=${encodeURIComponent(selectedTag.hash)}`);
			} else if (searchQuery.trim()) {
				queryParts.push(`search=${encodeURIComponent(searchQuery.trim())}`);
			} else if (currentParent) {
				queryParts.push(`parent=${encodeURIComponent(currentParent)}`);
			}

			const response = await fetch(`/api/drive?${queryParts.join('&')}`);
			if (requestId !== fetchId) {
				return;
			}

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'No se pudieron cargar los archivos');
			}

			const payload = (await response.json()) as DriveListResponse;
			files = payload.files ?? [];
		} catch (caught) {
			if (requestId === fetchId) {
				errorMessage = caught instanceof Error ? caught.message : 'Error al cargar archivos';
			}
		} finally {
			if (requestId === fetchId) {
				loading = false;
			}
		}
	}

	async function fetchStorageUsage() {
		try {
			const params = new SvelteURLSearchParams({ scope: currentScope });

			const response = await fetch(`/api/drive/trash?${params.toString()}`);
			if (!response.ok) {
				return;
			}

			const payload = (await response.json()) as DriveUsageResponse;
			const used = Number(payload.used ?? 0);
			storageInfo = {
				used,
				total: storageInfo.total,
				percentage: Math.min(100, Math.round((used / storageInfo.total) * 100))
			};
		} catch {
			// Non-critical metric fetch.
		}
	}

	async function fetchFolderOptions(
		excludeCode: string | null = null,
		scope: DriveScope = currentScope
	) {
		try {
			const params = new SvelteURLSearchParams({
				scope,
				folders: 'true'
			});

			if (excludeCode) {
				params.set('exclude', excludeCode);
			}

			const response = await fetch(`/api/drive?${params.toString()}`);
			if (!response.ok) {
				return;
			}

			const payload = (await response.json()) as FolderListResponse;
			folderOptions = [
				{ label: getRootOptionLabel(scope), value: 'root' },
				...(payload.files ?? []).map((folder) => ({
					label: folder.name,
					value: folder.code
				}))
			];
		} catch {
			folderOptions = [{ label: getRootOptionLabel(scope), value: 'root' }];
		}
	}

	async function handleScopeChange(value: unknown) {
		const scopeValue = typeof value === 'string' && isValidDriveScope(value) ? value : null;
		if (!scopeValue || scopeValue === currentScope) {
			return;
		}

		currentScope = scopeValue;

		resetNavigationState(scopeValue);
		await fetchFiles();
		await fetchStorageUsage();
		await fetchFolderOptions();
	}

	async function createDirectory() {
		if (!newDirName.trim()) {
			return;
		}

		try {
			const response = await fetch('/api/drive', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newDirName.trim(),
					scope: currentScope,
					parent_code: currentParent
				})
			});

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'Error al crear carpeta');
			}

			showCreateDir = false;
			newDirName = '';
			showToast('Carpeta creada exitosamente', 'success');
			await fetchFiles();
			await fetchFolderOptions();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al crear carpeta';
		}
	}

	async function handleUpload(file: File) {
		const formData = new FormData();
		formData.append('file', file);
		formData.append('scope', currentScope);
		if (currentParent) {
			formData.append('parent_code', currentParent);
		}

		const response = await fetch('/api/drive/upload', {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			const payload = await response.json();
			throw new Error(payload?.message || 'Error al subir archivo');
		}

		showToast('Archivo subido exitosamente', 'success');
		await fetchFiles();
		await fetchStorageUsage();
	}

	async function renameFile() {
		if (!contextFile || !renameName.trim()) {
			return;
		}

		try {
			const response = await fetch(`/api/drive/${contextFile.code}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: renameName.trim() })
			});

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'Error al renombrar archivo');
			}

			showRename = false;
			renameName = '';
			contextFile = null;
			showToast('Nombre actualizado', 'success');
			await fetchFiles();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al renombrar archivo';
		}
	}

	async function setFilesTrashedState(fileCodes: string[], isTrashed: boolean): Promise<void> {
		if (fileCodes.length === 0) {
			return;
		}

		const responses = await Promise.all(
			fileCodes.map((fileCode) =>
				fetch(`/api/drive/${fileCode}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ deleted_at: isTrashed })
				})
			)
		);

		const failedResponse = responses.find((response) => !response.ok);
		if (!failedResponse) {
			return;
		}

		let defaultMessage = isTrashed
			? 'No se pudieron mover algunos archivos a papelera'
			: 'No se pudieron restaurar algunos archivos';

		try {
			const payload = await failedResponse.json();
			if (typeof payload?.message === 'string' && payload.message.trim()) {
				defaultMessage = payload.message;
			}
		} catch {
			// Keep fallback message.
		}

		throw new Error(defaultMessage);
	}

	async function trashFile(file: DriveFileItem) {
		try {
			await setFilesTrashedState([file.code], true);
			showToast('Archivo movido a papelera', 'warning');
			await fetchFiles();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al mover a papelera';
		}
	}

	async function restoreFile(file: DriveFileItem) {
		try {
			await setFilesTrashedState([file.code], false);
			showToast('Archivo restaurado', 'success');
			await fetchFiles();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al restaurar archivo';
		}
	}

	async function deleteFile(file: DriveFileItem) {
		try {
			const response = await fetch(`/api/drive/${file.code}`, { method: 'DELETE' });

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'Error al eliminar archivo');
			}

			showToast('Archivo eliminado permanentemente', 'success');
			await fetchFiles();
			await fetchStorageUsage();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al eliminar archivo';
		}
	}

	async function emptyTrash() {
		try {
			const params = new SvelteURLSearchParams({ scope: currentScope });

			const response = await fetch(`/api/drive/trash?${params.toString()}`, { method: 'DELETE' });

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'Error al vaciar la papelera');
			}

			showToast('Papelera vaciada', 'success');
			await fetchFiles();
			await fetchStorageUsage();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al vaciar la papelera';
		}
	}

	async function moveFile(
		fileCode: string,
		targetParentCode: string | null,
		targetScope: DriveScope = currentScope
	): Promise<boolean> {
		try {
			const response = await fetch(`/api/drive/${fileCode}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ parent_code: targetParentCode, scope: targetScope })
			});

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'Error al mover archivo');
			}

			showToast('Archivo movido', 'success');
			await fetchFiles();
			await fetchFolderOptions();
			return true;
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al mover archivo';
			return false;
		}
	}

	function navigateToFolder(file: DriveFileItem) {
		if (file.type !== 'dir') {
			return;
		}

		currentParent = file.code;
		breadcrumbs = [...breadcrumbs, { label: file.name, code: file.code }];
		selectedMenu = null;
		selectedTag = null;
		searchQuery = '';
		void fetchFiles();
	}

	function navigateBreadcrumb(index: number) {
		const target = breadcrumbs[index];
		if (!target) {
			return;
		}

		currentParent = target.code;
		breadcrumbs = breadcrumbs.slice(0, index + 1);
		selectedMenu = null;
		selectedTag = null;
		void fetchFiles();
	}

	function handleMenuSelect(menu: MenuOption | null) {
		selectedMenu = menu;
		selectedTag = null;
		searchQuery = '';

		if (!menu) {
			currentParent = null;
			breadcrumbs = [{ label: getRootLabel(currentScope), code: null }];
		}

		void fetchFiles();
	}

	function handleTagSelect(tag: DriveTagOption) {
		selectedTag = selectedTag?.hash === tag.hash ? null : tag;
		selectedMenu = null;
		searchQuery = '';
		void fetchFiles();
	}

	function handleFileDblClick(file: DriveFileItem) {
		if (file.type === 'dir') {
			navigateToFolder(file);
			return;
		}

		previewFile = file;
		showPreview = true;
	}

	function handleContextMenu(event: MouseEvent, file: DriveFileItem) {
		contextFile = file;
		fileContextMenu?.open(event, file);
	}

	function handleDrop(event: DragEvent, targetDir: DriveFileItem) {
		const payload = event.dataTransfer?.getData('application/json');
		if (!payload) {
			return;
		}

		try {
			const draggedFile = JSON.parse(payload) as DriveFileItem;
			if (draggedFile.code === targetDir.code) {
				return;
			}

			void moveFile(draggedFile.code, targetDir.code);
		} catch {
			// Ignore malformed DnD payload.
		}
	}

	function openRenameDialog(file: DriveFileItem) {
		contextFile = file;
		renameName = file.name;
		showRename = true;
		fileContextMenu?.close();
	}

	async function openMoveDialog(file: DriveFileItem) {
		contextFile = file;
		moveScope = file.scope;
		moveParentCode = file.parent_code;
		await fetchFolderOptions(file.type === 'dir' ? file.code : null, moveScope);

		if (moveParentCode && !folderOptions.some((folder) => folder.value === moveParentCode)) {
			moveParentCode = 'root';
		}

		showMoveDialog = true;
		fileContextMenu?.close();
	}

	function openTagDialog(file: DriveFileItem) {
		contextFile = file;
		selectedTagHash = file.tag;
		showTagDialog = true;
		fileContextMenu?.close();
	}

	async function updateFileTag() {
		if (!contextFile) {
			return;
		}

		try {
			const response = await fetch(`/api/drive/${contextFile.code}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tag: selectedTagHash })
			});

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'No se pudo actualizar la etiqueta');
			}

			showTagDialog = false;
			showToast('Etiqueta actualizada', 'success');
			await fetchFiles();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al actualizar la etiqueta';
		}
	}

	async function applyMove() {
		if (!contextFile) {
			return;
		}

		const targetCode = moveParentCode === 'root' ? null : moveParentCode;
		const moved = await moveFile(contextFile.code, targetCode, moveScope);
		if (moved) {
			showMoveDialog = false;
			contextFile = null;
		}
	}

	async function handleMoveScopeChange(value: unknown) {
		if (typeof value !== 'string' || !isValidDriveScope(value)) {
			return;
		}

		if (value === moveScope) {
			return;
		}

		moveScope = value;
		moveParentCode = 'root';
		await fetchFolderOptions(contextFile?.type === 'dir' ? contextFile.code : null, value);
	}

	function handleDownload(file: DriveFileItem) {
		window.open(getDriveServeUrl(file.code, { download: true }), '_blank', 'noopener,noreferrer');
	}

	function handleSearchChange(value: string) {
		searchQuery = value;

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchTimeout = setTimeout(() => {
			if (searchQuery.trim()) {
				selectedMenu = null;
				selectedTag = null;
			}
			void fetchFiles();
		}, 350);
	}
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader
		title={pageTitle}
		subtitle={`Alcance actual: ${currentScopeLabel ?? 'Drive'}`}
		icon="hardDrive"
	>
		{#snippet actions()}
			<div
				class="lumi-flex lumi-flex--gap-sm lumi-align-items--center lumi-page-sidebar__header-actions"
			>
				<Button
					type="ghost"
					size="sm"
					icon="slidersHorizontal"
					class="lumi-page-sidebar__mobile-trigger"
					onclick={() => (showMobileSidebar = true)}
					aria-label="Abrir navegación"
				/>
				{#if !isTrashView}
					{#if canCreate}
						<Button
							type="border"
							size="sm"
							icon="folderPlus"
							onclick={() => (showCreateDir = true)}
						>
							Carpeta
						</Button>
						<Button
							type="filled"
							color="primary"
							size="sm"
							icon="upload"
							onclick={() => (showUploader = true)}
						>
							Subir
						</Button>
					{/if}
				{:else if canDelete && files.length > 0}
					<Button type="filled" color="danger" size="sm" icon="trash" onclick={emptyTrash}>
						Vaciar papelera
					</Button>
				{/if}
			</div>
		{/snippet}
	</PageHeader>

	<div class="lumi-layout--two-columns lumi-page-sidebar-layout drive-page__layout">
		<PageSidebar
			bind:mobileOpen={showMobileSidebar}
			variant="drive"
			mobileAriaLabel="Cerrar navegación"
			hideMobileHeader
		>
			{#snippet sidebar()}
				<DriveSidebar
					{selectedMenu}
					{selectedTag}
					{storageInfo}
					onmenuselect={handleMenuSelect}
					ontagselect={handleTagSelect}
				/>
			{/snippet}
			{#snippet drawer()}
				<DriveSidebar
					{selectedMenu}
					{selectedTag}
					{storageInfo}
					closable
					onmenuselect={(menu) => {
						handleMenuSelect(menu);
						showMobileSidebar = false;
					}}
					ontagselect={(tag) => {
						handleTagSelect(tag);
						showMobileSidebar = false;
					}}
					onclose={() => (showMobileSidebar = false)}
				/>
			{/snippet}
		</PageSidebar>

		<section class="lumi-layout--content-right">
			<div class="lumi-stack lumi-stack--sm">
				<div class="drive-page__toolbar-shell">
					<Card spaced>
						<div class="lumi-flex lumi-flex--gap-sm lumi-align-items--center drive-page__toolbar">
							<div class="drive-page__view-toggle">
								<SegmentedControl
									value={viewMode}
									options={viewModeOptions}
									fullWidth
									onchange={(value) => {
										if (value === 'grid' || value === 'list') {
											viewMode = value;
										}
									}}
									aria-label="Vista de archivos"
								/>
							</div>
							<div class="drive-page__scope-control">
								<Select
									placeholder="Alcance"
									aria-label="Seleccionar alcance"
									value={currentScope}
									options={scopeOptions}
									clearable={false}
									onchange={handleScopeChange}
								/>
							</div>
							<div class="lumi-flex-item--grow drive-page__search-control">
								<Input
									placeholder="Buscar archivos..."
									icon="search"
									value={searchQuery}
									oninput={(event) =>
										handleSearchChange(
											(event.currentTarget as HTMLInputElement | null)?.value ?? ''
										)}
								/>
							</div>
						</div>
					</Card>
				</div>

				<div class="drive-page__content-shell">
					{#if showBreadcrumbs}
						<nav class="lumi-flex lumi-flex--gap-xs lumi-align-items--center lumi-flex--wrap">
							{#each breadcrumbs as crumb, index (crumb.code ?? `root-${index}`)}
								{#if index > 0}
									<span class="lumi-text--muted">/</span>
								{/if}
								{#if index === breadcrumbs.length - 1}
									<span class="lumi-font--medium">{crumb.label}</span>
								{:else}
									<Button type="flat" size="sm" onclick={() => navigateBreadcrumb(index)}>
										{crumb.label}
									</Button>
								{/if}
							{/each}
						</nav>
					{/if}

					{#if errorMessage}
						<Alert type="danger" closable onclose={() => (errorMessage = '')}>{errorMessage}</Alert>
					{/if}

					<div class="drive-page__content">
						{#if loading}
							<div class="drive-page__loading">
								<Loading size="lg" color="primary" />
								<span class="lumi-text--sm lumi-text--muted">Cargando archivos...</span>
							</div>
						{:else if files.length === 0}
							<EmptyState
								title={isTrashView
									? 'La papelera está vacía'
									: searchQuery
										? 'Sin resultados'
										: 'Carpeta vacía'}
								description={isTrashView
									? 'Los archivos eliminados aparecerán aquí.'
									: searchQuery
										? 'Intenta otro término de búsqueda.'
										: 'Sube archivos o crea carpetas para comenzar.'}
								icon={isTrashView ? 'trash' : 'hardDrive'}
								iconColor="muted"
							>
								{#snippet actions()}
									{#if !isTrashView && canCreate}
										<Button
											type="filled"
											color="primary"
											icon="upload"
											size="sm"
											onclick={() => (showUploader = true)}
										>
											Subir archivos
										</Button>
									{/if}
								{/snippet}
							</EmptyState>
						{:else if viewMode === 'grid'}
							<DriveFileGrid
								{files}
								selectedFiles={[]}
								isTrash={isTrashView}
								onfiledblclick={handleFileDblClick}
								onfilecontextmenu={handleContextMenu}
								onfiledrop={handleDrop}
							/>
						{:else}
							<DriveFileList
								{files}
								selectedFiles={[]}
								isTrash={isTrashView}
								onfiledblclick={handleFileDblClick}
								onfilecontextmenu={handleContextMenu}
								onfiledrop={handleDrop}
							/>
						{/if}
					</div>
				</div>
			</div>
		</section>
	</div>
</div>

<Dialog bind:open={showCreateDir} title="Nueva carpeta" size="sm">
	<div class="lumi-stack lumi-stack--md">
		<Input
			bind:value={newDirName}
			name="dir-name"
			label="Nombre de la carpeta"
			placeholder="Ingrese el nombre"
			required
		/>
	</div>
	{#snippet footer()}
		<Button
			type="border"
			onclick={() => {
				showCreateDir = false;
				newDirName = '';
			}}
		>
			Cancelar
		</Button>
		<Button type="filled" color="primary" onclick={createDirectory} disabled={!newDirName.trim()}>
			Crear
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showRename} title="Renombrar archivo" size="sm">
	<div class="lumi-stack lumi-stack--md">
		<Input
			bind:value={renameName}
			name="rename"
			label="Nuevo nombre"
			placeholder="Ingrese el nombre"
			required
		/>
	</div>
	{#snippet footer()}
		<Button
			type="border"
			onclick={() => {
				showRename = false;
				renameName = '';
			}}
		>
			Cancelar
		</Button>
		<Button type="filled" color="primary" onclick={renameFile} disabled={!renameName.trim()}>
			Renombrar
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showMoveDialog} title="Mover archivo" size="sm">
	<div class="lumi-stack lumi-stack--md">
		<div class="lumi-stack lumi-stack--xs">
			<span class="lumi-text--sm lumi-font--medium">Espacio destino</span>
			<div class="drive-page__move-scope-options">
				{#each DRIVE_SCOPE_OPTIONS as scopeOption (scopeOption.value)}
					<div class="drive-page__move-scope-option">
						<Radio
							name="move-scope"
							group={moveScope}
							value={scopeOption.value}
							label={scopeOption.name}
							onchange={(value) => void handleMoveScopeChange(value)}
						/>
						<span class="drive-page__move-scope-option-description">
							{scopeOption.description}
						</span>
					</div>
				{/each}
			</div>
		</div>
		<Select
			label="Carpeta destino"
			value={moveParentCode ?? 'root'}
			options={folderOptions}
			clearable={false}
			onchange={(value) => {
				moveParentCode = typeof value === 'string' ? value : null;
			}}
		/>
	</div>
	{#snippet footer()}
		<Button
			type="border"
			onclick={() => {
				showMoveDialog = false;
				moveScope = currentScope;
				moveParentCode = null;
				contextFile = null;
			}}
		>
			Cancelar
		</Button>
		<Button type="filled" color="primary" onclick={applyMove}>Mover</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showTagDialog} title="Etiquetas" size="sm">
	<div class="lumi-stack lumi-stack--sm">
		<button
			type="button"
			class="drive-page__tag-none"
			class:drive-page__tag-none--active={selectedTagHash === null}
			onclick={() => (selectedTagHash = null)}
		>
			<span class="drive-page__tag-none-dot"></span>
			<span>Sin etiqueta</span>
		</button>

		{#each TAG_OPTIONS as tag (tag.hash)}
			<TagOption
				label={tag.name}
				color={tag.color}
				active={selectedTagHash === tag.hash}
				onclick={() => (selectedTagHash = tag.hash)}
			/>
		{/each}
	</div>
	{#snippet footer()}
		<Button
			type="border"
			onclick={() => {
				showTagDialog = false;
				selectedTagHash = null;
			}}
		>
			Cancelar
		</Button>
		<Button type="filled" color="primary" onclick={updateFileTag}>Guardar etiqueta</Button>
	{/snippet}
</Dialog>

<DriveFileUploader bind:open={showUploader} onupload={handleUpload} />
<DriveFilePreview bind:open={showPreview} file={previewFile} ondownload={handleDownload} />

<Context bind:this={fileContextMenu} aria-label="Opciones de archivo">
	{#snippet children({ data })}
		{@const menuFile = (data as DriveFileItem | null) ?? contextFile}
		{#if menuFile}
			{#if !isTrashView}
				{#if menuFile.type === 'dir'}
					<ContextItem
						title="Abrir"
						icon="folder"
						onclick={() => {
							navigateToFolder(menuFile);
							fileContextMenu?.close();
						}}
					/>
				{:else}
					<ContextItem
						title="Vista previa"
						icon="eye"
						onclick={() => {
							previewFile = menuFile;
							showPreview = true;
							fileContextMenu?.close();
						}}
					/>
					<ContextItem
						title="Descargar"
						icon="download"
						onclick={() => {
							handleDownload(menuFile);
							fileContextMenu?.close();
						}}
					/>
				{/if}

				{#if canUpdate}
					<ContextItem title="Renombrar" icon="edit" onclick={() => openRenameDialog(menuFile)} />
					<ContextItem title="Etiquetar" icon="tag" onclick={() => openTagDialog(menuFile)} />
					<ContextItem
						title="Mover"
						icon="arrowRight"
						onclick={() => void openMoveDialog(menuFile)}
					/>
				{/if}

				{#if canDelete}
					<ContextItem
						title="Mover a papelera"
						icon="trash"
						color="danger"
						onclick={() => {
							void trashFile(menuFile);
							fileContextMenu?.close();
						}}
					/>
				{/if}
			{:else if canDelete}
				<ContextItem
					title="Restaurar"
					icon="refresh"
					onclick={() => {
						void restoreFile(menuFile);
						fileContextMenu?.close();
					}}
				/>
				<ContextItem
					title="Eliminar permanente"
					icon="trash"
					color="danger"
					onclick={() => {
						void deleteFile(menuFile);
						fileContextMenu?.close();
					}}
				/>
			{/if}
		{/if}
	{/snippet}
</Context>

<style>
	.drive-page__layout {
		align-items: stretch;
	}

	.drive-page__scope-control {
		min-width: var(--lumi-drive-scope-control-min-width);
		flex: 0 1 var(--lumi-drive-scope-control-basis);
	}

	.drive-page__view-toggle {
		flex-shrink: 0;
	}

	.drive-page__search-control {
		min-width: var(--lumi-drive-search-control-min-width);
	}

	.drive-page__toolbar-shell :global(.lumi-card) {
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		background: color-mix(in srgb, var(--lumi-color-surface) 92%, transparent);
		backdrop-filter: blur(var(--lumi-blur-sm));
	}

	.drive-page__toolbar {
		align-items: center;
		flex-wrap: wrap;
	}

	.drive-page__content {
		min-height: var(--lumi-drive-content-min-height);
	}

	.drive-page__content-shell {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-sm);
		background: transparent;
	}

	.drive-page__loading {
		min-height: var(--lumi-drive-loading-min-height);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-md);
	}

	.drive-page__move-scope-options {
		display: grid;
		gap: var(--lumi-space-sm);
	}

	.drive-page__move-scope-options :global(.lumi-radio) {
		width: 100%;
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-lg);
		background: var(--lumi-color-surface);
		transition: var(--lumi-transition-all);
	}

	.drive-page__move-scope-options :global(.lumi-radio:not(.lumi-radio--disabled):hover) {
		border-color: var(--lumi-color-primary);
		background: color-mix(in srgb, var(--lumi-color-primary) 4%, var(--lumi-color-surface));
	}

	.drive-page__move-scope-options :global(.lumi-radio--checked) {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 32%, var(--lumi-color-border));
		background: color-mix(in srgb, var(--lumi-color-primary) 8%, var(--lumi-color-surface));
	}

	.drive-page__move-scope-option {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
	}

	.drive-page__move-scope-option-description {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
		padding-left: calc(var(--lumi-icon-md) + var(--lumi-space-sm));
	}

	.drive-page__tag-none {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		width: 100%;
		padding: var(--lumi-space-xs) var(--lumi-space-md);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-lg);
		background: var(--lumi-color-surface);
		color: var(--lumi-color-text);
		cursor: pointer;
		text-align: left;
		transition: var(--lumi-transition-all);
	}

	.drive-page__tag-none:hover {
		border-color: var(--lumi-color-primary);
		background: color-mix(in srgb, var(--lumi-color-primary) 4%, var(--lumi-color-surface));
	}

	.drive-page__tag-none--active {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 28%, var(--lumi-color-border));
		background: color-mix(in srgb, var(--lumi-color-primary) 8%, var(--lumi-color-surface));
	}

	.drive-page__tag-none-dot {
		width: var(--lumi-drive-selection-dot-size);
		height: var(--lumi-drive-selection-dot-size);
		border-radius: var(--lumi-radius-full);
		background: var(--lumi-color-border);
	}

	@media (max-width: 1024px) {
		.drive-page__scope-control {
			width: 100%;
			flex: 1 1 100%;
		}

		.drive-page__view-toggle {
			width: 100%;
		}

		.drive-page__search-control {
			min-width: 100%;
			flex-basis: 100%;
		}

		.drive-page__toolbar {
			align-items: center;
		}
	}
</style>
