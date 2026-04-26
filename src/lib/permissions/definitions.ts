/**
 * Permission definitions for the educational admin platform.
 */

export interface PermissionDefinition {
	key: string;
	label: string;
	category: string;
	description: string;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
	{
		key: 'users:read',
		label: 'Ver usuarios',
		category: 'Usuarios',
		description: 'Consultar usuarios administrativos'
	},
	{
		key: 'users:create',
		label: 'Crear usuarios',
		category: 'Usuarios',
		description: 'Registrar nuevos usuarios del sistema'
	},
	{
		key: 'users:update',
		label: 'Editar usuarios',
		category: 'Usuarios',
		description: 'Actualizar datos de usuarios'
	},
	{
		key: 'users:delete',
		label: 'Eliminar usuarios',
		category: 'Usuarios',
		description: 'Eliminar usuarios sin dependencias activas'
	},
	{
		key: 'users:manage_permissions',
		label: 'Gestionar permisos',
		category: 'Usuarios',
		description: 'Asignar permisos operativos a usuarios'
	},
	{
		key: 'branches:read',
		label: 'Ver sedes',
		category: 'Institucional',
		description: 'Consultar sedes y responsables'
	},
	{
		key: 'branches:create',
		label: 'Crear sedes',
		category: 'Institucional',
		description: 'Registrar nuevas sedes educativas'
	},
	{
		key: 'branches:update',
		label: 'Editar sedes',
		category: 'Institucional',
		description: 'Actualizar datos y responsables de sedes'
	},
	{
		key: 'branches:delete',
		label: 'Eliminar sedes',
		category: 'Institucional',
		description: 'Eliminar sedes sin historial asociado'
	},
	{
		key: 'cycles:read',
		label: 'Ver ciclos',
		category: 'Académico',
		description: 'Consultar periodos y ciclos académicos'
	},
	{
		key: 'cycles:create',
		label: 'Crear ciclos',
		category: 'Académico',
		description: 'Configurar nuevos ciclos académicos'
	},
	{
		key: 'cycles:update',
		label: 'Editar ciclos',
		category: 'Académico',
		description: 'Actualizar oferta, modalidad y horarios de ciclos'
	},
	{
		key: 'cycles:delete',
		label: 'Eliminar ciclos',
		category: 'Académico',
		description: 'Eliminar ciclos sin matrículas asociadas'
	},
	{
		key: 'courses:read',
		label: 'Ver cursos',
		category: 'Académico',
		description: 'Consultar catálogo de cursos'
	},
	{
		key: 'courses:create',
		label: 'Crear cursos',
		category: 'Académico',
		description: 'Registrar nuevos cursos en el catálogo'
	},
	{
		key: 'courses:update',
		label: 'Editar cursos',
		category: 'Académico',
		description: 'Actualizar nombre y orden de los cursos'
	},
	{
		key: 'courses:delete',
		label: 'Eliminar cursos',
		category: 'Académico',
		description: 'Eliminar cursos sin dependencias académicas'
	},
	{
		key: 'evaluations:read',
		label: 'Ver evaluaciones',
		category: 'Académico',
		description: 'Consultar evaluaciones por nivel, secciones y claves'
	},
	{
		key: 'evaluations:create',
		label: 'Crear evaluaciones',
		category: 'Académico',
		description: 'Registrar nuevas evaluaciones con su estructura de cursos'
	},
	{
		key: 'evaluations:update',
		label: 'Editar evaluaciones',
		category: 'Académico',
		description: 'Actualizar datos generales y claves de evaluaciones'
	},
	{
		key: 'evaluations:delete',
		label: 'Eliminar evaluaciones',
		category: 'Académico',
		description: 'Eliminar evaluaciones con sus secciones y claves asociadas'
	},
	{
		key: 'students:read',
		label: 'Ver alumnos',
		category: 'Estudiantes',
		description: 'Consultar padrón e historial de alumnos'
	},
	{
		key: 'students:create',
		label: 'Crear alumnos',
		category: 'Estudiantes',
		description: 'Registrar nuevos alumnos'
	},
	{
		key: 'students:update',
		label: 'Editar alumnos',
		category: 'Estudiantes',
		description: 'Actualizar información de alumnos'
	},
	{
		key: 'students:delete',
		label: 'Eliminar alumnos',
		category: 'Estudiantes',
		description: 'Eliminar alumnos sin historial asociado'
	},
	{
		key: 'enrollments:read',
		label: 'Ver matrículas',
		category: 'Académico',
		description: 'Consultar matrículas y grupos'
	},
	{
		key: 'enrollments:create',
		label: 'Crear matrículas',
		category: 'Académico',
		description: 'Matricular alumnos en ciclos y grados'
	},
	{
		key: 'enrollments:update',
		label: 'Editar matrículas',
		category: 'Académico',
		description: 'Actualizar turnos, estado y grupo de matrícula'
	},
	{
		key: 'enrollments:delete',
		label: 'Eliminar matrículas',
		category: 'Académico',
		description: 'Eliminar matrículas registradas por error'
	},
	{
		key: 'attendance:read',
		label: 'Ver asistencia',
		category: 'Académico',
		description: 'Consultar asistencias diarias y reportes históricos'
	},
	{
		key: 'attendance:create',
		label: 'Registrar asistencia',
		category: 'Académico',
		description: 'Registrar asistencias manuales, automáticas y por QR'
	},
	{
		key: 'attendance:update',
		label: 'Editar asistencia',
		category: 'Académico',
		description: 'Corregir estado, hora y observaciones de asistencia'
	},
	{
		key: 'attendance:delete',
		label: 'Eliminar asistencia',
		category: 'Académico',
		description: 'Eliminar registros de asistencia cargados por error'
	},
	{
		key: 'teachers:read',
		label: 'Ver docentes',
		category: 'Académico',
		description: 'Consultar padrón de docentes'
	},
	{
		key: 'teachers:create',
		label: 'Crear docentes',
		category: 'Académico',
		description: 'Registrar nuevos docentes'
	},
	{
		key: 'teachers:update',
		label: 'Editar docentes',
		category: 'Académico',
		description: 'Actualizar información de docentes'
	},
	{
		key: 'teachers:delete',
		label: 'Eliminar docentes',
		category: 'Académico',
		description: 'Eliminar docentes sin dependencias activas'
	},
	{
		key: 'teacher_attendance:read',
		label: 'Ver asistencia docente',
		category: 'Académico',
		description: 'Consultar asistencias de docentes por sede y día'
	},
	{
		key: 'teacher_attendance:create',
		label: 'Registrar asistencia docente',
		category: 'Académico',
		description: 'Registrar asistencias de docentes manuales y por QR'
	},
	{
		key: 'teacher_attendance:update',
		label: 'Editar asistencia docente',
		category: 'Académico',
		description: 'Corregir hora y observaciones de asistencia docente'
	},
	{
		key: 'teacher_attendance:delete',
		label: 'Eliminar asistencia docente',
		category: 'Académico',
		description: 'Eliminar registros de asistencia docente cargados por error'
	},
	{
		key: 'payments:read',
		label: 'Ver pagos',
		category: 'Finanzas',
		description: 'Consultar cobros, pagos y cuotas'
	},
	{
		key: 'payments:create',
		label: 'Registrar pagos',
		category: 'Finanzas',
		description: 'Registrar pagos de alumnos e ingresos relacionados'
	},
	{
		key: 'payments:update',
		label: 'Editar pagos',
		category: 'Finanzas',
		description: 'Anular pagos y actualizar observaciones de cobro'
	},
	{
		key: 'payments:delete',
		label: 'Eliminar pagos',
		category: 'Finanzas',
		description: 'Eliminar pagos registrados por error'
	},
	{
		key: 'cashbox:read',
		label: 'Ver caja',
		category: 'Finanzas',
		description: 'Consultar movimientos y cierres de caja'
	},
	{
		key: 'cashbox:create',
		label: 'Registrar caja',
		category: 'Finanzas',
		description: 'Registrar aperturas, gastos, rendiciones y movimientos de caja'
	},
	{
		key: 'cashbox:update',
		label: 'Editar caja',
		category: 'Finanzas',
		description: 'Actualizar aperturas, cierres y estados de caja'
	},
	{
		key: 'cashbox:delete',
		label: 'Eliminar caja',
		category: 'Finanzas',
		description: 'Eliminar movimientos de caja registrados por error'
	},
	{
		key: 'drive:read',
		label: 'Ver Drive',
		category: 'Drive',
		description: 'Consultar archivos y carpetas del Drive'
	},
	{
		key: 'drive:create',
		label: 'Crear y subir',
		category: 'Drive',
		description: 'Crear carpetas y subir archivos al Drive'
	},
	{
		key: 'drive:update',
		label: 'Editar Drive',
		category: 'Drive',
		description: 'Renombrar, mover y organizar archivos del Drive'
	},
	{
		key: 'drive:delete',
		label: 'Eliminar Drive',
		category: 'Drive',
		description: 'Mover archivos a papelera o eliminarlos definitivamente'
	},
	{
		key: 'dashboard:read',
		label: 'Ver dashboard',
		category: 'Sistema',
		description: 'Consultar métricas generales del sistema'
	},
	{
		key: 'system:config',
		label: 'Configuración',
		category: 'Sistema',
		description: 'Configurar opciones globales del sistema'
	}
];

export function getPermissionsByCategory(): Record<string, PermissionDefinition[]> {
	return PERMISSION_DEFINITIONS.reduce(
		(acc, permission) => {
			if (!acc[permission.category]) {
				acc[permission.category] = [];
			}

			acc[permission.category].push(permission);
			return acc;
		},
		{} as Record<string, PermissionDefinition[]>
	);
}

export function getPermissionByKey(key: string): PermissionDefinition | undefined {
	return PERMISSION_DEFINITIONS.find((permission) => permission.key === key);
}
