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
		Select,
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
	import EvaluationSelectorDialog from './_components/EvaluationSelectorDialog.svelte';
	import {
		buildEvaluationSelectionUrl,
		type EvaluationSelectionValue
	} from './_components/selection';
	import type { PageData } from './$types';

	type EvaluationRow = PageData['evaluations'][number];

	const { data }: { data: PageData } = $props();

	const canRead = $derived(can('evaluations:read'));
	const canCreate = $derived(can('evaluations:create'));
	const canUpdate = $derived(can('evaluations:update'));
	const canDelete = $derived(can('evaluations:delete'));

	const filterCycleCode = $derived(data.selectedCycleCode);
	const filterCycleDegreeCode = $derived(data.selectedCycleDegreeCode);
	const filterGroupCode = $derived(data.selectedGroupCode as GroupCode);
	let showFilterDialog = $state(false);
	let showModal = $state(false);
	let showDeleteModal = $state(false);
	let isEditing = $state(false);
	let errorMessage = $state('');
	let deleteErrorMessage = $state('');
	let selectedEvaluation = $state<EvaluationRow | null>(null);

	let formName = $state('');
	let formCycleCode = $state<string | null>(null);
	let formCycleDegreeCode = $state<string | null>(null);
	let formGroupCode = $state<GroupCode>('A');
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

	function openProcessPage(evaluationCode?: string): void {
		void goto(
			resolve(
				buildEvaluationSelectionUrl('/evaluations/process', {
					cycleCode: filterCycleCode,
					cycleDegreeCode: filterCycleDegreeCode,
					groupCode: filterGroupCode,
					searchQuery: '',
					evaluationCode: evaluationCode ?? null
				}) as '/'
			)
		);
	}

	function openResultsPage(evaluationCode?: string): void {
		void goto(
			resolve(
				buildEvaluationSelectionUrl('/evaluations/results', {
					cycleCode: filterCycleCode,
					cycleDegreeCode: filterCycleDegreeCode,
					groupCode: filterGroupCode,
					searchQuery: '',
					evaluationCode: evaluationCode ?? null
				}) as '/'
			)
		);
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

	function applyDialogSelection(selection: EvaluationSelectionValue): void {
		void goto(resolve(buildEvaluationSelectionUrl('/evaluations', selection, false) as '/'));
	}
</script>

<div class="lumi-stack lumi-stack--md">
	<PageHeader
		title="Evaluaciones"
		subtitle="Gestiona evaluaciones con una vista más simple y mantén sus secciones listas para configurar claves."
		icon="clipboardPenLine"
	>
		{#snippet actions()}
			<Dropdown position="bottom-end" aria-label="Acciones de evaluaciones">
				{#snippet triggerContent()}
					<Button type="flat" color="primary" icon="moreVertical" />
				{/snippet}
				{#snippet content()}
					<DropdownItem icon="slidersHorizontal" onclick={() => (showFilterDialog = true)}>
						Seleccionar vista
					</DropdownItem>
					<DropdownItem icon="plus" onclick={openCreateModal} disabled={!canCreate}>
						Nueva evaluación
					</DropdownItem>
					<DropdownItem
						icon="imagePlus"
						onclick={() => openProcessPage()}
						disabled={!canUpdate || configuredEvaluations === 0}
					>
						Procesar hojas
					</DropdownItem>
					<DropdownItem icon="badgeCheck" onclick={() => openResultsPage()}>
						Ver resultados
					</DropdownItem>
				{/snippet}
			</Dropdown>
		{/snippet}
	</PageHeader>

	<div class="lumi-filter-summary lumi-filter-summary--secondary">
		<div class="lumi-filter-summary__copy">
			<p class="lumi-filter-summary__eyebrow">Vista actual</p>
			<h2 class="lumi-filter-summary__title">{currentCycleLabel}</h2>
			<p class="lumi-filter-summary__subtitle">
				Evaluaciones del contexto seleccionado, listas para claves, proceso y resultados.
			</p>
		</div>

		<div class="lumi-filter-summary__meta">
			<Chip color="secondary" size="sm">{currentDegreeLabel}</Chip>
			<Chip color="info" size="sm">{formatGroupCode(filterGroupCode)}</Chip>
			<Chip color="primary" size="sm">{totalEvaluations} evaluaciones</Chip>
			{#if configuredEvaluations > 0}
				<Chip color="success" size="sm">{configuredEvaluations} con claves</Chip>
			{/if}
			{#if pendingKeysEvaluations > 0}
				<Chip color="warning" size="sm">{pendingKeysEvaluations} pendientes</Chip>
			{/if}
		</div>
	</div>

	<Card spaced>
		<div class="lumi-stack lumi-stack--md">
			{#if !canRead}
				<Alert type="warning" closable>No tienes permisos para consultar evaluaciones.</Alert>
			{:else if !data.selectedCycleCode || !data.selectedCycleDegreeCode}
				<EmptyState
					title="Configura ciclo, grado y grupo"
					description="Abre el selector para elegir la vista de trabajo antes de revisar o crear evaluaciones."
					icon="slidersHorizontal"
				>
					{#snippet actions()}
						<Button
							type="filled"
							color="primary"
							icon="slidersHorizontal"
							onclick={() => (showFilterDialog = true)}
						>
							Seleccionar vista
						</Button>
					{/snippet}
				</EmptyState>
			{:else if data.evaluations.length === 0}
				<EmptyState
					title="No hay evaluaciones en esta vista"
					description="Registra la primera evaluación o cambia el filtro para revisar otro ciclo."
					icon="clipboardPenLine"
				>
					{#snippet actions()}
						<div class="lumi-flex lumi-flex--gap-sm lumi-flex--wrap">
							<Button
								type="border"
								icon="slidersHorizontal"
								onclick={() => (showFilterDialog = true)}
							>
								Cambiar vista
							</Button>
							<Button
								type="filled"
								color="primary"
								icon="plus"
								onclick={openCreateModal}
								disabled={!canCreate}
							>
								Crear evaluación
							</Button>
						</div>
					{/snippet}
				</EmptyState>
			{:else}
				<div class="lumi-section-toolbar">
					<div class="lumi-section-toolbar__copy">
						<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Listado</p>
						<h2 class="lumi-margin--none">Evaluaciones registradas</h2>
					</div>
					<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
						{plannedQuestions} preguntas planificadas en esta vista.
					</p>
				</div>

				<Table data={evaluationRows} pagination hover itemsPerPage={20}>
					{#snippet thead()}
						<th class="lumi-min-w--xl">Evaluación</th>
						<th>Nivel y grupo</th>
						<th>Fecha</th>
						<th>Secciones</th>
						<th>Claves</th>
						<th>Acciones</th>
					{/snippet}

					{#snippet row({ row })}
						{@const evaluation = row as unknown as EvaluationRow}
						<td class="lumi-min-w--xl">
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
									<DropdownItem icon="key" onclick={() => openKeysPage(evaluation.code)}>
										Configurar claves
									</DropdownItem>
									<DropdownItem
										icon="imagePlus"
										onclick={() => openProcessPage(evaluation.code)}
										disabled={!canUpdate || !evaluation.has_questions}
									>
										Procesar respuestas
									</DropdownItem>
									<DropdownItem icon="badgeCheck" onclick={() => openResultsPage(evaluation.code)}>
										Ver resultados
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

<EvaluationSelectorDialog
	bind:open={showFilterDialog}
	title="Seleccionar vista de evaluaciones"
	description="Usa pocos filtros para cambiar de ciclo, grado y grupo sin saturar la pantalla."
	cycles={data.cycles}
	cycleDegreeOptions={data.cycleDegreeOptions}
	initialCycleCode={data.selectedCycleCode}
	initialCycleDegreeCode={data.selectedCycleDegreeCode}
	initialGroupCode={data.selectedGroupCode as GroupCode}
	applyLabel="Ver evaluaciones"
	onapply={applyDialogSelection}
/>

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
					<div class="lumi-section-toolbar">
						<div class="lumi-section-toolbar__copy">
							<span class="lumi-font--medium">
								{formSections.length} cursos · {totalQuestions} preguntas
							</span>
							<span class="lumi-text--xs lumi-text--muted">
								Límite máximo: {MAX_EVALUATION_QUESTIONS} preguntas por evaluación
							</span>
						</div>
						<div class="lumi-section-toolbar__actions">
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
