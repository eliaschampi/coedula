<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Alert, Avatar, Button, Card, Chip, Input, PageHeader } from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { buildStudentPhotoUrl, formatAttendanceState, formatAttendanceTime } from '$lib/utils';
	import type { AttendanceScanResult } from '$lib/types/attendance';

	type DetectorResult = { rawValue?: string };
	type BarcodeDetectorInstance = {
		detect: (source: HTMLVideoElement) => Promise<DetectorResult[]>;
	};
	type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

	interface DetectorWindow extends Window {
		BarcodeDetector?: BarcodeDetectorConstructor;
	}

	const canCreate = $derived(can('attendance:create'));

	let videoElement = $state<HTMLVideoElement | null>(null);
	let mediaStream = $state<MediaStream | null>(null);
	let scanFrame = 0;
	let detector: BarcodeDetectorInstance | null = null;
	let cameraReady = $state(false);
	let manualDni = $state('');
	let isSubmitting = $state(false);
	let cameraError = $state('');
	let result = $state<AttendanceScanResult | null>(null);
	let lastScannedValue = '';
	let lastScannedAt = 0;

	function barcodeDetectorConstructor(): BarcodeDetectorConstructor | null {
		if (!browser) return null;
		return ((window as DetectorWindow).BarcodeDetector ??
			null) as BarcodeDetectorConstructor | null;
	}

	async function submitDni(dni: string): Promise<void> {
		if (isSubmitting || !/^\d{8}$/.test(dni)) {
			return;
		}

		isSubmitting = true;
		cameraError = '';

		try {
			const response = await fetch('/api/attendance/scan', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ dni })
			});

			const payload = (await response.json()) as AttendanceScanResult | { message?: string };

			if (!response.ok) {
				throw new Error(payload.message || 'No se pudo registrar la asistencia');
			}

			result = payload as AttendanceScanResult;
			manualDni = '';
		} catch (caught) {
			cameraError = caught instanceof Error ? caught.message : 'No se pudo registrar la asistencia';
		} finally {
			isSubmitting = false;
		}
	}

	async function scanLoop(): Promise<void> {
		if (!videoElement || !detector) {
			scanFrame = window.requestAnimationFrame(() => void scanLoop());
			return;
		}

		try {
			if (!isSubmitting && videoElement.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
				const barcodes = await detector.detect(videoElement);
				const matchedValue = barcodes.find((item) => /^\d{8}$/.test(item.rawValue ?? ''))?.rawValue;
				if (matchedValue) {
					const now = Date.now();
					if (matchedValue !== lastScannedValue || now - lastScannedAt > 2500) {
						lastScannedValue = matchedValue;
						lastScannedAt = now;
						await submitDni(matchedValue);
					}
				}
			}
		} catch {
			// Ignore transient detector errors while camera keeps running.
		}

		scanFrame = window.requestAnimationFrame(() => void scanLoop());
	}

	async function startCamera(): Promise<void> {
		if (!browser || !navigator.mediaDevices?.getUserMedia) {
			cameraError = 'Tu navegador no permite acceder a la cámara';
			return;
		}

		try {
			mediaStream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: { ideal: 'environment' } },
				audio: false
			});

			if (videoElement) {
				videoElement.srcObject = mediaStream;
				await videoElement.play();
			}

			const Detector = barcodeDetectorConstructor();
			if (Detector) {
				detector = new Detector({ formats: ['qr_code'] });
				scanFrame = window.requestAnimationFrame(() => void scanLoop());
			} else {
				cameraError =
					'El navegador no soporta escaneo QR nativo. Puedes registrar asistencia escribiendo el DNI.';
			}

			cameraReady = true;
		} catch {
			cameraError = 'No se pudo abrir la cámara. Puedes registrar asistencia con DNI manual.';
		}
	}

	function stopCamera(): void {
		if (scanFrame) {
			cancelAnimationFrame(scanFrame);
			scanFrame = 0;
		}

		mediaStream?.getTracks().forEach((track) => track.stop());
		mediaStream = null;
		cameraReady = false;
	}

	function handleManualSubmit(event?: SubmitEvent): void {
		event?.preventDefault();
		void submitDni(manualDni.trim());
	}

	onMount(() => {
		void startCamera();

		return () => {
			stopCamera();
		};
	});
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader
		title="Escanear asistencia"
		subtitle="Registra asistencia automática leyendo el QR del carnet o escribiendo el DNI"
		icon="creditCard"
	>
		{#snippet actions()}
			<Button
				type="border"
				icon="arrowLeft"
				onclick={() => void goto(resolve('/attendance' as '/'))}
			>
				Volver
			</Button>
		{/snippet}
	</PageHeader>

	{#if !canCreate}
		<Alert type="warning" closable>No tienes permisos para registrar asistencia.</Alert>
	{:else}
		<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
			<Card title="Captura" subtitle="Escaneo continuo con fallback manual" spaced>
				<div class="lumi-stack lumi-stack--md">
					{#if cameraError}
						<Alert type="warning" closable>{cameraError}</Alert>
					{/if}

					<div class="attendance-scan__video-shell">
						<video bind:this={videoElement} class="attendance-scan__video" playsinline muted
						></video>
					</div>

					<form class="lumi-stack lumi-stack--sm" onsubmit={handleManualSubmit}>
						<Input
							bind:value={manualDni}
							label="Registrar por DNI"
							placeholder="Ingrese 8 dígitos"
						/>
						<div class="lumi-flex lumi-flex--gap-sm lumi-flex--wrap">
							<Button
								type="filled"
								color="primary"
								icon="badgeCheck"
								button="submit"
								loading={isSubmitting}
							>
								Registrar
							</Button>
							<Button
								type="border"
								button="button"
								icon="refreshCw"
								onclick={() => void startCamera()}
							>
								Reiniciar cámara
							</Button>
						</div>
					</form>
				</div>
			</Card>

			<Card title="Resultado" subtitle="Última lectura procesada" spaced>
				<div class="lumi-stack lumi-stack--md attendance-scan__result">
					{#if result}
						<Avatar
							src={result.student.photo_url
								? buildStudentPhotoUrl(result.student.photo_url, 'preview')
								: ''}
							text={result.student.full_name}
							size="xl"
							color="primary"
						/>
						<div class="lumi-stack lumi-stack--2xs lumi-text--center">
							<h2 class="lumi-margin--none lumi-text--xl lumi-font--medium">
								{result.student.full_name}
							</h2>
							<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
								{result.student.student_number} · {result.student.dni || 'Sin DNI'}
							</p>
							<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
								{result.enrollment.cycle_title} · {result.enrollment.degree_name} · Grupo
								{result.enrollment.group_code}
							</p>
						</div>
						<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
							<Chip color={result.status === 'created' ? 'success' : 'info'} size="sm">
								{result.status === 'created' ? 'Registrada' : 'Ya registrada'}
							</Chip>
							<Chip color="primary" size="sm">
								{formatAttendanceState(result.attendance.attendance_state)}
							</Chip>
							<Chip color="secondary" size="sm">
								{formatAttendanceTime(result.attendance.attendance_entry_time)}
							</Chip>
						</div>
						<Alert type={result.status === 'created' ? 'success' : 'info'} closable={false}>
							{result.message}
						</Alert>
					{:else}
						<Alert type="info" closable={false}>
							{cameraReady
								? 'Esperando un QR válido o un DNI manual para registrar asistencia.'
								: 'Preparando el lector de asistencia.'}
						</Alert>
					{/if}
				</div>
			</Card>
		</div>
	{/if}
</div>

<style>
	.attendance-scan__video-shell {
		position: relative;
		overflow: hidden;
		border-radius: var(--lumi-radius-2xl);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		background:
			radial-gradient(
				circle at top,
				color-mix(in srgb, var(--lumi-color-info) 12%, transparent),
				transparent 58%
			),
			color-mix(in srgb, var(--lumi-color-surface) 88%, var(--lumi-color-background-hover) 12%);
		min-block-size: 22rem;
	}

	.attendance-scan__video {
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
		min-block-size: 22rem;
	}

	.attendance-scan__result {
		align-items: center;
		text-align: center;
	}
</style>
