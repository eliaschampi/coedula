<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import {
		Alert,
		Avatar,
		Button,
		Card,
		Chip,
		Dialog,
		Dropdown,
		DropdownItem,
		DriveFilePreview,
		EmptyState,
		Icon,
		InfoItem,
		Input,
		PageHeader,
		Table,
		Tabs,
		type DriveFileItem,
		type TableRow
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import type { StudentDriveLink } from '$lib/types/education';
	import {
		buildStudentPhotoUrl,
		formatAcademicDegreeLabel,
		formatPaymentStatus,
		formatEducationCurrency,
		formatEducationDate,
		formatEducationDateRange,
		formatEnrollmentStatus,
		formatEnrollmentTurn,
		formatGroupCode,
		getPaymentStatusColor
	} from '$lib/utils';
	import {
		formatFileSize,
		getDriveServeUrl,
		getDriveTypeLabel,
		getFileColor,
		getFileIcon,
		normalizeDriveFileSize
	} from '$lib/utils/drive';
	import { formatDate } from '$lib/utils/formatDate';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	let activeTab = $state('summary');
	let linkedFiles = $derived(data.linkedFiles);
	let showPreview = $state(false);
	let previewFile = $state<DriveFileItem | null>(null);
	let showAttachDialog = $state(false);
	let searchQuery = $state('');
	let searchLoading = $state(false);
	let searchError = $state('');
	let hasSearched = $state(false);
	let searchResults = $state<DriveFileItem[]>([]);
	let searchSelectedRows = $state<TableRow[]>([]);
	let attachingFiles = $state(false);
	let showDeleteModal = $state(false);
	let deleteErrorMessage = $state('');

	const canUpdate = $derived(can('students:update'));
	const canDelete = $derived(can('students:delete'));
	const canReadEnrollments = $derived(data.canReadEnrollments);
	const canReadDrive = $derived(data.canReadDrive);
	const canReadPayments = $derived(data.canReadPayments);
	const canReadAttendance = $derived(can('attendance:read'));
	const canReadEvaluations = $derived(can('evaluations:read'));
	const canManageAttachments = $derived(data.canManageAttachments && data.canReadDrive);
	const linkedRows = $derived(linkedFiles as unknown as TableRow[]);
	const paymentRows = $derived(data.studentPayments as unknown as TableRow[]);
	const canGenerateCard = $derived(
		canReadEnrollments && data.enrollments.length > 0 && Boolean(data.student.dni?.trim())
	);
	const currentEnrollmentStatusColor = $derived.by(
		(): 'success' | 'info' | 'warning' | 'secondary' => {
			if (data.student.current_enrollment_status === 'active') return 'success';
			if (data.student.current_enrollment_status === 'finalized') return 'info';
			if (data.student.current_enrollment_status === 'inactive') return 'warning';
			return 'secondary';
		}
	);
	const selectedSearchResults = $derived.by(() => {
		return searchSelectedRows.reduce<DriveFileItem[]>((selected, row) => {
			const candidate = row as Partial<DriveFileItem>;
			if (
				typeof candidate.code === 'string' &&
				typeof candidate.name === 'string' &&
				typeof candidate.type === 'string'
			) {
				selected.push(candidate as DriveFileItem);
			}
			return selected;
		}, []);
	});

	const profileTabs = [
		{ value: 'summary', label: 'Perfil', icon: 'userRound' },
		{ value: 'history', label: 'Matrículas', icon: 'history' },
		{ value: 'payments', label: 'Pagos', icon: 'wallet' },
		{ value: 'attachments', label: 'Adjuntos', icon: 'paperclip' }
	];

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

	function openEditPage(): void {
		if (!canUpdate) return;
		void goto(resolve(`/students/${data.student.code}/edit` as '/'));
	}

	function openDeleteModal(): void {
		if (!canDelete) return;
		deleteErrorMessage = '';
		showDeleteModal = true;
	}

	function closeDeleteModal(): void {
		showDeleteModal = false;
		deleteErrorMessage = '';
	}

	function handleGenerateCard(): void {
		window.open(`/api/students/${data.student.code}/card`, '_blank', 'noopener,noreferrer');
	}

	function openPaymentTicket(paymentCode: string): void {
		window.open(`/api/payments/${paymentCode}/ticket`, '_blank', 'noopener,noreferrer');
	}

	function openAttendanceReport(): void {
		if (!canReadAttendance) return;
		void goto(resolve(`/students/${data.student.code}/attendance` as '/'));
	}

	function openEvaluationResults(): void {
		if (!canReadEvaluations) return;
		void goto(resolve(`/evaluations/results/student?student=${data.student.code}` as '/'));
	}

	function toPreviewFile(file: StudentDriveLink): DriveFileItem {
		return {
			code: file.file_code,
			scope: 'shared',
			name: file.file_name,
			type: file.file_type,
			size: normalizeDriveFileSize(file.file_size),
			tag: null,
			mime_type: file.mime_type,
			parent_code: null,
			user_code: '',
			deleted_at: null,
			created_at: file.file_created_at,
			updated_at: file.file_updated_at
		};
	}

	function openPreview(file: StudentDriveLink): void {
		if (file.file_type === 'dir') {
			return;
		}

		previewFile = toPreviewFile(file);
		showPreview = true;
	}

	function handleDownload(file: DriveFileItem): void {
		window.open(getDriveServeUrl(file.code, { download: true }), '_blank', 'noopener,noreferrer');
	}

	function clearSearchState(): void {
		searchQuery = '';
		searchLoading = false;
		searchError = '';
		hasSearched = false;
		searchResults = [];
		searchSelectedRows = [];
	}

	function closeAttachDialog(): void {
		showAttachDialog = false;
		clearSearchState();
	}

	function openAttachDialog(): void {
		if (!canManageAttachments) {
			showToast('No tienes permisos para adjuntar archivos al alumno', 'error');
			return;
		}

		clearSearchState();
		showAttachDialog = true;
	}

	async function refreshLinkedFiles(): Promise<void> {
		if (!canReadDrive) {
			return;
		}

		try {
			const response = await fetch(`/api/students/${data.student.code}/attachments`);
			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'No se pudieron cargar los archivos adjuntos');
			}

			const payload = (await response.json()) as { links: StudentDriveLink[] };
			linkedFiles = payload.links ?? [];
		} catch (caught) {
			const message =
				caught instanceof Error ? caught.message : 'No se pudieron cargar los archivos adjuntos';
			showToast(message, 'error');
		}
	}

	function handleSearchSubmit(event: SubmitEvent): void {
		event.preventDefault();
		void searchDriveFiles();
	}

	async function searchDriveFiles(): Promise<void> {
		const query = searchQuery.trim();
		if (!query) {
			hasSearched = false;
			searchResults = [];
			searchSelectedRows = [];
			searchError = '';
			return;
		}

		searchLoading = true;
		hasSearched = true;
		searchError = '';
		searchSelectedRows = [];

		try {
			const response = await fetch(`/api/drive?scope=shared&search=${encodeURIComponent(query)}`);
			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'No se pudo realizar la búsqueda');
			}

			const payload = (await response.json()) as { files: DriveFileItem[] };
			searchResults = payload.files ?? [];
		} catch (caught) {
			searchResults = [];
			searchError = caught instanceof Error ? caught.message : 'Error al buscar archivos';
		} finally {
			searchLoading = false;
		}
	}

	async function attachSelectedFiles(): Promise<void> {
		if (!canManageAttachments || selectedSearchResults.length === 0) {
			return;
		}

		attachingFiles = true;

		const results = await Promise.all(
			selectedSearchResults.map(async (file) => {
				try {
					const response = await fetch(`/api/students/${data.student.code}/attachments`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ file_code: file.code })
					});

					if (!response.ok) {
						const payload = await response.json();
						return {
							success: false,
							message: payload?.message || `No se pudo adjuntar ${file.name}`
						};
					}

					return { success: true };
				} catch {
					return {
						success: false,
						message: `No se pudo adjuntar ${file.name}`
					};
				}
			})
		);

		attachingFiles = false;

		const successCount = results.filter((result) => result.success).length;
		const firstError = results.find((result) => !result.success)?.message;

		if (successCount > 0) {
			showToast(
				successCount === 1
					? 'Archivo adjuntado al alumno'
					: `${successCount} archivos adjuntados al alumno`,
				'success'
			);
			await refreshLinkedFiles();
			closeAttachDialog();
		}

		if (firstError) {
			showToast(firstError, successCount > 0 ? 'warning' : 'error');
		}
	}

	async function unlinkFile(file: StudentDriveLink): Promise<void> {
		if (!canManageAttachments) {
			return;
		}

		try {
			const response = await fetch(`/api/students/${data.student.code}/attachments`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ file_code: file.file_code })
			});

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'No se pudo quitar el adjunto');
			}

			showToast('Archivo desvinculado del alumno', 'success');
			await refreshLinkedFiles();
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'No se pudo quitar el adjunto';
			showToast(message, 'error');
		}
	}
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader
		title={data.student.full_name}
		subtitle="Ficha consolidada del alumno con historial académico y documentos centralizados"
		icon="graduationCap"
	>
		{#snippet actions()}
			<Button
				type="border"
				icon="arrowLeft"
				onclick={() => void goto(resolve('/students' as '/'))}
			/>
			<Dropdown position="bottom-end" aria-label="Acciones del alumno">
				{#snippet triggerContent()}
					<Button type="flat" icon="moreVertical" aria-label="Abrir acciones del alumno" />
				{/snippet}

				{#snippet content()}
					<DropdownItem icon="edit" onclick={openEditPage} disabled={!canUpdate}>
						Editar alumno
					</DropdownItem>
					<DropdownItem icon="trash" color="danger" onclick={openDeleteModal} disabled={!canDelete}>
						Eliminar alumno
					</DropdownItem>
				{/snippet}
			</Dropdown>
		{/snippet}
	</PageHeader>

	<Card>
		<div class="lumi-hero-panel">
			<div class="lumi-hero-panel__identity">
				<Avatar
					src={data.student.photo_url
						? buildStudentPhotoUrl(data.student.photo_url, 'preview')
						: ''}
					text={data.student.full_name}
					size="xl"
					color="primary"
				/>
				<div class="lumi-hero-panel__copy">
					<div class="lumi-hero-panel__name-row">
						<h2 class="lumi-hero-panel__name">{data.student.full_name}</h2>
					</div>
					<p class="lumi-hero-panel__code">{data.student.student_number}</p>
					{#if data.student.current_cycle_title}
						<p class="lumi-hero-panel__subtitle">
							{data.student.current_cycle_title} · {formatAcademicDegreeLabel(
								data.student.current_degree_name
							)}
						</p>
					{/if}
				</div>
			</div>

			<div class="lumi-hero-panel__stats">
				<InfoItem icon="creditCard" label="DNI" value={data.student.dni || 'Sin DNI'} />
				<InfoItem icon="phone" label="Teléfono" value={data.student.phone || 'Sin teléfono'} />
				<InfoItem
					icon="badgeCheck"
					label="Matrícula actual"
					value={data.student.current_enrollment_number || 'Sin matrícula actual'}
				/>
				<InfoItem icon="activity" label="Estado académico">
					<Chip color={currentEnrollmentStatusColor} size="sm">
						{data.student.current_enrollment_status
							? formatEnrollmentStatus(data.student.current_enrollment_status)
							: 'Sin matrícula actual'}
					</Chip>
				</InfoItem>
			</div>
		</div>
	</Card>

	<Tabs bind:value={activeTab} tabs={profileTabs}>
		{#if activeTab === 'summary'}
			<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md student-profile-grid">
				<Card title="Información personal" subtitle="Datos base y contacto del alumno">
					<div class="lumi-stack lumi-stack--sm">
						<InfoItem icon="creditCard" label="DNI" value={data.student.dni || 'Sin DNI'} />
						<InfoItem icon="phone" label="Teléfono" value={data.student.phone || 'Sin teléfono'} />
						<InfoItem
							icon="calendar"
							label="Nacimiento"
							value={formatEducationDate(data.student.birth_date)}
						/>
						<InfoItem
							icon="mapPin"
							label="Dirección"
							value={data.student.address || 'Sin dirección'}
						/>
					</div>
				</Card>

				<Card title="Situación académica" subtitle="Resumen vigente del alumno">
					<div class="lumi-stack lumi-stack--sm">
						<InfoItem
							icon="badgeCheck"
							label="Matrícula actual"
							value={data.student.current_enrollment_number || 'Sin matrícula actual'}
						/>
						<InfoItem
							icon="graduationCap"
							label="Ciclo actual"
							value={data.student.current_cycle_title || 'Sin ciclo actual'}
						/>
						<InfoItem
							icon="bookCopy"
							label="Grado actual"
							value={data.student.current_degree_name
								? formatAcademicDegreeLabel(data.student.current_degree_name)
								: 'Sin grado actual'}
						/>
						<InfoItem
							icon="building2"
							label="Sede actual"
							value={data.student.current_branch_name || 'Sin sede actual'}
						/>
						<InfoItem icon="activity" label="Estado académico">
							<Chip color={currentEnrollmentStatusColor} size="sm">
								{data.student.current_enrollment_status
									? formatEnrollmentStatus(data.student.current_enrollment_status)
									: 'Sin matrícula actual'}
							</Chip>
						</InfoItem>
					</div>
					{#snippet footer()}
						{#if canGenerateCard}
							<Button
								type="gradient"
								color="success"
								icon="creditCard"
								onclick={handleGenerateCard}
							/>
						{/if}
						<Button
							type="border"
							color="warning"
							icon="history"
							onclick={openAttendanceReport}
							disabled={!canReadAttendance}
						>
							Asistencia
						</Button>
						<Button
							type="border"
							color="primary"
							icon="badgeCheck"
							onclick={openEvaluationResults}
							disabled={!canReadEvaluations}
						>
							Evaluaciones
						</Button>
					{/snippet}
				</Card>

				<Card title="Observaciones" subtitle="Notas visibles para próximas áreas">
					{#if data.student.observation}
						<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
							{data.student.observation}
						</p>
					{:else}
						<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
							No hay observaciones registradas para este alumno.
						</p>
					{/if}
				</Card>
			</div>
		{:else if activeTab === 'history'}
			<Card title="Historial de matrículas" subtitle="Secuencia completa de registros del alumno">
				{#if !canReadEnrollments}
					<Alert type="warning" closable>
						No tienes permisos para consultar el historial de matrículas.
					</Alert>
				{:else if data.enrollments.length === 0}
					<EmptyState
						title="Sin matrículas registradas"
						description="Cuando el alumno tenga movimientos académicos, aparecerán aquí."
						icon="bookX"
					/>
				{:else}
					<div class="lumi-history-list">
						{#each data.enrollments as enrollment (enrollment.code)}
							<div class="lumi-history-item">
								<div class="lumi-history-item__main">
									<div class="lumi-history-item__top">
										<strong>{enrollment.enrollment_number}</strong>
										<Chip
											color={enrollment.status === 'active'
												? 'success'
												: enrollment.status === 'inactive'
													? 'warning'
													: 'info'}
											size="sm"
										>
											{formatEnrollmentStatus(enrollment.status)}
										</Chip>
									</div>
									<p class="lumi-history-item__title">
										{enrollment.cycle_title} · {formatAcademicDegreeLabel(enrollment.degree_name)}
									</p>
									<p class="lumi-history-item__meta">
										{formatGroupCode(enrollment.group_code)} · {formatEnrollmentTurn(
											enrollment.turn
										)} · {formatEducationDateRange(enrollment.start_date, enrollment.end_date)}
									</p>
								</div>

								<div class="lumi-history-item__side">
									<InfoItem icon="hash" label="Lista" value={enrollment.roll_code} />
									<InfoItem
										icon="wallet"
										label="Pago"
										value={formatEducationCurrency(enrollment.pay_cost)}
									/>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</Card>
		{:else if activeTab === 'payments'}
			<Card title="Historial de pagos" subtitle="Cobros vinculados directamente al alumno">
				{#if !canReadPayments}
					<Alert type="warning" closable>
						No tienes permisos para consultar el historial de pagos.
					</Alert>
				{:else if data.studentPayments.length === 0}
					<EmptyState
						title="Sin pagos vinculados"
						description="Cuando el alumno tenga cobros asociados, aparecerán aquí."
						icon="wallet"
					/>
				{:else}
					<Table data={paymentRows} hover pagination itemsPerPage={10}>
						{#snippet thead()}
							<th>Ingreso</th>
							<th>Conceptos</th>
							<th>Total</th>
							<th>Estado</th>
							<th>Acciones</th>
						{/snippet}

						{#snippet row({ row })}
							{@const payment = row as unknown as PageData['studentPayments'][number]}
							<td>
								<div class="lumi-stack lumi-stack--2xs">
									<span class="lumi-font--medium">{payment.payment_number}</span>
									<span class="lumi-text--xs lumi-text--muted">
										{formatEducationDate(payment.payment_date)}
									</span>
								</div>
							</td>
							<td>{payment.concept_summary}</td>
							<td>{formatEducationCurrency(payment.total_amount)}</td>
							<td>
								<Chip color={getPaymentStatusColor(payment.status)} size="sm">
									{formatPaymentStatus(payment.status)}
								</Chip>
							</td>
							<td>
								<Button
									type="flat"
									size="sm"
									icon="eye"
									onclick={() => openPaymentTicket(payment.code)}
								>
									Ticket
								</Button>
							</td>
						{/snippet}
					</Table>
				{/if}
			</Card>
		{:else}
			<Card>
				{#snippet header()}
					<div class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--wrap">
						<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
							<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
								<span class="lumi-font--medium">Archivos adjuntos</span>
								<Chip color="info" size="sm">{linkedFiles.length}</Chip>
							</div>
							<span class="lumi-text--xs lumi-text--muted">
								Documentos e imágenes vinculadas desde Drive compartido
							</span>
						</div>

						<Button
							type="filled"
							color="primary"
							icon="plus"
							onclick={openAttachDialog}
							disabled={!canManageAttachments}
						>
							Adjuntar
						</Button>
					</div>
				{/snippet}

				{#if !canReadDrive}
					<Alert type="warning" closable>
						No tienes permisos para consultar archivos adjuntos desde Drive.
					</Alert>
				{:else if linkedFiles.length === 0}
					<EmptyState
						title="Sin archivos adjuntos"
						description="Puedes vincular documentos del Drive compartido para centralizarlos en la ficha del alumno."
						icon="folder"
					>
						{#snippet actions()}
							<Button
								type="filled"
								color="primary"
								icon="plus"
								onclick={openAttachDialog}
								disabled={!canManageAttachments}
							>
								Adjuntar archivos
							</Button>
						{/snippet}
					</EmptyState>
				{:else}
					<Table data={linkedRows} hover pagination itemsPerPage={10}>
						{#snippet thead()}
							<th>Archivo</th>
							<th>Tipo</th>
							<th>Tamaño</th>
							<th>Adjuntado</th>
							<th>Acciones</th>
						{/snippet}

						{#snippet row({ row })}
							{@const file = row as unknown as StudentDriveLink}
							<td>
								<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
									<Icon
										icon={getFileIcon(file.file_type)}
										color={getFileColor(file.file_type)}
										size="sm"
									/>
									<span class="lumi-font--medium lumi-text-ellipsis" title={file.file_name}>
										{file.file_name}
									</span>
								</div>
							</td>
							<td>
								<span class="lumi-text--sm lumi-text--muted">
									{getDriveTypeLabel(file.file_type)}
								</span>
							</td>
							<td>
								<span class="lumi-text--sm lumi-text--muted">
									{file.file_type === 'dir'
										? '—'
										: formatFileSize(normalizeDriveFileSize(file.file_size))}
								</span>
							</td>
							<td>
								<span class="lumi-text--sm lumi-text--muted">{formatDate(file.linked_at)}</span>
							</td>
							<td>
								<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
									<Button
										type="flat"
										size="sm"
										icon="eye"
										disabled={file.file_type === 'dir'}
										onclick={() => openPreview(file)}
									>
										Ver
									</Button>
									<Button
										type="flat"
										size="sm"
										icon="download"
										onclick={() => handleDownload(toPreviewFile(file))}
									>
										Descargar
									</Button>
									<Button
										type="flat"
										size="sm"
										color="danger"
										icon="trash"
										disabled={!canManageAttachments}
										onclick={() => void unlinkFile(file)}
									>
										Quitar
									</Button>
								</div>
							</td>
						{/snippet}
					</Table>
				{/if}
			</Card>
		{/if}
	</Tabs>
</div>

<Dialog bind:open={showDeleteModal} title="Eliminar alumno" size="sm">
	<form
		id="delete-student-form"
		method="POST"
		action="?/delete"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Alumno eliminado exitosamente', 'success');
					await goto(resolve('/students' as '/'));
					return;
				}

				if (result.type === 'failure') {
					deleteErrorMessage = getActionError(result) ?? 'No se pudo eliminar el alumno';
				}
			};
		}}
	>
		{#if deleteErrorMessage}
			<Alert type="danger" closable onclose={() => (deleteErrorMessage = '')}>
				{deleteErrorMessage}
			</Alert>
		{/if}
		<p class="lumi-margin--none lumi-text--sm">
			¿Deseas eliminar a <strong>{data.student.full_name}</strong>? Esta acción solo está disponible
			si no tiene matrículas históricas.
		</p>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeDeleteModal}>Cancelar</Button>
		<Button type="filled" color="danger" onclick={() => submitForm('delete-student-form')}>
			Eliminar
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showAttachDialog} title="Buscar archivos en Drive" size="lg" scrollable>
	<div class="lumi-stack lumi-stack--md">
		<form onsubmit={handleSearchSubmit}>
			<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm lumi-flex--wrap">
				<div class="lumi-flex-item--grow">
					<Input bind:value={searchQuery} placeholder="Escribe para buscar en Drive compartido" />
				</div>
				<Button type="flat" color="primary" icon="search" button="submit" loading={searchLoading}>
					Buscar
				</Button>
			</div>
		</form>

		{#if searchError}
			<Alert type="danger" closable onclose={() => (searchError = '')}>{searchError}</Alert>
		{/if}

		{#if !hasSearched}
			<EmptyState
				title="Sin resultados todavía"
				description="Busca por nombre para adjuntar archivos o carpetas del Drive compartido."
				icon="search"
			/>
		{:else if searchLoading}
			<div class="lumi-flex lumi-flex--center lumi-padding--xl">
				<span class="lumi-text--sm lumi-text--muted">Buscando en Drive compartido...</span>
			</div>
		{:else if searchResults.length === 0}
			<EmptyState
				title="Sin coincidencias"
				description="No se encontraron archivos con ese nombre."
				icon="folder"
			/>
		{:else}
			<Table
				data={searchResults as unknown as TableRow[]}
				selectable
				bind:selected={searchSelectedRows}
				pagination
				itemsPerPage={8}
			>
				{#snippet thead()}
					<th>Nombre</th>
					<th>Tipo</th>
					<th>Tamaño</th>
				{/snippet}

				{#snippet row({ row })}
					{@const file = row as unknown as DriveFileItem}
					<td>
						<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
							<Icon icon={getFileIcon(file.type)} color={getFileColor(file.type)} size="sm" />
							<span class="lumi-font--medium lumi-text-ellipsis" title={file.name}>{file.name}</span
							>
						</div>
					</td>
					<td>
						<span class="lumi-text--sm lumi-text--muted">{getDriveTypeLabel(file.type)}</span>
					</td>
					<td>
						<span class="lumi-text--sm lumi-text--muted">
							{file.type === 'dir' ? '—' : formatFileSize(normalizeDriveFileSize(file.size))}
						</span>
					</td>
				{/snippet}
			</Table>
		{/if}
	</div>

	{#snippet footer()}
		<Button type="border" onclick={closeAttachDialog}>Cancelar</Button>
		<Button
			type="filled"
			color="primary"
			icon="paperclip"
			disabled={selectedSearchResults.length === 0 || !canManageAttachments}
			loading={attachingFiles}
			onclick={() => void attachSelectedFiles()}
		>
			Adjuntar seleccionados
		</Button>
	{/snippet}
</Dialog>

<DriveFilePreview bind:open={showPreview} file={previewFile} ondownload={handleDownload} />

<style>
	:global(.student-profile-grid .lumi-card:last-child) {
		grid-column: 1 / -1;
	}

	@media (max-width: 900px) {
		:global(.student-profile-grid) {
			grid-template-columns: 1fr;
		}
	}
</style>
