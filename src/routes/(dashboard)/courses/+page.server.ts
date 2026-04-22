import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { readFormField } from '$lib/utils/formData';
import { isUuid } from '$lib/utils/validation';

function parseSortOrder(value: string): number {
	if (!value) {
		throw new Error('El orden es obligatorio');
	}

	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error('El orden debe ser un número válido mayor o igual a 0');
	}

	return parsed;
}

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('courses:load');

	if (!(await locals.can('courses:read'))) {
		return { title: 'Cursos', courses: [] };
	}

	const courses = await locals.db
		.selectFrom('courses')
		.selectAll()
		.orderBy('sort_order', 'asc')
		.orderBy('name', 'asc')
		.execute();

	return {
		title: 'Cursos',
		courses
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!(await locals.can('courses:create'))) {
			return fail(403, { error: 'No tienes permisos para crear cursos' });
		}

		try {
			const formData = await request.formData();
			const name = readFormField(formData, 'name');
			const sortOrder = parseSortOrder(readFormField(formData, 'sort_order'));

			if (!name) {
				return fail(400, { error: 'El nombre es obligatorio' });
			}

			await locals.db
				.insertInto('courses')
				.values({
					name,
					sort_order: sortOrder
				})
				.execute();

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'No se pudo crear el curso';
			return fail(400, { error: message });
		}
	},

	update: async ({ locals, request }) => {
		if (!(await locals.can('courses:update'))) {
			return fail(403, { error: 'No tienes permisos para actualizar cursos' });
		}

		try {
			const formData = await request.formData();
			const courseCode = readFormField(formData, 'code');
			const name = readFormField(formData, 'name');
			const sortOrder = parseSortOrder(readFormField(formData, 'sort_order'));

			if (!courseCode || !isUuid(courseCode)) {
				return fail(400, { error: 'El curso seleccionado no es válido' });
			}

			if (!name) {
				return fail(400, { error: 'El nombre es obligatorio' });
			}

			const result = await locals.db
				.updateTable('courses')
				.set({
					name,
					sort_order: sortOrder
				})
				.where('code', '=', courseCode)
				.executeTakeFirst();

			if (Number(result.numUpdatedRows ?? 0) === 0) {
				return fail(404, { error: 'Curso no encontrado' });
			}

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'No se pudo actualizar el curso';
			return fail(400, { error: message });
		}
	},

	delete: async ({ locals, request }) => {
		if (!(await locals.can('courses:delete'))) {
			return fail(403, { error: 'No tienes permisos para eliminar cursos' });
		}

		try {
			const formData = await request.formData();
			const courseCode = readFormField(formData, 'code');

			if (!courseCode || !isUuid(courseCode)) {
				return fail(400, { error: 'El curso seleccionado no es válido' });
			}

			const result = await locals.db
				.deleteFrom('courses')
				.where('code', '=', courseCode)
				.executeTakeFirst();

			if (Number(result.numDeletedRows ?? 0) === 0) {
				return fail(404, { error: 'Curso no encontrado' });
			}

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'No se pudo eliminar el curso';
			return fail(400, { error: message });
		}
	}
};
