<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Card from '$lib/components/Card/Card.svelte';
	import Button from '$lib/components/Button/Button.svelte';
	import { PageHeader, UserInfo, AvatarPicker } from '$lib/components';
	import Chip from '$lib/components/Chip/Chip.svelte';
	import Dialog from '$lib/components/Dialog/Dialog.svelte';
	import Input from '$lib/components/Input/Input.svelte';
	import Alert from '$lib/components/Alert/Alert.svelte';
	import Fieldset from '$lib/components/Fieldset/Fieldset.svelte';
	import Dropdown from '$lib/components/Dropdown/Dropdown.svelte';
	import DropdownItem from '$lib/components/Dropdown/DropdownItem.svelte';
	import Icon from '$lib/components/Icon/Icon.svelte';
	import PermissionsModal from '$lib/components/PermissionsModal';
	import { hasSuperUserAccess } from '$lib/permissions/super-user';
	import { showToast } from '$lib/stores/Toast';
	import { can } from '$lib/stores/permissions';
	import { formatDate } from '$lib/utils';
	import type { PageData } from './$types';
	import type { AvatarOption } from '$lib/components/AvatarPicker/types';

	const { data }: { data: PageData } = $props();

	type UserRow = PageData['users'][number];

	// Permissions
	const canCreate = $derived(can('users:create'));
	const canCreateWithBranch = $derived(!!data.canCreateWithBranch);
	const canUpdate = $derived(can('users:update'));
	const canDelete = $derived(can('users:delete'));
	const canManagePermissions = $derived(can('users:manage_permissions'));

	// State
	let showModal = $state(false);
	let showDeleteModal = $state(false);
	let showPasswordModal = $state(false);
	let showPermissionsModal = $state(false);
	let isEditing = $state(false);
	let errorMessage = $state('');
	let passwordMessage = $state('');
	let selectedUser = $state<UserRow | null>(null);
	let selectedAvatar = $state('avatar.svg');

	// Form fields
	let formName = $state('');
	let formLastName = $state('');
	let formEmail = $state('');
	let formPassword = $state('');

	// Available avatars
	const avatars: AvatarOption[] = [
		{ src: 'avatar.svg', value: 'avatar.svg', label: 'Default' },
		{ src: 'woman1.svg', value: 'woman1.svg', label: 'Woman 1' },
		{ src: 'woman2.svg', value: 'woman2.svg', label: 'Woman 2' },
		{ src: 'man1.svg', value: 'man1.svg', label: 'Man 1' },
		{ src: 'man2.svg', value: 'man2.svg', label: 'Man 2' }
	];

	const mySelf = (userId: string) => {
		return userId === page.data.user?.code;
	};

	const selectedPermissionsUser = $derived(() => {
		if (!selectedUser) return null;
		return {
			code: selectedUser.code,
			email: selectedUser.email,
			name: selectedUser.name ?? '',
			last_name: selectedUser.last_name ?? ''
		};
	});

	function getActionError(result: { data?: Record<string, unknown> }): string | null {
		const error = result.data?.error;
		return typeof error === 'string' && error.length > 0 ? error : null;
	}

	function submitForm(formId: string): void {
		const form = document.getElementById(formId);
		if (form instanceof HTMLFormElement) {
			form.requestSubmit();
		}
	}

	function openCreateModal() {
		if (!canCreate || !canCreateWithBranch) return;
		isEditing = false;
		formName = '';
		formLastName = '';
		formEmail = '';
		formPassword = '';
		selectedAvatar = 'avatar.svg';
		errorMessage = '';
		showModal = true;
	}

	function openEditModal(user: UserRow) {
		if (!canUpdate) return;
		isEditing = true;
		selectedUser = user;
		formName = user.name || '';
		formLastName = user.last_name || '';
		formEmail = user.email;
		formPassword = '';
		selectedAvatar = user.photo_url || 'avatar.svg';
		errorMessage = '';
		showModal = true;
	}

	function openDeleteModal(user: UserRow) {
		if (!canDelete) return;
		selectedUser = user;
		showDeleteModal = true;
	}

	function openPasswordModal(user: UserRow) {
		selectedUser = user;
		passwordMessage = '';
		showPasswordModal = true;
	}

	function openPermissionsModal(user: UserRow) {
		if (!canManagePermissions) return;
		selectedUser = user;
		showPermissionsModal = true;
	}

	function closeModal() {
		showModal = false;
		errorMessage = '';
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		selectedUser = null;
	}

	function closePasswordModal() {
		showPasswordModal = false;
		selectedUser = null;
		passwordMessage = '';
	}
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader title="Usuarios" subtitle="Gestiona los usuarios del sistema" icon="users">
		{#snippet actions()}
			<Button
				type="filled"
				color="primary"
				icon="plus"
				onclick={openCreateModal}
				disabled={!canCreate || !canCreateWithBranch}
				aria-label={!canCreateWithBranch && canCreate
					? 'Crea y activa al menos una sede antes de registrar usuarios'
					: 'Nuevo usuario'}
			>
				Nuevo Usuario
			</Button>
		{/snippet}
	</PageHeader>

	<div class="lumi-grid lumi-grid--dashboard-cards lumi-grid--gap-md">
		{#each data.users as user (user.code)}
			<Card image="wall.png" imageAlt={user.name || 'Usuario'} imageHeight={150}>
				<div class="lumi-flex lumi-flex--column lumi-flex--gap-sm">
					<UserInfo
						name={user.name || ''}
						lastName={user.last_name || ''}
						description={user.email}
						photoUrl={user.photo_url || ''}
					>
						{#snippet actions()}
							<Dropdown position="bottom-end">
								{#snippet triggerContent()}
									<Button type="ghost" size="sm" icon="moreVertical" />
								{/snippet}

								{#snippet content()}
									{#if canManagePermissions}
										<DropdownItem icon="shield" onclick={() => openPermissionsModal(user)}>
											Gestionar Permisos
										</DropdownItem>
									{/if}
									{#if mySelf(user.code) || canUpdate}
										<DropdownItem icon="edit" onclick={() => openEditModal(user)}>
											Editar Información
										</DropdownItem>
										<DropdownItem icon="key" onclick={() => openPasswordModal(user)}>
											Cambiar Contraseña
										</DropdownItem>
									{/if}
									{#if canDelete && !mySelf(user.code)}
										<DropdownItem icon="trash" color="danger" onclick={() => openDeleteModal(user)}>
											Eliminar
										</DropdownItem>
									{/if}
								{/snippet}
							</Dropdown>
						{/snippet}
					</UserInfo>

					<!-- Stats -->
					<div class="lumi-flex lumi-flex--column lumi-flex--gap-xs lumi-width--full">
						<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
							<div
								class="lumi-flex lumi-align-items--center lumi-flex--gap-xs lumi-text--xs lumi-text--muted"
							>
								<Icon icon="calendar" size="12px" />
								<b>Registrado:</b> <span>{formatDate(user.created_at)}</span>
							</div>
							<div
								class="lumi-flex lumi-align-items--center lumi-flex--gap-xs lumi-text--xs lumi-text--muted"
							>
								<Icon icon="clock" size="12px" />
								<b>Último Login:</b>
								<span>{user.last_login ? formatDate(user.last_login) : 'Nunca'}</span>
							</div>
						</div>
					</div>
				</div>
				{#snippet footer()}
					<!-- Role Badge -->
					{#if hasSuperUserAccess(user)}
						<Chip color="danger" size="sm">Admin</Chip>
					{:else}
						<Chip color="primary" size="sm">Usuario</Chip>
					{/if}
				{/snippet}
			</Card>
		{/each}
	</div>
</div>

<!-- Create/Edit Modal -->
<Dialog bind:open={showModal} title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'} size="md">
	<form
		id="user-form"
		method="POST"
		action="?/{isEditing ? 'update' : 'create'}"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast(
						isEditing ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente',
						'success'
					);
					await invalidate('users:load');
					closeModal();
				} else if (result.type === 'failure') {
					errorMessage = getActionError(result) ?? 'Ocurrió un error';
				}
			};
		}}
	>
		{#if isEditing && selectedUser}
			<input type="hidden" name="user_id" value={selectedUser.code} />
		{/if}

		<input type="hidden" name="photo_url" value={selectedAvatar} />

		{#if errorMessage}
			<Alert type="danger" closable onclose={() => (errorMessage = '')}>
				{errorMessage}
			</Alert>
		{/if}

		<div class="lumi-stack lumi-stack--md">
			<Input
				bind:value={formName}
				name="name"
				label="Nombre"
				placeholder="Ingrese el nombre"
				required
			/>

			<Input
				bind:value={formLastName}
				name="last_name"
				label="Apellidos"
				placeholder="Ingrese los apellidos"
				required
			/>

			<Input
				bind:value={formEmail}
				name="email"
				type="email"
				label="Correo electrónico"
				placeholder="correo@ejemplo.com"
				required
			/>

			{#if !isEditing}
				<Input
					bind:value={formPassword}
					name="password"
					type="password"
					label="Contraseña"
					placeholder="Mínimo 8 caracteres"
					required
				/>
			{/if}

			<!-- Avatar Selection -->
			<Fieldset legend="Avatar">
				<AvatarPicker options={avatars} bind:value={selectedAvatar} />
			</Fieldset>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeModal}>Cancelar</Button>
		<Button type="filled" color="primary" onclick={() => submitForm('user-form')}>
			{isEditing ? 'Actualizar' : 'Crear'}
		</Button>
	{/snippet}
</Dialog>

<!-- Delete Confirmation Modal -->
<Dialog bind:open={showDeleteModal} title="Confirmar eliminación" size="sm">
	<form
		id="delete-user-form"
		method="POST"
		action="?/delete"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Usuario eliminado exitosamente', 'success');
					await invalidate('users:load');
					closeDeleteModal();
				} else if (result.type === 'failure') {
					showToast(getActionError(result) ?? 'Error al eliminar', 'error');
				}
			};
		}}
	>
		{#if selectedUser}
			<input type="hidden" name="user_id" value={selectedUser.code} />
			<p class="lumi-margin--none">
				¿Estás seguro de que deseas eliminar a <strong
					>{selectedUser.name}
					{selectedUser.last_name}</strong
				>? Esta acción no se puede deshacer.
			</p>
		{/if}
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeDeleteModal}>Cancelar</Button>
		<Button type="filled" color="danger" onclick={() => submitForm('delete-user-form')}>
			Eliminar
		</Button>
	{/snippet}
</Dialog>

<!-- Change Password Modal -->
<Dialog bind:open={showPasswordModal} title="Cambiar contraseña" size="sm">
	<form
		id="password-form"
		method="POST"
		action="?/updatePassword"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Contraseña actualizada exitosamente', 'success');
					closePasswordModal();
				} else if (result.type === 'failure') {
					passwordMessage = getActionError(result) ?? 'Error al actualizar la contraseña';
				}
			};
		}}
	>
		{#if selectedUser}
			<input type="hidden" name="user_id" value={selectedUser.code} />
			<p class="lumi-text--sm lumi-text--muted lumi-margin-bottom--md">
				Establece una nueva contraseña para {selectedUser.name}
				{selectedUser.last_name}
			</p>
		{/if}

		<div class="lumi-stack lumi-stack--md">
			{#if passwordMessage}
				<Alert type="danger" closable onclose={() => (passwordMessage = '')}>
					{passwordMessage}
				</Alert>
			{/if}
			<Input
				name="password"
				type="password"
				label="Nueva contraseña"
				placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
				required
			/>

			<Input
				name="confirm_password"
				type="password"
				label="Confirmar contraseña"
				placeholder="Confirmar contraseña"
				required
			/>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closePasswordModal}>Cancelar</Button>
		<Button type="filled" color="primary" onclick={() => submitForm('password-form')}>
			Actualizar Contraseña
		</Button>
	{/snippet}
</Dialog>

<!-- Permissions Modal -->
{#if selectedPermissionsUser()}
	<PermissionsModal
		user={selectedPermissionsUser()}
		bind:open={showPermissionsModal}
		onclose={() => (showPermissionsModal = false)}
	/>
{/if}
