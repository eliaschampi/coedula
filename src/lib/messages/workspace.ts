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
	}
} as const;
