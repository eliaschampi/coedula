import { error, type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { getSession } from '$lib/auth/session';
import { dbInstance } from '$lib/config/server';
import { getUserPermissions, hasPermission } from '$lib/permissions/server';
import { hasSuperUserAccess } from '$lib/permissions/super-user';

// Database handle - attach database instance to locals
const databaseHandle: Handle = async ({ event, resolve }) => {
	event.locals.db = dbInstance;
	return resolve(event);
};

// Authentication handle - get session and user from cookies
const authHandle: Handle = async ({ event, resolve }) => {
	const session = await getSession(event.locals.db, event.cookies);
	event.locals.session = session;
	event.locals.user = session?.user ?? null;
	const isSuperUser = hasSuperUserAccess(event.locals.user);

	// Get user permissions ONCE per session and store in locals
	// This avoids multiple database calls per request
	if (event.locals.user?.code) {
		if (isSuperUser) {
			// Super users bypass explicit permissions.
			event.locals.userPermissions = [];
		} else {
			event.locals.userPermissions = await getUserPermissions(
				event.locals.db,
				event.locals.user.code
			);
		}
	} else {
		event.locals.userPermissions = [];
	}

	// Simple permission checker using cached permissions
	const auditedSuperUserBypasses = new Set<string>();
	event.locals.can = (permissionKey: string): boolean => {
		const allowed = hasPermission(
			event.locals.userPermissions || [],
			permissionKey,
			event.locals.user
		);

		// Audit super-user bypass usage once per permission per request.
		if (allowed && isSuperUser && !auditedSuperUserBypasses.has(permissionKey)) {
			auditedSuperUserBypasses.add(permissionKey);
			console.warn('[AUTH][SUPER_USER_BYPASS]', {
				userCode: event.locals.user?.code,
				email: event.locals.user?.email,
				permissionKey,
				path: event.url.pathname,
				method: event.request.method
			});
		}

		return allowed;
	};

	return resolve(event);
};

// Auth guard - redirect based on authentication state
const authGuard: Handle = async ({ event, resolve }) => {
	const isAuthPage = event.url.pathname.startsWith('/auth');
	const isApiRoute = event.url.pathname.startsWith('/api');
	const isPublicApiRoute = event.url.pathname === '/api/logout';

	// API routes require authentication by default.
	if (isApiRoute) {
		if (!isPublicApiRoute && !event.locals.user) {
			throw error(401, 'No autorizado');
		}
		return resolve(event);
	}

	// Redirect to auth if not authenticated and not on auth page
	if (!event.locals.user && !isAuthPage) {
		throw redirect(303, '/auth');
	}

	// Redirect to dashboard if authenticated and on auth page
	if (event.locals.user && isAuthPage) {
		throw redirect(303, '/');
	}

	return resolve(event);
};

export const handle: Handle = sequence(databaseHandle, authHandle, authGuard);
