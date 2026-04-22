<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import {
		Alert,
		Button,
		Card,
		Chip,
		Dialog,
		Dropdown,
		DropdownItem,
		EmptyState,
		Fieldset,
		Input,
		List,
		ListItem,
		PageHeader,
		PageSidebar,
		Select,
		StatCard,
		Table,
		type TableRow
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import type { GroupCode } from '$lib/types/education';
	import type { EvaluationSectionFormItem } from '$lib/types/evaluation';
	import {
		DEFAULT_EVALUATION_SECTION_QUESTION_COUNT,
		MAX_EVALUATION_QUESTIONS,
		GROUP_CODE_OPTIONS,
		calculateEvaluationQuestionTotal,
		formatAcademicDegreeLabel,
		formatEducationDate,
		formatDateInputValue,
		formatGroupCode,
		normalizeEvaluationSections
	} from '$lib/utils';
	import type { PageData } from './$types';

	type EvaluationRow = PageData['evaluations'][number];

	const { data }: { data: PageData } = $props();
	const getInitialFilters = () => ({
		cycleCode: data.selectedCycleCode,
		cycleDegreeCode: data.selectedCycleDegreeCode,
		groupCode: data.selectedGroupCode as GroupCode,
		searchQuery: data.searchQuery
	});
	const getInitialFormSelection = () => ({
		cycleCode: data.selectedCycleCode,
		cycleDegreeCode: data.selectedCycleDegreeCode,
		groupCode: data.selectedGroupCode as GroupCode
	});
	const initialFilters = getInitialFilters();
	const initialFormSelection = getInitialFormSelection();

	const canRead = $derived(can('evaluations:read'));
	const canCreate = $derived(can('evaluations:create'));
	const canUpdate = $derived(can('evaluations:update'));
	const canDelete = $derived(can('evaluations:delete'));

	let filterCycleCode = $state<string | null>(initialFilters.cycleCode);
	let filterCycleDegreeCode = $state<string | null>(initialFilters.cycleDegreeCode);
	let filterGroupCode = $state<GroupCode>(initialFilters.groupCode);
	let filterSearchQuery = $state(initialFilters.searchQuery);
	let showMobileSidebar = $state(false);
	let showModal = $state(false);
	let showDeleteModal = $state(false);
	let isEditing = $state(false);
	let errorMessage = $state('');
	let deleteErrorMessage = $state('');
	let selectedEvaluation = $state<EvaluationRow | null>(null);

	let formName = $state('');
	let formCycleCode = $state<string | null>(initialFormSelection.cycleCode);
	let formCycleDegreeCode = $state<string | null>(initialFormSelection.cycleDegreeCode);
	let formGroupCode = $state<GroupCode>(initialFormSelection.groupCode);
	let formEvalDate = $state('');
	let formSections = $state<EvaluationSectionFormItem[]>([]);
	let selectedCourseCode = $state<string | null>(null);
	const evaluationRows = $derived(data.evaluations as unknown as TableRow[]);

	const cycleOptions = $derived(
		data.cycles.map((cycle) => ({
			value: cycle.code,
			label: cycle.label
		}))
	);

	const filteredCycleDegreeOptions = $derived(
		data.cycleDegreeOptions
			.filter((option) => option.cycle_code === filterCycleCode)
			.map((option) => ({
				value: option.code,
				label: option.label
			}))
	);

	const formCycleDegreeOptions = $derived(
		data.cycleDegreeOptions
			.filter((option) => option.cycle_code === formCycleCode)
			.map((option) => ({
				value: option.code,
				label: option.label
			}))
	);

	const availableCourseOptions = $derived(
		data.courses
			.filter((course) => !formSections.some((section) => section.course_code === course.code))
			.map((course) => ({
				value: course.code,
				label: course.name
			}))
	);

	const currentCycleLabel = $derived(
		data.cycles.find((cycle) => cycle.code === filterCycleCode)?.label ?? 'Sin ciclo activo'
	);

	const currentDegreeOption = $derived(
		data.cycleDegreeOptions.find((option) => option.code === filterCycleDegreeCode) ?? null
	);

	const currentDegreeLabel = $derived(
		currentDegreeOption?.degree_name
			? formatAcademicDegreeLabel(currentDegreeOption.degree_name)
			: 'Sin grado'
	);

	const totalEvaluations = $derived(data.evaluations.length);
	const configuredEvaluations = $derived(
		data.evaluations.filter((evaluation) => evaluation.has_questions).length
	);
	const pendingKeysEvaluations = $derived(
		data.evaluations.filter((evaluation) => !evaluation.has_questions).length
	);
	const plannedQuestions = $derived(
		data.evaluations.reduce(
			(total, evaluation) => total + Number(evaluation.planned_question_count ?? 0),
			0
		)
	);

	const totalQuestions = $derived(calculateEvaluationQuestionTotal(formSections));
	const sectionsPayload = $derived(JSON.stringify(normalizeEvaluationSections(formSections)));
	const sectionsLocked = $derived(Boolean(isEditing && selectedEvaluation?.has_questions));
	const formCanSubmit = $derived(
		formName.trim().length > 0 &&
			Boolean(formCycleDegreeCode) &&
			Boolean(formGroupCode) &&
			formEvalDate.length > 0 &&
			formSections.length > 0 &&
			totalQuestions <= MAX_EVALUATION_QUESTIONS
	);

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

	function openKeysPage(evaluationCode: string): void {
		const returnTo = encodeURIComponent(`${page.url.pathname}${page.url.search}`);
		void goto(resolve(`/evaluations/${evaluationCode}/keys?returnTo=${returnTo}` as '/'));
	}

	function buildFilterUrl(): string {
		const entries = [
			filterCycleCode ? `cycle=${encodeURIComponent(filterCycleCode)}` : '',
			filterCycleDegreeCode ? `degree=${encodeURIComponent(filterCycleDegreeCode)}` : '',
			filterGroupCode ? `group=${encodeURIComponent(filterGroupCode)}` : '',
			filterSearchQuery.trim() ? `search=${encodeURIComponent(filterSearchQuery.trim())}` : ''
		].filter(Boolean);

		return `/evaluations${entries.length > 0 ? `?${entries.join('&')}` : ''}`;
	}

	function applyFilters(): void {
		void goto(resolve(buildFilterUrl() as '/'));
	}

	function applyFiltersAndCloseSidebar(): void {
		showMobileSidebar = false;
		applyFilters();
	}

	function clearFilters(): void {
		showMobileSidebar = false;
		void goto(resolve('/evaluations' as '/'));
	}

	function handleFilterCycleChange(value: string | number | object | null): void {
		filterCycleCode = value ? String(value) : null;
		const nextOptions = data.cycleDegreeOptions.filter(
			(option) => option.cycle_code === filterCycleCode
		);
		filterCycleDegreeCode = nextOptions[0]?.code ?? null;
	}

	function handleFormCycleChange(value: string | number | object | null): void {
		formCycleCode = value ? String(value) : null;
		const nextOptions = data.cycleDegreeOptions.filter(
			(option) => option.cycle_code === formCycleCode
		);
		formCycleDegreeCode = nextOptions[0]?.code ?? null;
	}

	function resetForm(): void {
		formName = '';
		formCycleCode = data.selectedCycleCode;
		formCycleDegreeCode = data.selectedCycleDegreeCode;
		formGroupCode = data.selectedGroupCode as GroupCode;
		formEvalDate = new Date().toISOString().slice(0, 10);
		formSections = [];
		selectedCourseCode = null;
		errorMessage = '';
	}

	function openCreateModal(): void {
		if (!canCreate) return;
		isEditing = false;
		selectedEvaluation = null;
		resetForm();
		showModal = true;
	}

	function openEditModal(evaluation: EvaluationRow): void {
		if (!canUpdate) return;
		isEditing = true;
		selectedEvaluation = evaluation;
		formName = evaluation.name;
		formCycleCode = evaluation.cycle_code;
		formCycleDegreeCode = evaluation.cycle_degree_code;
		formGroupCode = evaluation.group_code;
		formEvalDate = formatDateInputValue(evaluation.eval_date);
		formSections = evaluation.eval_sections.map((section) => ({
			course_code: section.course_code,
			course_name: section.course_name,
			order_in_eval: section.order_in_eval,
			question_count: Number(section.question_count)
		}));
		selectedCourseCode = null;
		errorMessage = '';
		showModal = true;
	}

	function openDeleteModal(evaluation: EvaluationRow): void {
		if (!canDelete) return;
		selectedEvaluation = evaluation;
		deleteErrorMessage = '';
		showDeleteModal = true;
	}

	function closeModal(): void {
		showModal = false;
		errorMessage = '';
	}

	function closeDeleteModal(): void {
		showDeleteModal = false;
		deleteErrorMessage = '';
		selectedEvaluation = null;
	}

	function addSection(): void {
		if (sectionsLocked || !selectedCourseCode) return;

		const course = data.courses.find((item) => item.code === selectedCourseCode);
		if (!course) return;

		if (totalQuestions + DEFAULT_EVALUATION_SECTION_QUESTION_COUNT > MAX_EVALUATION_QUESTIONS) {
			errorMessage = `No puedes exceder ${MAX_EVALUATION_QUESTIONS} preguntas por evaluación`;
			selectedCourseCode = null;
			return;
		}

		formSections = [
			...formSections,
			{
				course_code: course.code,
				course_name: course.name,
				order_in_eval: formSections.length + 1,
				question_count: DEFAULT_EVALUATION_SECTION_QUESTION_COUNT
			}
		];
		selectedCourseCode = null;
		errorMessage = '';
	}

	function moveSection(index: number, direction: 'up' | 'down'): void {
		if (sectionsLocked || formSections.length <= 1) return;

		const nextIndex = direction === 'up' ? index - 1 : index + 1;
		if (nextIndex < 0 || nextIndex >= formSections.length) return;

		const updated = [...formSections];
		[updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
		formSections = updated.map((section, position) => ({
			...section,
			order_in_eval: position + 1
		}));
	}

	function removeSection(index: number): void {
		if (sectionsLocked) return;

		formSections = formSections
			.filter((_, position) => position !== index)
			.map((section, position) => ({
				...section,
				order_in_eval: position + 1
			}));
		errorMessage = '';
	}

	function changeQuestionCount(index: number, delta: number): void {
		if (sectionsLocked) return;

		const current = formSections[index];
		if (!current) return;

		const nextValue = current.question_count + delta;
		const projectedTotal = totalQuestions - current.question_count + nextValue;

		if (nextValue < 1) return;
		if (projectedTotal > MAX_EVALUATION_QUESTIONS) {
			errorMessage = `No puedes exceder ${MAX_EVALUATION_QUESTIONS} preguntas por evaluación`;
			return;
		}

		formSections = formSections.map((section, position) =>
			position === index ? { ...section, question_count: nextValue } : section
		);
		errorMessage = '';
	}

	$effect(() => {
		if (!showModal) {
			filterCycleCode = data.selectedCycleCode;
			filterCycleDegreeCode = data.selectedCycleDegreeCode;
			filterGroupCode = data.selectedGroupCode as GroupCode;
			filterSearchQuery = data.searchQuery;
		}
	});
</script>

<div class="lumi-stack lumi-stack--md">
	<PageHeader
		title="Evaluaciones"
		subtitle="Gestiona evaluaciones por filtros inteligentes y mantén sus secciones listas para configurar claves"
		icon="clipboardPenLine"
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
					aria-label="Abrir filtros de evaluaciones"
				/>
				<Button
					type="filled"
					color="primary"
					icon="plus"
					onclick={openCreateModal}
					disabled={!canCreate}
				>
					Nueva evaluación
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<div class="lumi-layout--two-columns lumi-page-sidebar-layout">
		<PageSidebar
			bind:mobileOpen={showMobileSidebar}
			mobileTitle="Filtros de evaluaciones"
			mobileAriaLabel="Cerrar filtros de evaluaciones"
		>
			{#snippet sidebar()}
				<div class="lumi-page-sidebar__section">
					<p class="lumi-page-sidebar__label">Vista actual</p>
					<h2 class="lumi-margin--none">{currentCycleLabel}</h2>
					<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
						<Chip color="secondary" size="sm">{currentDegreeLabel}</Chip>
						<Chip color="info" size="sm">{formatGroupCode(filterGroupCode)}</Chip>
						{#if filterSearchQuery.trim()}
							<Chip color="primary" size="sm" icon="search">{filterSearchQuery.trim()}</Chip>
						{/if}
					</div>
				</div>

				<div class="lumi-page-sidebar__section">
					<p class="lumi-page-sidebar__label">Filtros</p>
					<Select
						bind:value={filterCycleCode}
						label="Ciclo"
						options={cycleOptions}
						placeholder="Seleccione un ciclo"
						onchange={handleFilterCycleChange}
					/>
					<Select
						bind:value={filterCycleDegreeCode}
						label="Grado"
						options={filteredCycleDegreeOptions}
						placeholder="Seleccione un grado"
						disabled={!filterCycleCode}
					/>
					<Select
						bind:value={filterGroupCode}
						label="Grupo"
						options={GROUP_CODE_OPTIONS}
						clearable={false}
					/>
				</div>

				<div class="lumi-page-sidebar__section">
					<p class="lumi-page-sidebar__label">Buscar evaluación</p>
					<Input
						bind:value={filterSearchQuery}
						label="Nombre, ciclo o grado"
						placeholder="Escribe para filtrar"
						icon="search"
					/>
				</div>

				<div class="lumi-page-sidebar__section">
					<p class="lumi-page-sidebar__label">Acciones</p>
					<div class="lumi-stack lumi-stack--xs">
						<Button
							type="filled"
							color="primary"
							icon="search"
							onclick={applyFiltersAndCloseSidebar}
						>
							Aplicar filtros
						</Button>
						<Button type="border" onclick={clearFilters}>Limpiar</Button>
					</div>
				</div>
			{/snippet}
		</PageSidebar>

		<section class="lumi-layout--content-right">
			<div class="lumi-stack lumi-stack--sm">
				<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-md">
					<StatCard
						title="Evaluaciones"
						value={String(totalEvaluations)}
						icon="clipboardPenLine"
						color="primary"
						subtitle="Registros consultados"
					/>
					<StatCard
						title="Con claves"
						value={String(configuredEvaluations)}
						icon="key"
						color="success"
						subtitle="Evaluaciones listas para corrección"
					/>
					<StatCard
						title="Pendientes"
						value={String(pendingKeysEvaluations)}
						icon="clock"
						color="warning"
						subtitle="Aún requieren configurar claves"
					/>
					<StatCard
						title="Preguntas"
						value={String(plannedQuestions)}
						icon="listChecks"
						color="info"
						subtitle="Total planificado en esta vista"
					/>
				</div>

				<Card spaced>
					<div class="lumi-stack lumi-stack--md">
						<div
							class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--gap-sm lumi-flex--wrap"
						>
							<div class="lumi-stack lumi-stack--2xs">
								<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Panel operativo</p>
								<h2 class="lumi-margin--none">{currentCycleLabel}</h2>
								<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
									{currentDegreeLabel} · {formatGroupCode(filterGroupCode)}
									{#if filterSearchQuery.trim()}
										· Búsqueda activa: "{filterSearchQuery.trim()}"
									{/if}
								</p>
							</div>

							<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
								<Chip color="secondary" size="sm">{currentDegreeLabel}</Chip>
								<Chip color="info" size="sm">{formatGroupCode(filterGroupCode)}</Chip>
								{#if filterSearchQuery.trim()}
									<Chip color="primary" size="sm" icon="search">{filterSearchQuery.trim()}</Chip>
								{/if}
							</div>
						</div>

						{#if !canRead}
							<Alert type="warning" closable>No tienes permisos para consultar evaluaciones.</Alert>
						{:else if !data.selectedCycleCode || !data.selectedCycleDegreeCode}
							<EmptyState
								title="Configura ciclo, grado y grupo"
								description="Selecciona un nivel académico para trabajar las evaluaciones de forma ordenada."
								icon="slidersHorizontal"
							/>
						{:else if data.evaluations.length === 0}
							<EmptyState
								title="No hay evaluaciones en esta vista"
								description="Registra la primera evaluación para después configurar sus claves."
								icon="clipboardPenLine"
							>
								{#snippet actions()}
									<Button
										type="filled"
										color="primary"
										icon="plus"
										onclick={openCreateModal}
										disabled={!canCreate}
									>
										Crear evaluación
									</Button>
								{/snippet}
							</EmptyState>
						{:else}
							<Table data={evaluationRows} pagination hover itemsPerPage={20}>
								{#snippet thead()}
									<th>Evaluación</th>
									<th>Nivel y grupo</th>
									<th>Fecha</th>
									<th>Secciones</th>
									<th>Claves</th>
									<th>Acciones</th>
								{/snippet}

								{#snippet row({ row })}
									{@const evaluation = row as unknown as EvaluationRow}
									<td>
										<div class="lumi-stack lumi-stack--2xs">
											<span class="lumi-font--medium">{evaluation.name}</span>
											<span class="lumi-text--xs lumi-text--muted">
												{evaluation.section_count} cursos ·
												{evaluation.planned_question_count} preguntas planificadas
											</span>
										</div>
									</td>
									<td>
										<div class="lumi-stack lumi-stack--2xs">
											<span class="lumi-font--medium">{evaluation.cycle_title}</span>
											<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
												<Chip color="secondary" size="sm">
													{formatAcademicDegreeLabel(evaluation.degree_name)}
												</Chip>
												<Chip color="info" size="sm">
													{formatGroupCode(evaluation.group_code)}
												</Chip>
											</div>
										</div>
									</td>
									<td>{formatEducationDate(evaluation.eval_date)}</td>
									<td>
										<Chip color="primary" size="sm">
											{evaluation.section_count} secciones
										</Chip>
									</td>
									<td>
										<Chip color={evaluation.has_questions ? 'success' : 'warning'} size="sm">
											{evaluation.configured_question_count}/{evaluation.planned_question_count}
										</Chip>
									</td>
									<td>
										<Dropdown position="bottom-end" aria-label={`Acciones para ${evaluation.name}`}>
											{#snippet triggerContent()}
												<Button
													type="flat"
													size="sm"
													icon="moreVertical"
													aria-label={`Abrir acciones para ${evaluation.name}`}
												/>
											{/snippet}

											{#snippet content()}
												<DropdownItem
													icon="key"
													color="info"
													onclick={() => openKeysPage(evaluation.code)}
												>
													Configurar claves
												</DropdownItem>
												<DropdownItem
													icon="edit"
													onclick={() => openEditModal(evaluation)}
													disabled={!canUpdate}
												>
													Editar evaluación
												</DropdownItem>
												<DropdownItem
													icon="trash"
													color="danger"
													onclick={() => openDeleteModal(evaluation)}
													disabled={!canDelete}
												>
													Eliminar evaluación
												</DropdownItem>
											{/snippet}
										</Dropdown>
									</td>
								{/snippet}
							</Table>
						{/if}
					</div>
				</Card>
			</div>
		</section>
	</div>
</div>

<Dialog
	bind:open={showModal}
	title={isEditing ? 'Editar evaluación' : 'Registrar evaluación'}
	size="lg"
	scrollable
>
	<form
		id="evaluation-form"
		method="POST"
		action="?/{isEditing ? 'update' : 'create'}"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					await invalidate('evaluations:load');
					showToast(
						isEditing
							? 'Evaluación actualizada exitosamente'
							: 'Evaluación registrada exitosamente',
						'success'
					);
					closeModal();
					return;
				}

				if (result.type === 'failure') {
					errorMessage = getActionError(result) ?? 'Ocurrió un error';
				}
			};
		}}
	>
		{#if isEditing && selectedEvaluation}
			<input type="hidden" name="code" value={selectedEvaluation.code} />
		{/if}

		<input type="hidden" name="sections" value={sectionsPayload} />

		{#if errorMessage}
			<Alert type="danger" closable onclose={() => (errorMessage = '')}>
				{errorMessage}
			</Alert>
		{/if}

		<div class="lumi-stack lumi-stack--md">
			<Fieldset legend="Información general">
				<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
					<Input
						bind:value={formName}
						name="name"
						label="Nombre de la evaluación"
						placeholder="Ej. Simulacro parcial"
						required
					/>
					<Input bind:value={formEvalDate} name="eval_date" type="date" label="Fecha" required />
					<Select
						bind:value={formCycleCode}
						label="Ciclo"
						options={cycleOptions}
						placeholder="Seleccione un ciclo"
						onchange={handleFormCycleChange}
					/>
					<Select
						bind:value={formCycleDegreeCode}
						name="cycle_degree_code"
						label="Grado"
						options={formCycleDegreeOptions}
						placeholder="Seleccione un grado"
						disabled={!formCycleCode}
					/>
					<Select
						bind:value={formGroupCode}
						name="group_code"
						label="Grupo"
						options={GROUP_CODE_OPTIONS}
						clearable={false}
					/>
				</div>
			</Fieldset>

			{#if sectionsLocked}
				<Alert type="info" closable={false}>
					Las secciones quedaron bloqueadas porque esta evaluación ya tiene claves configuradas.
					Puedes actualizar nombre, nivel, grupo y fecha sin perder la estructura existente.
				</Alert>
			{/if}

			<Fieldset legend="Secciones de la evaluación">
				<div class="lumi-stack lumi-stack--sm">
					<div
						class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--gap-sm lumi-flex--wrap"
					>
						<div class="lumi-stack lumi-stack--2xs">
							<span class="lumi-font--medium">
								{formSections.length} cursos · {totalQuestions} preguntas
							</span>
							<span class="lumi-text--xs lumi-text--muted">
								Límite máximo: {MAX_EVALUATION_QUESTIONS} preguntas por evaluación
							</span>
						</div>
						<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
							<Chip color="primary" size="sm">{formSections.length} secciones</Chip>
							<Chip
								color={totalQuestions >= MAX_EVALUATION_QUESTIONS ? 'warning' : 'success'}
								size="sm"
							>
								{totalQuestions}/{MAX_EVALUATION_QUESTIONS} preguntas
							</Chip>
						</div>
					</div>

					{#if formSections.length === 0}
						<EmptyState
							title="Aún no agregas cursos"
							description="Empieza seleccionando un curso para construir la estructura exacta de la evaluación."
							icon="bookOpenCheck"
						/>
					{:else}
						<List size="sm">
							{#each formSections as section, index (section.course_code)}
								<ListItem icon="bookOpenCheck">
									{#snippet titleSlot()}
										<div
											class="lumi-flex lumi-align-items--center lumi-flex--gap-xs lumi-flex--wrap"
										>
											<span>{section.course_name}</span>
											<Chip color="secondary" size="sm">Orden {section.order_in_eval}</Chip>
										</div>
									{/snippet}

									{#snippet subtitleSlot()}
										{section.question_count} preguntas configuradas para este curso
									{/snippet}

									<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap lumi-align-items--center">
										<Button
											type="flat"
											size="sm"
											icon="minus"
											onclick={() => changeQuestionCount(index, -1)}
											disabled={sectionsLocked || section.question_count <= 1}
										/>
										<Chip color="info" size="sm">
											{section.question_count} preguntas
										</Chip>
										<Button
											type="flat"
											size="sm"
											icon="plus"
											onclick={() => changeQuestionCount(index, 1)}
											disabled={sectionsLocked || totalQuestions >= MAX_EVALUATION_QUESTIONS}
										/>
										<Button
											type="flat"
											size="sm"
											icon="chevronUp"
											onclick={() => moveSection(index, 'up')}
											disabled={sectionsLocked || index === 0}
										/>
										<Button
											type="flat"
											size="sm"
											icon="chevronDown"
											onclick={() => moveSection(index, 'down')}
											disabled={sectionsLocked || index === formSections.length - 1}
										/>
										<Button
											type="flat"
											size="sm"
											color="danger"
											icon="trash"
											onclick={() => removeSection(index)}
											disabled={sectionsLocked}
										/>
									</div>
								</ListItem>
							{/each}
						</List>
					{/if}

					<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
						<Select
							bind:value={selectedCourseCode}
							label="Agregar curso"
							options={availableCourseOptions}
							placeholder="Selecciona un curso"
							disabled={sectionsLocked || availableCourseOptions.length === 0}
						/>
						<div class="lumi-flex lumi-align-items--end">
							<Button
								type="border"
								color="primary"
								icon="plus"
								onclick={addSection}
								disabled={sectionsLocked || !selectedCourseCode}
							>
								Agregar sección
							</Button>
						</div>
					</div>
				</div>
			</Fieldset>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeModal}>Cancelar</Button>
		<Button
			type="filled"
			color="primary"
			disabled={!formCanSubmit}
			onclick={() => submitForm('evaluation-form')}
		>
			{isEditing ? 'Actualizar evaluación' : 'Registrar evaluación'}
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showDeleteModal} title="Confirmar eliminación" size="sm">
	<form
		id="delete-evaluation-form"
		method="POST"
		action="?/delete"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					await invalidate('evaluations:load');
					showToast('Evaluación eliminada exitosamente', 'success');
					closeDeleteModal();
					return;
				}

				if (result.type === 'failure') {
					deleteErrorMessage = getActionError(result) ?? 'No se pudo eliminar la evaluación';
				}
			};
		}}
	>
		{#if selectedEvaluation}
			<input type="hidden" name="code" value={selectedEvaluation.code} />
			{#if deleteErrorMessage}
				<Alert type="danger" closable onclose={() => (deleteErrorMessage = '')}>
					{deleteErrorMessage}
				</Alert>
			{/if}
			<p class="lumi-margin--none">
				¿Estás seguro de que deseas eliminar la evaluación <strong>{selectedEvaluation.name}</strong
				>? Esta acción también quitará sus secciones y claves configuradas.
			</p>
		{/if}
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeDeleteModal}>Cancelar</Button>
		<Button
			type="filled"
			color="danger"
			disabled={!canDelete || !selectedEvaluation}
			onclick={() => submitForm('delete-evaluation-form')}
		>
			Eliminar
		</Button>
	{/snippet}
</Dialog>
