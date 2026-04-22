<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import {
		Alert,
		Button,
		Card,
		Chip,
		Dialog,
		Fieldset,
		InfoItem,
		Input,
		List,
		ListHeader,
		ListItem,
		PageHeader,
		Select,
		Switch,
		Table
	} from '$lib/components';
	import { showToast } from '$lib/stores/Toast';
	import { can } from '$lib/stores/permissions';
	import type { PageData } from './$types';

	interface Branch {
		code: string;
		name: string;
		state: boolean;
		users: string[];
		created_at: Date | string;
	}

	const { data }: { data: PageData } = $props();

	const canCreate = $derived(can('branches:create'));
	const canUpdate = $derived(can('branches:update'));
	const canDelete = $derived(can('branches:delete'));

	let showModal = $state(false);
	let showDeleteModal = $state(false);
	let isEditing = $state(false);
	let errorMessage = $state('');
	let deleteErrorMessage = $state('');
	let selectedBranch = $state<Branch | null>(null);

	let formName = $state('');
	let formState = $state(true);
	let selectedUsers = $state<string[]>([]);
	let selectedUserCode = $state('');

	const userOptions = $derived(
		data.users.map((u) => ({
			value: u.code,
			label: `${u.name ?? ''} ${u.last_name ?? ''} (${u.email})`
		}))
	);

	const availableUserOptions = $derived(
		userOptions.filter((opt) => !selectedUsers.includes(opt.value))
	);

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function openCreateModal() {
		if (!canCreate) return;
		isEditing = false;
		formName = '';
		formState = true;
		selectedUsers = [];
		selectedUserCode = '';
		errorMessage = '';
		showModal = true;
	}

	function openEditModal(branch: Branch) {
		if (!canUpdate) return;
		isEditing = true;
		selectedBranch = branch;
		formName = branch.name;
		formState = branch.state;
		selectedUsers = [...(branch.users || [])];
		selectedUserCode = '';
		errorMessage = '';
		showModal = true;
	}

	function openDeleteModal(branch: Branch) {
		if (!canDelete) return;
		selectedBranch = branch;
		deleteErrorMessage = '';
		showDeleteModal = true;
	}

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

	function addUser() {
		if (selectedUserCode && !selectedUsers.includes(selectedUserCode)) {
			selectedUsers = [...selectedUsers, selectedUserCode];
			selectedUserCode = '';
		}
	}

	function removeUser(userCode: string) {
		selectedUsers = selectedUsers.filter((code) => code !== userCode);
	}

	function getUser(userCode: string) {
		return data.users.find((u) => u.code === userCode);
	}

	function getUserName(userCode: string): string {
		const user = getUser(userCode);
		return user ? `${user.name ?? ''} ${user.last_name ?? ''}` : 'Usuario no disponible';
	}

	function closeModal() {
		showModal = false;
		errorMessage = '';
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		deleteErrorMessage = '';
		selectedBranch = null;
	}
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader title="Sedes" subtitle="Gestiona las sedes del sistema" icon="building">
		{#snippet actions()}
			<Button
				type="filled"
				color="primary"
				icon="plus"
				onclick={openCreateModal}
				disabled={!canCreate}>Nueva Sede</Button
			>
		{/snippet}
	</PageHeader>

	<Card>
		<Table data={data.branches} search pagination hover itemsPerPage={10}>
			{#snippet thead()}
				<th>Nombre</th>
				<th>Estado</th>
				<th>Usuarios asignados</th>
				<th>Fecha creación</th>
				<th>Acciones</th>
			{/snippet}

			{#snippet row({ row })}
				<td>
					<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
						<span class="lumi-font--medium">{row.name as string}</span>
					</div>
				</td>
				<td>
					{#if row.state}
						<Chip color="success" size="sm">Activa</Chip>
					{:else}
						<Chip color="danger" size="sm">Inactiva</Chip>
					{/if}
				</td>
				<td>
					<Chip color="info" size="sm">{(row.users as string[])?.length || 0} usuarios</Chip>
				</td>
				<td>{formatDate(row.created_at as string | Date)}</td>
				<td>
					<div class="lumi-flex lumi-flex--gap-xs">
						<Button
							type="flat"
							size="sm"
							icon="edit"
							onclick={() => openEditModal(row as unknown as Branch)}
							disabled={!canUpdate}
						/>
						<Button
							type="flat"
							size="sm"
							icon="trash"
							color="danger"
							onclick={() => openDeleteModal(row as unknown as Branch)}
							disabled={!canDelete}
						/>
					</div>
				</td>
			{/snippet}
		</Table>
	</Card>
</div>

<!-- Create/Edit Modal -->
<Dialog bind:open={showModal} title={isEditing ? 'Editar Sede' : 'Nueva Sede'} size="md">
	<form
		id="branch-form"
		method="POST"
		action="?/{isEditing ? 'update' : 'create'}"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast(
						isEditing ? 'Sede actualizada exitosamente' : 'Sede creada exitosamente',
						'success'
					);
					await invalidate('branches:load');
					closeModal();
				} else if (result.type === 'failure') {
					const error = result.data?.error;
					errorMessage = (typeof error === 'string' ? error : null) || 'Ocurrió un error';
				}
			};
		}}
	>
		{#if isEditing && selectedBranch}
			<input type="hidden" name="code" value={selectedBranch.code} />
		{/if}

		{#if errorMessage}
			<Alert type="danger" closable onclose={() => (errorMessage = '')}>
				{errorMessage}
			</Alert>
		{/if}

		<div class="lumi-stack lumi-stack--md">
			<Input
				bind:value={formName}
				name="name"
				label="Nombre de la sede"
				placeholder="Ingrese el nombre"
				required
			/>

			<Switch bind:checked={formState} name="state" color="info" label="Sede activa" />

			<Fieldset legend="Usuarios asignados">
				<div class="lumi-stack lumi-stack--sm">
					<div class="lumi-flex lumi-flex--gap-sm lumi-flex--mobile-column">
						<div class="lumi-flex-item--grow">
							<Select
								bind:value={selectedUserCode}
								options={availableUserOptions}
								placeholder="Seleccione un usuario"
								clearable
							/>
						</div>
						<Button type="border" icon="plus" onclick={addUser} disabled={!selectedUserCode} />
					</div>

					<InfoItem
						icon="users"
						label="Estado"
						value={`${selectedUsers.length} usuario${selectedUsers.length === 1 ? '' : 's'} asignado${selectedUsers.length === 1 ? '' : 's'}`}
					/>

					{#if selectedUsers.length > 0}
						<List size="sm">
							<ListHeader title="Usuarios seleccionados" icon="users" />
							{#each selectedUsers as userCode (userCode)}
								{@const user = getUser(userCode)}
								<input type="hidden" name="selectedUsers" value={userCode} />
								<ListItem
									title={getUserName(userCode)}
									subtitle={user?.email || 'Sin correo'}
									icon="user"
								>
									<Button
										type="flat"
										size="sm"
										icon="x"
										color="danger"
										aria-label={`Quitar usuario ${getUserName(userCode)}`}
										onclick={() => removeUser(userCode)}
									/>
								</ListItem>
							{/each}
						</List>
					{:else}
						<p class="lumi-text--sm lumi-text--muted">No hay usuarios asignados</p>
					{/if}
				</div>
			</Fieldset>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeModal}>Cancelar</Button>
		<Button type="filled" color="primary" onclick={() => submitForm('branch-form')}>
			{isEditing ? 'Actualizar' : 'Crear'}
		</Button>
	{/snippet}
</Dialog>

<!-- Delete Confirmation Modal -->
<Dialog bind:open={showDeleteModal} title="Confirmar eliminación" size="sm">
	<form
		id="delete-branch-form"
		method="POST"
		action="?/delete"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Sede eliminada exitosamente', 'success');
					await invalidate('branches:load');
					closeDeleteModal();
				} else if (result.type === 'failure') {
					deleteErrorMessage = getActionError(result) ?? 'Error al eliminar';
					showToast(deleteErrorMessage, 'error');
				}
			};
		}}
	>
		{#if selectedBranch}
			<input type="hidden" name="code" value={selectedBranch.code} />
			{#if deleteErrorMessage}
				<Alert type="danger" closable onclose={() => (deleteErrorMessage = '')}>
					{deleteErrorMessage}
				</Alert>
			{/if}
			<p class="lumi-margin--none">
				¿Estás seguro de que deseas eliminar la sede <strong>{selectedBranch.name}</strong>? Esta
				acción no se puede deshacer.
			</p>
		{/if}
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeDeleteModal}>Cancelar</Button>
		<Button
			type="filled"
			color="danger"
			disabled={!canDelete || !selectedBranch}
			onclick={() => submitForm('delete-branch-form')}
		>
			Eliminar
		</Button>
	{/snippet}
</Dialog>
