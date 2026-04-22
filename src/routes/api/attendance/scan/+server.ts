import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AttendanceRepository } from '$lib/server/repositories/attendance.repository';
import { formatLocalDateValue } from '$lib/utils';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!(await locals.can('attendance:create'))) {
		return json({ message: 'No tienes permisos para registrar asistencia' }, { status: 403 });
	}

	const payload = (await request.json().catch(() => ({}))) as { dni?: string };
	const dni = payload.dni?.trim() ?? '';

	if (!/^\d{8}$/.test(dni)) {
		return json({ message: 'Debe ingresar un DNI válido de 8 dígitos' }, { status: 400 });
	}

	try {
		const result = await AttendanceRepository.registerByStudentDni(
			locals.db,
			dni,
			formatLocalDateValue()
		);

		return json(result);
	} catch (caught) {
		const message = caught instanceof Error ? caught.message : 'No se pudo registrar la asistencia';
		return json({ message }, { status: 400 });
	}
};
