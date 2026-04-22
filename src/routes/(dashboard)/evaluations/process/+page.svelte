<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import { SvelteMap } from 'svelte/reactivity';
	import {
		Alert,
		Avatar,
		Button,
		Card,
		Chip,
		EmptyState,
		FileUpload,
		Image as LumiImage,
		Input,
		PageHeader,
		PageSidebar,
		Progress,
		Select,
		StatCard,
		type FileUploadFile
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import type { GroupCode } from '$lib/types/education';
	import type {
		EvaluationProcessingBatchResponse,
		EvaluationProcessingErrorData,
		EvaluationProcessingSavePayload,
		EvaluationProcessingSuccessData
	} from '$lib/types/evaluation';
	import {
		buildStudentPhotoUrl,
		formatAcademicDegreeLabel,
		formatEducationDate,
		formatGroupCode,
		GROUP_CODE_OPTIONS,
		validateEvaluationSheetProportion
	} from '$lib/utils';
	import EvaluationProcessDetailsDialog from './EvaluationProcessDetailsDialog.svelte';
	import type { PageData } from './$types';

	interface ProcessFileEntry {
		id: string;
		file: File;
		status: 'pending' | 'processing' | 'success' | 'error';
		result: EvaluationProcessingSuccessData | null;
		error: EvaluationProcessingErrorData | null;
		saved: boolean;
		formatValid: boolean;
		formatName: string;
	}

	const { data }: { data: PageData } = $props();

	let filterCycleCode = $derived(data.selectedCycleCode);
	let filterCycleDegreeCode = $derived(data.selectedCycleDegreeCode);
	let filterGroupCode = $derived(data.selectedGroupCode as GroupCode);
	let filterSearchQuery = $derived(data.searchQuery);
	let showMobileSidebar = $state(false);
	let uploadQueue = $state<FileUploadFile[]>([]);
	let fileEntries = $state<ProcessFileEntry[]>([]);
	let selectedFileId = $state<string | null>(null);
	let showDetailsDialog = $state(false);
	let currentPreviewUrl = $state('');
	let isProcessingBatch = $state(false);
	let isSavingBatch = $state(false);
	let isDeletingSavedResults = $state(false);
	let requestError = $state('');
	let saveErrors = $state<string[]>([]);
	let batchProgress = $state({ processed: 0, total: 0 });
	let batchStartedAt = $state(0);
	let batchAbortController = $state<AbortController | null>(null);

	const canUpdate = $derived(can('evaluations:update'));
	const currentEvaluation = $derived(data.selectedEvaluation);
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
	const evaluationOptions = $derived(
		data.evaluations.map((evaluation) => ({
			value: evaluation.code,
			label: `${evaluation.name} · ${formatEducationDate(evaluation.eval_date)} · ${evaluation.planned_question_count} preguntas`
		}))
	);
	const selectedFile = $derived(
		selectedFileId ? fileEntries.find((entry) => entry.id === selectedFileId) ?? null : null
	);
	let selectedManualRollCode = $derived(getSelectedRollCode(selectedFile));
	const pendingEntries = $derived(fileEntries.filter((entry) => entry.status === 'pending'));
	const processablePendingEntries = $derived(
		pendingEntries.filter((entry) => entry.formatValid)
	);
	const successEntries = $derived(fileEntries.filter((entry) => entry.status === 'success'));
	const unresolvedEntries = $derived(
		successEntries.filter((entry) => !entry.result?.enrollment_code)
	);
	const saveableEntries = $derived(
		successEntries.filter((entry) => entry.result?.enrollment_code && !entry.saved)
	);
	const duplicateEnrollmentCodes = $derived.by(() => {
		const counts = new SvelteMap<string, number>();

		for (const entry of saveableEntries) {
			const enrollmentCode = entry.result?.enrollment_code;
			if (!enrollmentCode) continue;
			counts.set(enrollmentCode, (counts.get(enrollmentCode) ?? 0) + 1);
		}

		return new Set(
			Array.from(counts.entries())
				.filter(([, count]) => count > 1)
				.map(([enrollmentCode]) => enrollmentCode)
		);
	});
	const issueMessages = $derived.by(() => {
		const messages: string[] = [];

		const invalidFormatCount = fileEntries.filter((entry) => !entry.formatValid).length;
		if (invalidFormatCount > 0) {
			messages.push(
				`${invalidFormatCount} hoja(s) tienen una proporción diferente a A5 vertical.`
			);
		}

		if (unresolvedEntries.length > 0) {
			messages.push(
				`${unresolvedEntries.length} hoja(s) se procesaron, pero no tienen una matrícula válida asociada.`
			);
		}

		if (duplicateEnrollmentCodes.size > 0) {
			messages.push(
				'Se detectaron hojas duplicadas para la misma matrícula. Limpia o separa los duplicados antes de guardar.'
			);
		}

		return messages;
	});
	const canProcessBatch = $derived(
		Boolean(currentEvaluation) &&
			canUpdate &&
			!isProcessingBatch &&
			!isSavingBatch &&
			processablePendingEntries.length > 0
	);
	const canSaveResults = $derived(
		Boolean(currentEvaluation) &&
			canUpdate &&
			!isProcessingBatch &&
			!isSavingBatch &&
			saveableEntries.length > 0 &&
			duplicateEnrollmentCodes.size === 0
	);
	const estimatedTime = $derived.by(() => {
		if (!isProcessingBatch || batchProgress.processed === 0 || batchProgress.total === 0) {
			return '';
		}

		const elapsed = Date.now() - batchStartedAt;
		const average = elapsed / batchProgress.processed;
		const remaining = (batchProgress.total - batchProgress.processed) * average;

		if (remaining < 60_000) {
			return `${Math.ceil(remaining / 1000)} s restantes`;
		}

		return `${Math.ceil(remaining / 60_000)} min restantes`;
	});
	const savePayloadJson = $derived(
		JSON.stringify({
			evaluation_code: currentEvaluation?.code ?? '',
			results: saveableEntries.map((entry) => ({
				enrollment_code: entry.result?.enrollment_code ?? '',
				roll_code: entry.result?.roll_code ?? '',
				answers:
					entry.result?.answers.map((answer) => ({
						question_code: answer.question_code,
						student_answer: answer.student_answer
					})) ?? []
			}))
		} satisfies EvaluationProcessingSavePayload)
	);

	function getEntryStatus(entry: ProcessFileEntry): {
		label: string;
		color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
		message: string;
	} {
		if (entry.status === 'processing') {
			return {
				label: 'Procesando',
				color: 'info',
				message: 'Analizando hoja y comparando respuestas'
			};
		}

		if (entry.status === 'success') {
			if (entry.result?.enrollment_code) {
				return {
					label: entry.saved ? 'Guardada' : 'Lista',
					color: entry.saved ? 'success' : 'primary',
					message: entry.saved
						? 'El resultado ya fue persistido en la base de datos'
						: `Nota ${entry.result.scores.general.score.toFixed(2)} / 20`
				};
			}

			return {
				label: 'Sin matrícula',
				color: 'warning',
				message: 'No se encontró una matrícula válida para guardar esta hoja'
			};
		}

		if (entry.status === 'error') {
			return {
				label: 'Error',
				color: 'danger',
				message: entry.error?.message ?? 'No se pudo procesar la hoja'
			};
		}

		return {
			label: 'Pendiente',
			color: entry.formatValid ? 'primary' : 'warning',
			message: entry.formatValid
				? 'Lista para procesar'
				: 'La proporción detectada no coincide con A5 vertical'
		};
	}

	function getSelectedRollCode(entry: ProcessFileEntry | null): string {
		return entry?.result?.roll_code ?? entry?.error?.roll_code ?? '';
	}

	function getActionError(result: { type?: string; data?: Record<string, unknown> }): string | null {
		const error = result.data?.error;
		return typeof error === 'string' && error.trim().length > 0 ? error.trim() : null;
	}

	function extractSavedEnrollmentCodes(result: {
		type?: string;
		data?: Record<string, unknown>;
	}): string[] {
		const codes = result.data?.savedEnrollmentCodes;

		if (!Array.isArray(codes)) {
			return [];
		}

		return codes.filter((value): value is string => typeof value === 'string' && value.length > 0);
	}

	function extractSaveErrors(result: {
		type?: string;
		data?: Record<string, unknown>;
	}): string[] {
		const errors = result.data?.errors;

		if (!Array.isArray(errors)) {
			return [];
		}

		return errors.filter((value): value is string => typeof value === 'string' && value.length > 0);
	}

	function handleFilterCycleChange(value: string | number | object | null): void {
		filterCycleCode = value ? String(value) : null;
		const nextOptions = data.cycleDegreeOptions.filter(
			(option) => option.cycle_code === filterCycleCode
		);
		filterCycleDegreeCode = nextOptions[0]?.code ?? null;
	}

	function buildFilterUrl(nextEvaluationCode: string | null = data.selectedEvaluationCode): string {
		const entries = [
			filterCycleCode ? `cycle=${encodeURIComponent(filterCycleCode)}` : '',
			filterCycleDegreeCode ? `degree=${encodeURIComponent(filterCycleDegreeCode)}` : '',
			filterGroupCode ? `group=${encodeURIComponent(filterGroupCode)}` : '',
			filterSearchQuery.trim() ? `search=${encodeURIComponent(filterSearchQuery.trim())}` : '',
			nextEvaluationCode ? `evaluation=${encodeURIComponent(nextEvaluationCode)}` : ''
		].filter(Boolean);

		return `/evaluations/process${entries.length > 0 ? `?${entries.join('&')}` : ''}`;
	}

	function applyFilters(): void {
		void goto(resolve(buildFilterUrl(null) as '/'));
	}

	function applyFiltersAndCloseSidebar(): void {
		showMobileSidebar = false;
		applyFilters();
	}

	function clearFilters(): void {
		showMobileSidebar = false;
		void goto(resolve('/evaluations/process' as '/'));
	}

	function handleEvaluationChange(value: string | number | object | null): void {
		if (fileEntries.length > 0) {
			showToast('Limpia las hojas cargadas antes de cambiar de evaluación', 'warning');
			return;
		}

		const evaluationCode = value ? String(value) : null;
		void goto(resolve(buildFilterUrl(evaluationCode) as '/'));
	}

	function selectFile(entryId: string): void {
		selectedFileId = entryId;
	}

	function markEntriesAsSaved(enrollmentCodes: string[]): void {
		if (enrollmentCodes.length === 0) {
			return;
		}

		const enrollmentCodeSet = new Set(enrollmentCodes);
		fileEntries = fileEntries.map((entry) => {
			const enrollmentCode = entry.result?.enrollment_code;
			return enrollmentCode && enrollmentCodeSet.has(enrollmentCode)
				? { ...entry, saved: true }
				: entry;
		});
	}

	async function readAndOptimizeImage(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = () => {
				if (!browser) {
					resolve(String(reader.result ?? ''));
					return;
				}

				const image = new window.Image();

				image.onload = () => {
					const canvas = document.createElement('canvas');
					const context = canvas.getContext('2d');

					if (!context) {
						resolve(String(reader.result ?? ''));
						return;
					}

					const maxWidth = 1240;
					const maxHeight = 1748;
					let width = image.width;
					let height = image.height;

					if (width > maxWidth || height > maxHeight) {
						const ratio = Math.min(maxWidth / width, maxHeight / height);
						width = Math.floor(width * ratio);
						height = Math.floor(height * ratio);
					}

					canvas.width = width;
					canvas.height = height;
					context.drawImage(image, 0, 0, width, height);
					resolve(canvas.toDataURL('image/jpeg', 0.85));
				};

				image.onerror = () => reject(new Error('No se pudo optimizar la imagen seleccionada'));
				image.src = String(reader.result ?? '');
			};

			reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada'));
			reader.readAsDataURL(file);
		});
	}

	async function validateImageFormat(file: File): Promise<{ formatValid: boolean; formatName: string }> {
		if (!browser) {
			return { formatValid: true, formatName: 'A5 Vertical' };
		}

		const url = URL.createObjectURL(file);

		try {
			const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
				const image = new window.Image();
				image.onload = () =>
					resolve({
						width: image.naturalWidth,
						height: image.naturalHeight
					});
				image.onerror = () => reject(new Error('No se pudo leer el tamaño de la imagen'));
				image.src = url;
			});

			const validation = validateEvaluationSheetProportion(dimensions.width, dimensions.height);
			return {
				formatValid: validation.isValid,
				formatName: validation.format
			};
		} catch {
			return {
				formatValid: true,
				formatName: 'A5 Vertical'
			};
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	async function ingestUploadFiles(files: FileUploadFile[]): Promise<void> {
		if (!currentEvaluation) {
			uploadQueue = [];
			showToast('Selecciona una evaluación antes de cargar imágenes', 'warning');
			return;
		}

		if (files.length === 0) {
			return;
		}

		const nextEntries: ProcessFileEntry[] = [];
		let invalidFormatCount = 0;

		for (const fileWrapper of files) {
			const validation = await validateImageFormat(fileWrapper.file);
			if (!validation.formatValid) {
				invalidFormatCount += 1;
			}

			nextEntries.push({
				id: fileWrapper.id,
				file: fileWrapper.file,
				status: 'pending',
				result: null,
				error: null,
				saved: false,
				formatValid: validation.formatValid,
				formatName: validation.formatName
			});
		}

		fileEntries = [...fileEntries, ...nextEntries];
		selectedFileId = nextEntries.at(-1)?.id ?? selectedFileId;
		uploadQueue = [];
		requestError = '';
		saveErrors = [];

		showToast(
			invalidFormatCount > 0
				? `${nextEntries.length} hoja(s) cargadas. ${invalidFormatCount} requieren corrección de formato.`
				: `${nextEntries.length} hoja(s) cargadas correctamente.`,
			invalidFormatCount > 0 ? 'warning' : 'info'
		);
	}

	function handleUploadChange(files: FileUploadFile[]): void {
		void ingestUploadFiles(files);
	}

	function removeFile(entryId: string): void {
		fileEntries = fileEntries.filter((entry) => entry.id !== entryId);
		if (selectedFileId === entryId) {
			selectedFileId = fileEntries[0]?.id ?? null;
		}
	}

	function clearFiles(): void {
		fileEntries = [];
		selectedFileId = null;
		selectedManualRollCode = '';
		requestError = '';
		saveErrors = [];
	}

	async function processFile(entryId: string, manualRollCode?: string): Promise<void> {
		const entryIndex = fileEntries.findIndex((entry) => entry.id === entryId);

		if (entryIndex === -1 || !currentEvaluation || !canUpdate) {
			return;
		}

		const entry = fileEntries[entryIndex];

		if (!entry.formatValid) {
			showToast('La hoja seleccionada requiere formato A5 vertical antes de procesarse', 'warning');
			return;
		}

		const normalizedRollCode = manualRollCode?.trim() ?? '';
		if (normalizedRollCode && !/^\d{4}$/.test(normalizedRollCode)) {
			showToast('El código de lista manual debe tener 4 dígitos', 'warning');
			return;
		}

		fileEntries = fileEntries.map((current, index) =>
			index === entryIndex
				? {
						...current,
						status: 'processing',
						result: null,
						error: null,
						saved: false
					}
				: current
		);
		requestError = '';
		saveErrors = [];

		try {
			const imageData = await readAndOptimizeImage(entry.file);
			const response = await fetch('/api/evaluations/omr-batch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					evaluationCode: currentEvaluation.code,
					items: [
						{
							id: entry.id,
							imageData,
							...(normalizedRollCode ? { rollCode: normalizedRollCode } : {})
						}
					]
				})
			});

			const payload = (await response.json()) as EvaluationProcessingBatchResponse;

			if (!response.ok || !payload.success || payload.results.length === 0) {
				throw new Error(payload.error?.message || 'No se pudo procesar la hoja seleccionada');
			}

			const result = payload.results[0];

			fileEntries = fileEntries.map((current) => {
				if (current.id !== entry.id) return current;

				return result.success
					? {
							...current,
							status: 'success',
							result: result.data ?? null,
							error: null,
							saved: false
						}
					: {
							...current,
							status: 'error',
							result: null,
							error: result.error ?? null,
							saved: false
						};
			});

			selectedFileId = entry.id;
			showToast(
				result.success
					? result.data?.student
						? `Hoja procesada para ${result.data.student.full_name}`
						: `Hoja procesada. Código ${result.data?.roll_code ?? 'sin detectar'}`
					: result.error?.message || 'La hoja no pudo procesarse',
				result.success ? 'success' : 'warning'
			);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'No se pudo procesar la hoja seleccionada';

			fileEntries = fileEntries.map((current) =>
				current.id === entry.id
					? {
							...current,
							status: 'error',
							result: null,
							error: {
								code: 'INTERNAL_ERROR',
								message
							},
							saved: false
						}
					: current
			);

			showToast(message, 'error');
		}
	}

	async function processAllPendingFiles(): Promise<void> {
		if (!currentEvaluation || !canProcessBatch) {
			return;
		}

		const entries = [...processablePendingEntries];
		const chunkSize = Math.min(10, entries.length);

		isProcessingBatch = true;
		batchStartedAt = Date.now();
		batchProgress = { processed: 0, total: entries.length };
		batchAbortController = new AbortController();
		requestError = '';
		saveErrors = [];

		fileEntries = fileEntries.map((entry) =>
			entry.status === 'pending' && entry.formatValid
				? {
						...entry,
						status: 'processing',
						result: null,
						error: null,
						saved: false
					}
				: entry
		);

		try {
			for (let index = 0; index < entries.length; index += chunkSize) {
				const chunk = entries.slice(index, index + chunkSize);
				const batchItems = await Promise.all(
					chunk.map(async (entry) => ({
						id: entry.id,
						imageData: await readAndOptimizeImage(entry.file)
					}))
				);

				const response = await fetch('/api/evaluations/omr-batch', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					signal: batchAbortController.signal,
					body: JSON.stringify({
						evaluationCode: currentEvaluation.code,
						items: batchItems
					})
				});

				const payload = (await response.json()) as EvaluationProcessingBatchResponse;

				if (!response.ok || !payload.success) {
					throw new Error(payload.error?.message || 'No se pudo procesar el lote actual');
				}

				const resultsById = new Map(payload.results.map((result) => [result.id, result]));

				fileEntries = fileEntries.map((entry) => {
					const result = resultsById.get(entry.id);

					if (!result) {
						return entry;
					}

					batchProgress = {
						...batchProgress,
						processed: batchProgress.processed + 1
					};

					return result.success
						? {
								...entry,
								status: 'success',
								result: result.data ?? null,
								error: null,
								saved: false
							}
						: {
								...entry,
								status: 'error',
								result: null,
								error: result.error ?? null,
								saved: false
							};
				});
			}

			showToast('El lote de hojas fue procesado correctamente', 'success');
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				showToast('El procesamiento por lotes fue cancelado', 'info');
			} else {
				const message =
					error instanceof Error ? error.message : 'Ocurrió un error durante el procesamiento';
				requestError = message;
				showToast(message, 'error');
			}

			fileEntries = fileEntries.map((entry) =>
				entry.status === 'processing' ? { ...entry, status: 'pending' } : entry
			);
		} finally {
			isProcessingBatch = false;
			batchAbortController = null;
			batchProgress = { processed: 0, total: 0 };
			batchStartedAt = 0;
		}
	}

	function cancelProcessing(): void {
		batchAbortController?.abort();
	}

	async function clearSavedResults(): Promise<void> {
		if (!currentEvaluation || data.savedResultsCount === 0) {
			return;
		}

		if (!window.confirm('Se eliminarán todos los resultados guardados de esta evaluación.')) {
			return;
		}

		isDeletingSavedResults = true;

		try {
			const response = await fetch(`/api/evaluations/${currentEvaluation.code}/results`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ resultCodes: [] })
			});
			const payload = (await response.json().catch(() => ({}))) as {
				message?: string;
				error?: string;
			};

			if (!response.ok) {
				throw new Error(payload.error || 'No se pudieron limpiar los resultados guardados');
			}

			fileEntries = fileEntries.map((entry) => ({ ...entry, saved: false }));
			await invalidate('evaluations:process:load');
			showToast(payload.message || 'Los resultados guardados fueron eliminados', 'success');
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'No se pudieron limpiar los resultados guardados';
			showToast(message, 'error');
		} finally {
			isDeletingSavedResults = false;
		}
	}

	$effect(() => {
		if (!browser || !selectedFile?.file) {
			currentPreviewUrl = '';
			return;
		}

		const objectUrl = URL.createObjectURL(selectedFile.file);
		currentPreviewUrl = objectUrl;

		return () => {
			URL.revokeObjectURL(objectUrl);
		};
	});

</script>

<div class="lumi-stack lumi-stack--md">
	<PageHeader
		title="Procesar evaluaciones"
		subtitle="Carga hojas escaneadas, procesa respuestas OMR y guarda resultados válidos en una sola operación"
		icon="imagePlus"
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
					aria-label="Abrir filtros de procesamiento"
				/>
					<Button
						type="border"
						icon="arrowLeft"
						onclick={() => goto(resolve('/evaluations' as '/'))}
					>
						Volver
					</Button>
				{#if currentEvaluation}
					<Button
						type="border"
						icon="key"
						onclick={() =>
							goto(resolve(`/evaluations/${currentEvaluation.code}/keys` as '/'))
						}
					>
						Ver claves
					</Button>
				{/if}
			</div>
		{/snippet}
	</PageHeader>

	<div class="lumi-layout--two-columns lumi-page-sidebar-layout">
		<PageSidebar
			bind:mobileOpen={showMobileSidebar}
			mobileTitle="Filtros de procesamiento"
			mobileAriaLabel="Cerrar filtros de procesamiento"
		>
			{#snippet sidebar()}
				<div class="lumi-page-sidebar__section">
					<p class="lumi-page-sidebar__label">Vista actual</p>
					<h2 class="lumi-margin--none">
						{data.cycles.find((cycle) => cycle.code === filterCycleCode)?.label ?? 'Sin ciclo activo'}
					</h2>
					<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
						{#if filterCycleDegreeCode}
							<Chip color="secondary" size="sm">
								{data.cycleDegreeOptions.find((option) => option.code === filterCycleDegreeCode)?.label}
							</Chip>
						{/if}
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
						<Button type="filled" color="primary" icon="search" onclick={applyFiltersAndCloseSidebar}>
							Aplicar filtros
						</Button>
						<Button type="border" onclick={clearFilters}>Limpiar</Button>
					</div>
				</div>
			{/snippet}
		</PageSidebar>

		<section class="lumi-layout--content-right">
			<div class="lumi-stack lumi-stack--md">
				<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-md">
					<StatCard
						title="Disponibles"
						value={String(data.evaluations.length)}
						icon="clipboardPenLine"
						color="primary"
						subtitle="Evaluaciones con claves listas para corregir"
					/>
					<StatCard
						title="Preguntas"
						value={String(data.questions.length)}
						icon="listChecks"
						color="secondary"
						subtitle="Preguntas activas en la evaluación seleccionada"
					/>
					<StatCard
						title="Pendientes"
						value={String(processablePendingEntries.length)}
						icon="clock"
						color="warning"
						subtitle="Hojas válidas que todavía no se procesan"
					/>
					<StatCard
						title="Guardados"
						value={String(data.savedResultsCount)}
						icon="badgeCheck"
						color="success"
						subtitle="Resultados persistidos para esta evaluación"
					/>
				</div>

				<Card spaced>
					<div class="lumi-stack lumi-stack--md">
						<div
							class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--gap-sm lumi-flex--wrap"
						>
							<div class="lumi-stack lumi-stack--2xs">
								<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Evaluación activa</p>
								<h2 class="lumi-margin--none">
									{currentEvaluation?.name ?? 'Selecciona una evaluación para empezar'}
								</h2>
								{#if currentEvaluation}
									<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
										{currentEvaluation.cycle_title} ·
										{formatAcademicDegreeLabel(currentEvaluation.degree_name)} ·
										{formatGroupCode(currentEvaluation.group_code)} ·
										{formatEducationDate(currentEvaluation.eval_date)}
									</p>
								{/if}
							</div>

							<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
								{#if currentEvaluation}
									<Chip color="secondary" size="sm">
										{currentEvaluation.section_count} secciones
									</Chip>
									<Chip color="info" size="sm">
										{currentEvaluation.planned_question_count} preguntas
									</Chip>
								{/if}
								{#if fileEntries.length > 0}
									<Chip color="warning" size="sm">Limpia hojas para cambiar de evaluación</Chip>
								{/if}
							</div>
						</div>

						{#if data.evaluations.length === 0}
							<EmptyState
								title="No hay evaluaciones listas para procesar"
								description="Configura las claves de una evaluación primero para habilitar el procesamiento automático."
								icon="key"
							/>
						{:else}
							<Select
								value={data.selectedEvaluationCode}
								label="Evaluación"
								options={evaluationOptions}
								placeholder="Selecciona una evaluación"
								disabled={isProcessingBatch || isSavingBatch || fileEntries.length > 0}
								onchange={handleEvaluationChange}
							/>
						{/if}
					</div>
				</Card>

				{#if !currentEvaluation}
					<EmptyState
						title="Selecciona una evaluación"
						description="Usa el selector anterior para cargar la estructura, las preguntas y habilitar el procesamiento por lotes."
						icon="imagePlus"
					/>
				{:else}
					<Card spaced>
						<div class="lumi-stack lumi-stack--md">
							<div
								class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--gap-sm lumi-flex--wrap"
							>
								<div class="lumi-stack lumi-stack--2xs">
									<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Carga de hojas</p>
									<h2 class="lumi-margin--none">Escaneo y validación</h2>
									<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
										Las imágenes se optimizan en el navegador y luego se envían por lotes al motor OMR.
									</p>
								</div>

								<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
									<Button
										type="border"
										color="danger"
										icon="trash"
										disabled={fileEntries.length === 0 || isProcessingBatch || isSavingBatch}
										onclick={clearFiles}
									>
										Limpiar hojas
									</Button>
									<Button
										type="filled"
										color="info"
										icon="activity"
										disabled={!canProcessBatch}
										loading={isProcessingBatch}
										onclick={() => void processAllPendingFiles()}
									>
										Procesar lote
									</Button>
									<form
										method="POST"
										action="?/saveResults"
										use:enhance={() => {
											isSavingBatch = true;
											return async ({ result }) => {
												isSavingBatch = false;
												markEntriesAsSaved(extractSavedEnrollmentCodes(result));
												await invalidate('evaluations:process:load');

												if (result.type === 'success') {
													requestError = '';
													saveErrors = [];
													showToast(
														(typeof result.data?.message === 'string'
															? result.data.message
															: 'Los resultados fueron guardados correctamente'),
														'success'
													);
													return;
												}

												if (result.type === 'failure') {
													requestError = getActionError(result) ?? 'No se pudieron guardar todos los resultados';
													saveErrors = extractSaveErrors(result);
													showToast(requestError, 'warning');
												}
											};
										}}
									>
										<input type="hidden" name="resultsToSave" value={savePayloadJson} />
										<Button
											type="filled"
											color="success"
											icon="badgeCheck"
											button="submit"
											disabled={!canSaveResults}
											loading={isSavingBatch}
										>
											Guardar válidos
										</Button>
									</form>
									<Button
										type="border"
										color="danger"
										icon="trash"
										disabled={data.savedResultsCount === 0 || isDeletingSavedResults}
										loading={isDeletingSavedResults}
										onclick={() => void clearSavedResults()}
									>
										Limpiar guardados
									</Button>
								</div>
							</div>

							<FileUpload
								bind:files={uploadQueue}
								accept="image/*"
								multiple
								maxSize={12 * 1024 * 1024}
								placeholderText="Arrastra hojas escaneadas"
								hintText="Carga imágenes JPG, PNG o WEBP en proporción A5 vertical"
								onchange={handleUploadChange}
								oninvalid={(message) => showToast(message, 'warning')}
							/>

							{#if requestError}
								<Alert type="danger" closable onclose={() => (requestError = '')}>
									{requestError}
								</Alert>
							{/if}

							{#if saveErrors.length > 0}
								<Alert type="warning" closable onclose={() => (saveErrors = [])}>
									{saveErrors[0]}
									{#if saveErrors.length > 1}
										<br />
										<span class="lumi-text--xs">y {saveErrors.length - 1} observación(es) más.</span>
									{/if}
								</Alert>
							{/if}

							{#if issueMessages.length > 0}
								<Alert type="warning" closable={false}>
									{issueMessages[0]}
									{#if issueMessages.length > 1}
										<br />
										<span class="lumi-text--xs">Además hay {issueMessages.length - 1} alerta(s) adicionales.</span>
									{/if}
								</Alert>
							{/if}

							{#if isProcessingBatch}
								<div class="lumi-stack lumi-stack--xs">
									<div
										class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--gap-sm"
									>
										<span class="lumi-font--medium">
											Procesando {batchProgress.processed} de {batchProgress.total} hoja(s)
										</span>
										<div class="lumi-flex lumi-flex--gap-xs lumi-align-items--center">
											{#if estimatedTime}
												<span class="lumi-text--xs lumi-text--muted">{estimatedTime}</span>
											{/if}
											<Button
												type="border"
												size="sm"
												color="danger"
												icon="x"
												onclick={cancelProcessing}
											>
												Cancelar
											</Button>
										</div>
									</div>

									<Progress
										value={(batchProgress.processed / Math.max(batchProgress.total, 1)) * 100}
										showLabel
										color="info"
									/>
								</div>
							{/if}

							<div class="evaluation-process__layout">
								<div class="evaluation-process__column">
									{#if fileEntries.length === 0}
										<EmptyState
											title="No hay hojas cargadas"
											description="Carga imágenes escaneadas para comenzar a comparar respuestas con las claves."
											icon="imagePlus"
										/>
									{:else}
										<div class="evaluation-process__list-shell">
											{#each fileEntries as entry (entry.id)}
												{@const status = getEntryStatus(entry)}
												<div
													class="evaluation-process__file-row {selectedFileId === entry.id
														? 'evaluation-process__file-row--active'
														: ''}"
													role="button"
													tabindex="0"
													onclick={() => selectFile(entry.id)}
													onkeydown={(event) => {
														if (event.key === 'Enter' || event.key === ' ') {
															event.preventDefault();
															selectFile(entry.id);
														}
													}}
												>
													<div class="evaluation-process__file-main">
														<div class="evaluation-process__file-head">
															<div class="evaluation-process__file-title-group">
																<strong class="evaluation-process__file-title">{entry.file.name}</strong>
																<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
																	<Chip color={status.color} size="sm">{status.label}</Chip>
																	<Chip
																		color={entry.formatValid ? 'secondary' : 'warning'}
																		size="sm"
																	>
																		{entry.formatName}
																	</Chip>
																	{#if entry.result?.enrollment_code &&
																		duplicateEnrollmentCodes.has(entry.result.enrollment_code)}
																		<Chip color="warning" size="sm">Duplicada</Chip>
																	{/if}
																</div>
															</div>
															<p class="evaluation-process__file-message">{status.message}</p>
														</div>

														{#if entry.result}
															<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
																<Chip color="info" size="sm">
																	Código {entry.result.roll_code}
																</Chip>
																{#if entry.result.enrollment_number}
																	<Chip color="primary" size="sm">
																		{entry.result.enrollment_number}
																	</Chip>
																{/if}
																<Chip color="success" size="sm">
																	Nota {entry.result.scores.general.score.toFixed(2)}
																</Chip>
															</div>
														{/if}
													</div>

													<div class="evaluation-process__file-actions">
														<Button
															type="flat"
															size="sm"
															color="info"
															icon="activity"
															disabled={!entry.formatValid || isProcessingBatch || isSavingBatch}
															onclick={(event) => {
																event.stopPropagation();
																void processFile(entry.id);
															}}
														/>
														{#if entry.result}
															<Button
																type="flat"
																size="sm"
																color="primary"
																icon="eye"
																onclick={(event) => {
																	event.stopPropagation();
																	selectedFileId = entry.id;
																	showDetailsDialog = true;
																}}
															/>
														{/if}
														<Button
															type="flat"
															size="sm"
															color="danger"
															icon="trash"
															disabled={isProcessingBatch || isSavingBatch}
															onclick={(event) => {
																event.stopPropagation();
																removeFile(entry.id);
															}}
														/>
													</div>
												</div>
											{/each}
										</div>
									{/if}
								</div>

								<div class="evaluation-process__column">
									<Card
										spaced
										title="Previsualización"
										subtitle={
											selectedFile
												? `Hoja ${fileEntries.findIndex((entry) => entry.id === selectedFile.id) + 1} de ${fileEntries.length}`
												: 'Selecciona una hoja para revisar el resultado'
										}
									>
										{#if !selectedFile}
											<EmptyState
												title="Sin hoja seleccionada"
												description="Selecciona una hoja del listado para ver la imagen y sus datos."
												icon="image"
											/>
										{:else}
											<div class="lumi-stack lumi-stack--md">
												<div class="evaluation-process__preview-shell">
													{#if currentPreviewUrl}
														<LumiImage
															src={currentPreviewUrl}
															alt={selectedFile.file.name}
															radius="lg"
															class="evaluation-process__preview-image"
														/>
													{/if}
												</div>

												<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
													<Input
														bind:value={selectedManualRollCode}
														label="Código de lista manual"
														placeholder="0000"
														descriptionText="Usa 4 dígitos si deseas reprocesar la hoja con un código corregido."
													/>
													<div class="lumi-flex lumi-flex--gap-sm lumi-align-items--end">
														<Button
															type="filled"
															color="primary"
															icon="refreshCw"
															disabled={isProcessingBatch || isSavingBatch || !selectedFile.formatValid}
															onclick={() => void processFile(selectedFile.id, selectedManualRollCode)}
														>
															Reprocesar
														</Button>
														<Button
															type="border"
															color="info"
															icon="activity"
															disabled={isProcessingBatch || isSavingBatch || !selectedFile.formatValid}
															onclick={() => void processFile(selectedFile.id)}
														>
															Procesar
														</Button>
													</div>
												</div>

												{#if selectedFile.status === 'success' && selectedFile.result}
													{#if selectedFile.result.student}
														<div class="evaluation-process__result-card">
															<Avatar
																src={selectedFile.result.student.photo_url
																	? buildStudentPhotoUrl(selectedFile.result.student.photo_url, 'preview')
																	: ''}
																text={selectedFile.result.student.full_name}
																size="xl"
																color="primary"
															/>
															<div class="lumi-stack lumi-stack--2xs">
																<h3 class="lumi-margin--none">
																	{selectedFile.result.student.full_name}
																</h3>
																<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
																	{selectedFile.result.student.student_number} ·
																	{selectedFile.result.student.dni || 'Sin DNI'}
																</p>
																<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
																	<Chip color="info" size="sm">
																		Código {selectedFile.result.roll_code}
																	</Chip>
																	{#if selectedFile.result.enrollment_number}
																		<Chip color="primary" size="sm">
																			{selectedFile.result.enrollment_number}
																		</Chip>
																	{/if}
																	<Chip color="success" size="sm">
																		Nota {selectedFile.result.scores.general.score.toFixed(2)}
																	</Chip>
																</div>
															</div>
														</div>
													{:else}
														<Alert type="warning" closable={false}>
															La hoja fue procesada, pero no se encontró una matrícula válida con el código
															{selectedFile.result.roll_code}.
														</Alert>
													{/if}

													<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
														<Chip color="success" size="sm">
															{selectedFile.result.scores.general.correct_count} correctas
														</Chip>
														<Chip color="danger" size="sm">
															{selectedFile.result.scores.general.incorrect_count} incorrectas
														</Chip>
														<Chip color="warning" size="sm">
															{selectedFile.result.scores.general.blank_count} en blanco
														</Chip>
													</div>

													<div class="lumi-flex lumi-flex--gap-sm lumi-flex--wrap">
														<Button
															type="border"
															color="info"
															icon="eye"
															onclick={() => (showDetailsDialog = true)}
														>
															Ver detalle
														</Button>
														{#if selectedFile.saved}
															<Chip color="success" size="sm">Resultado guardado</Chip>
														{:else if selectedFile.result.enrollment_code}
															<Chip color="primary" size="sm">
																Listo para guardar
															</Chip>
														{/if}
													</div>
												{:else if selectedFile.status === 'error' && selectedFile.error}
													<Alert type="danger" closable={false}>
														{selectedFile.error.message}
													</Alert>
												{:else}
													<Alert type="info" closable={false}>
														La hoja está lista para procesarse.
													</Alert>
												{/if}
											</div>
										{/if}
									</Card>
								</div>
							</div>
						</div>
					</Card>
				{/if}
			</div>
		</section>
	</div>
</div>

<EvaluationProcessDetailsDialog
	bind:open={showDetailsDialog}
	result={selectedFile?.result ?? null}
/>

<style>
	.evaluation-process__layout {
		display: grid;
		grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
		gap: var(--lumi-space-md);
	}

	.evaluation-process__column {
		min-width: 0;
	}

	.evaluation-process__list-shell {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-sm);
		max-height: 42rem;
		overflow-y: auto;
		padding-right: var(--lumi-space-2xs);
	}

	.evaluation-process__file-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-md);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-xl);
		background:
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--lumi-color-surface) 96%, var(--lumi-color-primary) 4%) 0%,
				var(--lumi-color-surface) 100%
			);
		cursor: pointer;
		transition:
			transform var(--lumi-duration-fast) var(--lumi-easing-default),
			border-color var(--lumi-duration-fast) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-fast) var(--lumi-easing-default);
	}

	.evaluation-process__file-row:hover {
		transform: translateY(calc(var(--lumi-space-2xs) * -1));
		border-color: color-mix(in srgb, var(--lumi-color-primary) 24%, var(--lumi-color-border));
		box-shadow: var(--lumi-shadow-md);
	}

	.evaluation-process__file-row:focus-visible {
		outline: var(--lumi-border-width-thick) solid
			color-mix(in srgb, var(--lumi-color-primary) 28%, transparent);
		outline-offset: var(--lumi-space-2xs);
	}

	.evaluation-process__file-row--active {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 44%, var(--lumi-color-border));
		box-shadow: var(--lumi-shadow-md);
	}

	.evaluation-process__file-main {
		min-width: 0;
	}

	.evaluation-process__file-head {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
	}

	.evaluation-process__file-title-group {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
	}

	.evaluation-process__file-title {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.evaluation-process__file-message {
		margin: 0;
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-text-muted);
	}

	.evaluation-process__file-actions {
		display: flex;
		align-items: flex-start;
		gap: var(--lumi-space-xs);
	}

	.evaluation-process__preview-shell {
		border-radius: var(--lumi-radius-2xl);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		background:
			radial-gradient(
				circle at top,
				color-mix(in srgb, var(--lumi-color-info) 10%, transparent),
				transparent 56%
			),
			color-mix(in srgb, var(--lumi-color-surface) 86%, var(--lumi-color-background-hover) 14%);
		padding: var(--lumi-space-sm);
	}

	:global(.evaluation-process__preview-image) {
		display: block;
		width: 100%;
	}

	:global(.evaluation-process__preview-image .lumi-image__img) {
		width: 100%;
		height: auto;
		max-height: 28rem;
		object-fit: contain;
	}

	.evaluation-process__result-card {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-md);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-xl);
		background:
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--lumi-color-surface) 92%, var(--lumi-color-success) 8%) 0%,
				var(--lumi-color-surface) 100%
			);
	}

	@media (max-width: 1100px) {
		.evaluation-process__layout {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 720px) {
		.evaluation-process__file-row {
			grid-template-columns: 1fr;
		}

		.evaluation-process__file-actions {
			justify-content: flex-start;
			flex-wrap: wrap;
		}

		.evaluation-process__result-card {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
