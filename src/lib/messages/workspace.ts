/**
 * Texto de producto compartido: sede de trabajo y perfil.
 * Evita duplicar cadenas idénticas en servidores y API.
 */
export const WORKSPACE = {
	profileTitle: 'Mi perfil',
	errors: {
		noActiveBranch: 'No hay sede de trabajo activa. Configúrala en Mi perfil.',
		noActiveBranchForSchedules:
			'No hay sede de trabajo activa. Configúrala en Mi perfil antes de definir horarios.'
	},
	api: {
		scanMissingBranch: 'Configura tu sede de trabajo en Mi perfil para registrar asistencia'
	},
	/** Mensajes en pantallas (p. ej. escáner) alineados con la API de asistencia docente */
	client: {
		scanNeedBranch: 'Configura tu sede de trabajo en Mi perfil antes de escanear'
	}
} as const;
