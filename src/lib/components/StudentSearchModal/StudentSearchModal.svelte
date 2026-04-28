<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Alert,
		Avatar,
		Button,
		Chip,
		Dialog,
		Divider,
		Dropdown,
		DropdownItem,
		EmptyState,
		Input,
		Table,
		type TableRow
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { buildStudentPhotoUrl, formatAcademicDegreeLabel } from '$lib/utils';
	import type { RegistroStudentTableRow } from '$lib/types/education';

	interface Props {
		open?: boolean;
		enrollmentDefaultsQuery?: string;
	}

	let { open = $bindable(false), enrollmentDefaultsQuery = '' }: Props = $props();

	const canReadStudents = $derived(can('students:read'));
	const canUpdateStudent = $derived(can('students:update'));
	const canCreateEnrollment = $derived(can('enrollments:create'));
	const canUpdateEnrollment = $derived(can('enrollments:update'));
	const canReadAttendance = $derived(can('attendance:read'));

	let draft = $state('');
	let page = $state(1);
	let listMode = $state<'recent' | 'search'>('recent');
	let appliedQuery = $state('');
	let loading = $state(false);
	let fetchError = $state('');
	let items = $state<RegistroStudentTableRow[]>([]);
	let hasMore = $state(false);

	const tableRows = $derived(items as unknown as TableRow[]);

	const dividerLabel = $derived(
		listMode === 'recent' ? 'Últimos alumnos dados de alta' : `Resultados · “${appliedQuery}”`
	);

	const emptyCopy = $derived(
		listMode === 'recent'
			? { title: 'Sin alumnos', description: 'Cuando se den de alta, aparecerán aquí.' }
			: {
					title: 'Sin coincidencias',
					description: 'Probá con otro criterio o volvé a los últimos datos.'
				}
	);

	function newEnrollmentHref(studentCode: string): string {
		const base = `/students/enrollments/new?student=${encodeURIComponent(studentCode)}`;
		if (!enrollmentDefaultsQuery) return base;
		const join = enrollmentDefaultsQuery.startsWith('&') ? '' : '&';
		return `${base}${join}${enrollmentDefaultsQuery}`;
	}

	function go(href: string): void {
		open = false;
		void goto(resolve(href as '/'));
	}

	let abortLoad: AbortController | null = null;

	async function loadPage(): Promise<void> {
		abortLoad?.abort();
		abortLoad = new AbortController();
		const signal = abortLoad.signal;

		loading = true;
		fetchError = '';
		try {
			const queryString =
				listMode === 'recent'
					? `page=${page}&recent=1`
					: `page=${page}&q=${encodeURIComponent(appliedQuery)}`;

			const response = await fetch(`/api/students/hub-search?${queryString}`, { signal });
			const payload = (await response.json()) as {
				message?: string;
				items?: RegistroStudentTableRow[];
				hasMore?: boolean;
			};

			if (!response.ok) {
				throw new Error(payload.message || 'No se pudo cargar el listado');
			}

			items = payload.items ?? [];
			hasMore = Boolean(payload.hasMore);
		} catch (e) {
			if (signal.aborted || (e instanceof Error && e.name === 'AbortError')) return;
			fetchError = e instanceof Error ? e.message : 'No se pudo cargar el listado';
			items = [];
			hasMore = false;
		} finally {
			if (!signal.aborted) {
				loading = false;
			}
		}
	}

	function resetClosedState(): void {
		draft = '';
		page = 1;
		listMode = 'recent';
		appliedQuery = '';
		items = [];
		hasMore = false;
		fetchError = '';
		loading = false;
	}

	function handleDialogClose(): void {
		abortLoad?.abort();
		resetClosedState();
	}

	function handleSubmitSearch(event: SubmitEvent): void {
		event.preventDefault();
		const q = draft.trim();
		if (q.length < 2) {
			fetchError = 'Ingresá al menos 2 caracteres y pulsá Buscar o Enter.';
			return;
		}
		fetchError = '';
		listMode = 'search';
		appliedQuery = q;
		page = 1;
		void loadPage();
	}

	function showRecents(): void {
		fetchError = '';
		listMode = 'recent';
		appliedQuery = '';
		page = 1;
		void loadPage();
	}

	function goPrev(): void {
		if (page <= 1 || loading) return;
		page -= 1;
		void loadPage();
	}

	function goNext(): void {
		if (!hasMore || loading) return;
		page += 1;
		void loadPage();
	}

	$effect(() => {
		if (!open) {
			abortLoad?.abort();
			return;
		}
		resetClosedState();
		void loadPage();
	});
</script>

<Dialog bind:open title="Buscar alumno" size="xl" scrollable onclose={handleDialogClose}>
	<div class="lumi-stack lumi-stack--md student-search-modal">
		{#if !canReadStudents}
			<Alert type="warning" closable={false}>No tenés permiso para consultar alumnos.</Alert>
		{:else}
			<form
				class="lumi-flex lumi-align-items--center lumi-flex--wrap"
				onsubmit={handleSubmitSearch}
			>
				<div class="lumi-flex-item--grow lumi-stack lumi-stack--2xs">
					<Input bind:value={draft} label="Buscar" placeholder="Nombre, DNI, teléfono o código" />
					<p class="lumi-text--xs lumi-text--muted">
						<span class="lumi-font--medium">Buscar</span> o
						<span class="lumi-font--medium">Enter</span> ejecutan la búsqueda. Al abrir el modal se listan
						los últimos alumnos dados de alta.
					</p>
				</div>
				<Button type="flat" icon="search" button="submit" disabled={loading} aria-label="Buscar" />
				{#if listMode === 'search'}
					<Button type="border" icon="history" disabled={loading} onclick={showRecents}>
						Recientes
					</Button>
				{/if}
			</form>

			{#if fetchError}
				<Alert type="danger" closable onclose={() => (fetchError = '')}>{fetchError}</Alert>
			{/if}

			<div
				class="lumi-flex lumi-flex--gap-sm lumi-align-items--center lumi-justify--between lumi-flex--wrap"
			>
				<Divider text={dividerLabel} position="left" spaced={false} class="lumi-flex-item--grow" />
				<div class="lumi-flex lumi-flex--gap-xs">
					<Button
						type="border"
						size="sm"
						icon="chevronLeft"
						disabled={page <= 1 || loading}
						onclick={goPrev}
					>
						Anterior
					</Button>
					<Button
						type="border"
						size="sm"
						icon="chevronRight"
						iconAfter
						disabled={!hasMore || loading}
						onclick={goNext}
					>
						Siguiente
					</Button>
				</div>
			</div>

			<div class="student-search-modal__results lumi-stack lumi-stack--sm">
				{#if loading}
					<p class="lumi-text--sm lumi-text--muted">Cargando…</p>
				{:else if items.length === 0}
					<EmptyState
						title={emptyCopy.title}
						description={emptyCopy.description}
						icon={listMode === 'recent' ? 'userPlus' : 'userSearch'}
					/>
				{:else}
					<Table data={tableRows} pagination={false} hover itemsPerPage={25}>
						{#snippet thead()}
							<th>DNI</th>
							<th class="lumi-min-w--xl">Alumno</th>
							<th>Última matrícula</th>
							<th>Sede</th>
							<th class="lumi-min-w--sm"> </th>
						{/snippet}
						{#snippet row({ row })}
							{@const r = row as unknown as RegistroStudentTableRow}
							<td>{r.dni || '—'}</td>
							<td class="lumi-min-w--xl">
								<div class="lumi-person-cell">
									<Avatar
										src={r.photo_url ? buildStudentPhotoUrl(r.photo_url, 'thumb') : ''}
										text={r.full_name}
										size="sm"
										color="primary"
									/>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<span class="lumi-font--medium">{r.full_name}</span>
										<span class="lumi-text--xs lumi-text--muted">{r.phone || '—'}</span>
									</div>
								</div>
							</td>
							<td>
								<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
									<span class="lumi-text--sm">{r.latest_cycle_title || '—'}</span>
									{#if r.latest_degree_name}
										<Chip color="secondary" size="sm">
											{formatAcademicDegreeLabel(r.latest_degree_name)}
										</Chip>
									{/if}
								</div>
							</td>
							<td>{r.latest_branch_name || '—'}</td>
							<td class="lumi-min-w--sm">
								<div class="lumi-flex lumi-flex--gap-xs lumi-align-items--center lumi-justify--end">
									<Button
										type="flat"
										size="sm"
										icon="user"
										aria-label="Perfil"
										disabled={!canReadStudents}
										onclick={() => go(`/students/${r.code}`)}
									/>
									<Dropdown position="bottom-end" aria-label={`Más acciones: ${r.full_name}`}>
										{#snippet triggerContent()}
											<Button
												type="flat"
												size="sm"
												icon="moreVertical"
												aria-label={`Abrir acciones: ${r.full_name}`}
											/>
										{/snippet}
										{#snippet content()}
											<DropdownItem
												icon="edit"
												disabled={!canUpdateStudent}
												onclick={() => go(`/students/${r.code}/edit`)}
											>
												Editar alumno
											</DropdownItem>
											<DropdownItem
												icon="plus"
												disabled={!canCreateEnrollment}
												onclick={() => go(newEnrollmentHref(r.code))}
											>
												Nueva matrícula
											</DropdownItem>
											{#if r.active_enrollment_code}
												<DropdownItem
													icon="clipboardPenLine"
													disabled={!canUpdateEnrollment}
													onclick={() =>
														go(`/students/enrollments/${r.active_enrollment_code}/edit`)}
												>
													Editar matrícula
												</DropdownItem>
											{/if}
											<DropdownItem
												icon="clipboard"
												disabled={!canReadAttendance}
												onclick={() => go(`/students/${r.code}/attendance`)}
											>
												Asistencia
											</DropdownItem>
										{/snippet}
									</Dropdown>
								</div>
							</td>
						{/snippet}
					</Table>
				{/if}
			</div>
		{/if}
	</div>
</Dialog>

<style>
	.student-search-modal {
		min-block-size: var(--lumi-space-3xl);
	}

	.student-search-modal__results {
		min-block-size: var(--lumi-space-2xl);
	}
</style>
