<script lang="ts">
	import { invalidate } from '$app/navigation';
	import Dialog from '../Dialog/Dialog.svelte';
	import Button from '../Button/Button.svelte';
	import Select from '../Select/Select.svelte';
	import Alert from '../Alert/Alert.svelte';
	import Fieldset from '../Fieldset/Fieldset.svelte';
	import InfoItem from '../InfoItem/InfoItem.svelte';
	import List from '../List/List.svelte';
	import ListHeader from '../List/ListHeader.svelte';
	import ListItem from '../List/ListItem.svelte';
	import Loading from '../Loading/Loading.svelte';
	import { showToast } from '$lib/stores/Toast';
	import { PERMISSION_DEFINITIONS, getPermissionByKey } from '$lib/permissions/definitions';

	interface ApiPermission {
		code: string;
		user_code: string;
		entity: string;
		action: string;
	}

	interface User {
		code: string;
		name: string;
		last_name: string;
		email: string;
	}

	interface Props {
		user: User | null;
		open?: boolean;
		onclose?: () => void;
	}

	let { user, open = $bindable(false), onclose }: Props = $props();

	// State management
	let userPermissions = $state<string[]>([]); // Array of permission keys like 'users:read'
	let loading = $state(false);
	let error = $state('');
	let saving = $state(false);
	let selectedPermission = $state('');

	// Computed
	const availablePermissions = $derived(
		PERMISSION_DEFINITIONS.filter((p) => !userPermissions.includes(p.key))
	);

	const availablePermissionOptions = $derived(
		availablePermissions.map((p) => ({
			value: p.key,
			label: `${p.category} - ${p.label}`
		}))
	);

	const permissionSummary = $derived(
		userPermissions.length === 0
			? 'Este usuario no tiene permisos asignados'
			: `${userPermissions.length} permiso${userPermissions.length === 1 ? '' : 's'} configurado${userPermissions.length === 1 ? '' : 's'}`
	);

	// Load permissions from API
	async function loadPermissions() {
		if (!user?.code) return;

		loading = true;
		error = '';

		try {
			const response = await fetch(`/api/users/${user.code}/permissions`);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Error fetching permissions');
			}

			const { permissions: permissionsData } = (await response.json()) as {
				permissions: ApiPermission[];
			};

			// Convert to permission keys format (entity:action)
			userPermissions = permissionsData.map((p) => `${p.entity}:${p.action}`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Error loading permissions';
		} finally {
			loading = false;
		}
	}

	// Add permission
	function addPermission() {
		if (selectedPermission && !userPermissions.includes(selectedPermission)) {
			userPermissions = [...userPermissions, selectedPermission];
			selectedPermission = '';
		}
	}

	// Remove permission
	function removePermission(permissionKey: string) {
		userPermissions = userPermissions.filter((p) => p !== permissionKey);
	}

	// Save permissions
	async function savePermissions() {
		if (!user) return;

		saving = true;
		error = '';

		try {
			// Convert permission keys to API format
			const permissionsToSave = userPermissions.map((key) => {
				const [entity, action] = key.split(':');
				return { entity, user_action: action };
			});

			const response = await fetch(`/api/users/${user.code}/permissions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ permissions: permissionsToSave })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Error guardando permisos');
			}

			const result = await response.json();
			showToast(`Permisos actualizados correctamente (${result.count} permisos)`, 'success');
			await invalidate('users:permissions');
			closeModal();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Error guardando permisos';
		} finally {
			saving = false;
		}
	}

	// Close modal
	function closeModal() {
		open = false;
		onclose?.();
	}

	// Load permissions when modal opens
	$effect(() => {
		if (open && user?.code) {
			loadPermissions();
		}
	});
</script>

<Dialog
	bind:open
	title={user ? `Permisos de Usuario: ${user.name} ${user.last_name}` : 'Permisos de Usuario'}
	size="lg"
>
	{#if loading}
		<div class="lumi-flex lumi-flex--center lumi-padding--xl">
			<Loading text="Cargando permisos..." />
		</div>
	{:else}
		<div class="lumi-stack lumi-stack--md">
			{#if error}
				<div>
					<Alert type="danger" closable onclose={() => (error = '')}>
						{error}
					</Alert>
					<div class="lumi-flex lumi-flex--center lumi-margin-top--md">
						<Button type="filled" color="primary" size="sm" onclick={loadPermissions}>
							Reintentar
						</Button>
					</div>
				</div>
			{/if}

			<Fieldset legend="Agregar permiso">
				<div class="lumi-flex lumi-flex--gap-sm lumi-flex--mobile-column">
					<div class="lumi-flex-item--grow">
						<Select
							bind:value={selectedPermission}
							options={availablePermissionOptions}
							placeholder="Seleccionar permiso..."
							clearable={false}
						/>
					</div>
					<Button
						type="filled"
						color="primary"
						icon="plus"
						onclick={addPermission}
						disabled={!selectedPermission || saving}
					>
						Agregar
					</Button>
				</div>
			</Fieldset>

			<Fieldset legend={`Permisos actuales (${userPermissions.length})`}>
				<div class="lumi-stack lumi-stack--sm">
					<InfoItem icon="shieldCheck" label="Estado" value={permissionSummary} />
					{#if userPermissions.length === 0}
						<div class="lumi-text--center lumi-padding--xl lumi-text--muted">
							No hay permisos asignados
						</div>
					{:else}
						<List size="sm" class="permissions-modal__list">
							<ListHeader title="Lista de permisos" icon="key" />
							{#each userPermissions as permissionKey (permissionKey)}
								{@const permission = getPermissionByKey(permissionKey)}
								{#if permission}
									<ListItem
										title={permission.label}
										subtitle={`${permission.category} • ${permission.description}`}
										icon="shield"
									>
										<Button
											type="flat"
											color="danger"
											size="sm"
											icon="x"
											aria-label={`Quitar permiso ${permission.label}`}
											onclick={() => removePermission(permissionKey)}
										/>
									</ListItem>
								{/if}
							{/each}
						</List>
					{/if}
				</div>
			</Fieldset>
		</div>
	{/if}

	{#snippet footer()}
		<Button type="border" onclick={closeModal} disabled={saving}>Cancelar</Button>
		<Button
			type="filled"
			color="primary"
			onclick={savePermissions}
			disabled={loading || saving || !!error}
			loading={saving}
		>
			Guardar Permisos
		</Button>
	{/snippet}
</Dialog>

<style>
	:global(.permissions-modal__list) {
		max-height: calc(var(--lumi-space-6xl) + var(--lumi-space-5xl));
	}
</style>
