import { fail, redirect } from '@sveltejs/kit';
import { sql } from 'kysely';
import type { Actions, PageServerLoad } from './$types';
import type { Database } from '$lib/database';
import { verifyPassword } from '$lib/auth/password';
import { createSession } from '$lib/auth/session';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_BLOCK_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 10;
const DUMMY_BCRYPT_HASH = '$2a$10$7EqJtq98hPqEX7fNZaFWoOeN3rYQe4S1Qe7YQDdyCjTiMQuu2fo6e';
const DB_RATE_LIMIT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const DB_RATE_LIMIT_RETENTION_MS = 2 * 24 * 60 * 60 * 1000;

interface LoginAttemptState {
	firstAttemptAt: number;
	failedCount: number;
	blockedUntil: number;
}

interface DbRateLimitRow {
	blocked_until: Date | string;
	failed_count: number | string;
	first_attempt_at: Date | string;
}

// Memory fallback keeps compatibility if DB rate-limit store is temporarily unavailable.
const memoryLoginAttempts = new Map<string, LoginAttemptState>();
let hasCheckedDbRateLimitStore = false;
let dbRateLimitStoreAvailable = true;
let lastDbRateLimitCleanupAt = 0;

function getClientIp(request: Request): string {
	const forwardedFor = request.headers.get('x-forwarded-for');
	if (forwardedFor) {
		return forwardedFor.split(',')[0]?.trim() || 'unknown';
	}

	return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function getLoginAttemptKey(request: Request, email: string): string {
	return `${getClientIp(request)}:${email}`;
}

function getDefaultAttemptState(now: number): LoginAttemptState {
	return {
		firstAttemptAt: now,
		failedCount: 0,
		blockedUntil: 0
	};
}

function parseTimestampMs(value: Date | string): number {
	if (value instanceof Date) {
		return value.getTime();
	}

	const parsed = new Date(value).getTime();
	return Number.isNaN(parsed) ? 0 : parsed;
}

function cleanupMemoryLoginAttempts(now: number): void {
	if (memoryLoginAttempts.size < 2000) return;

	for (const [key, value] of memoryLoginAttempts) {
		if (value.blockedUntil < now - LOGIN_BLOCK_MS && value.firstAttemptAt < now - LOGIN_WINDOW_MS) {
			memoryLoginAttempts.delete(key);
		}
	}
}

function getMemoryAttemptState(key: string, now: number): LoginAttemptState {
	const existing = memoryLoginAttempts.get(key);
	if (!existing || now - existing.firstAttemptAt > LOGIN_WINDOW_MS) {
		const nextState = getDefaultAttemptState(now);
		memoryLoginAttempts.set(key, nextState);
		return nextState;
	}

	return existing;
}

function registerMemoryFailedAttempt(key: string, now: number): LoginAttemptState {
	const attemptState = getMemoryAttemptState(key, now);
	const nextFailedCount = attemptState.failedCount + 1;
	const nextState: LoginAttemptState = {
		firstAttemptAt: attemptState.firstAttemptAt,
		failedCount: nextFailedCount,
		blockedUntil: nextFailedCount >= MAX_LOGIN_ATTEMPTS ? now + LOGIN_BLOCK_MS : 0
	};

	memoryLoginAttempts.set(key, nextState);
	return nextState;
}

function clearMemoryAttemptState(key: string): void {
	memoryLoginAttempts.delete(key);
}

async function canUseDbRateLimitStore(db: Database): Promise<boolean> {
	if (hasCheckedDbRateLimitStore) {
		return dbRateLimitStoreAvailable;
	}

	try {
		await sql`select 1 from auth_login_rate_limits limit 1`.execute(db);
		dbRateLimitStoreAvailable = true;
	} catch (error) {
		dbRateLimitStoreAvailable = false;
		console.error('Rate-limit DB store unavailable. Falling back to memory store.', error);
	}

	hasCheckedDbRateLimitStore = true;
	return dbRateLimitStoreAvailable;
}

async function cleanupDbRateLimitAttempts(db: Database, now: number): Promise<void> {
	if (now - lastDbRateLimitCleanupAt < DB_RATE_LIMIT_CLEANUP_INTERVAL_MS) {
		return;
	}

	lastDbRateLimitCleanupAt = now;
	await sql`
		delete from auth_login_rate_limits
		where updated_at < ${new Date(now - DB_RATE_LIMIT_RETENTION_MS)}
	`.execute(db);
}

async function getDbAttemptState(
	db: Database,
	key: string,
	now: number
): Promise<LoginAttemptState> {
	await cleanupDbRateLimitAttempts(db, now);

	const result = await sql<DbRateLimitRow>`
		select first_attempt_at, failed_count, blocked_until
		from auth_login_rate_limits
		where rate_key = ${key}
		limit 1
	`.execute(db);

	const row = result.rows[0];
	if (!row) {
		return getDefaultAttemptState(now);
	}

	const firstAttemptAt = parseTimestampMs(row.first_attempt_at);
	const blockedUntil = parseTimestampMs(row.blocked_until);
	const failedCount = Number(row.failed_count) || 0;

	if (now - firstAttemptAt > LOGIN_WINDOW_MS) {
		return getDefaultAttemptState(now);
	}

	return {
		firstAttemptAt,
		failedCount,
		blockedUntil
	};
}

async function saveDbAttemptState(
	db: Database,
	key: string,
	state: LoginAttemptState,
	now: number
): Promise<void> {
	await sql`
		insert into auth_login_rate_limits (
			rate_key,
			first_attempt_at,
			failed_count,
			blocked_until,
			updated_at
		)
		values (
			${key},
			${new Date(state.firstAttemptAt)},
			${state.failedCount},
			${new Date(state.blockedUntil)},
			${new Date(now)}
		)
		on conflict (rate_key)
		do update set
			first_attempt_at = excluded.first_attempt_at,
			failed_count = excluded.failed_count,
			blocked_until = excluded.blocked_until,
			updated_at = excluded.updated_at
	`.execute(db);
}

async function clearDbAttemptState(db: Database, key: string): Promise<void> {
	await sql`delete from auth_login_rate_limits where rate_key = ${key}`.execute(db);
}

async function getAttemptState(
	db: Database,
	key: string,
	now: number,
	useDbStore: boolean
): Promise<LoginAttemptState> {
	if (!useDbStore) {
		return getMemoryAttemptState(key, now);
	}

	try {
		return await getDbAttemptState(db, key, now);
	} catch (error) {
		console.error('Error reading DB rate-limit state. Falling back to memory store.', error);
		return getMemoryAttemptState(key, now);
	}
}

async function registerFailedAttempt(
	db: Database,
	key: string,
	now: number,
	useDbStore: boolean
): Promise<LoginAttemptState> {
	if (!useDbStore) {
		return registerMemoryFailedAttempt(key, now);
	}

	try {
		const attemptState = await getDbAttemptState(db, key, now);
		const nextFailedCount = attemptState.failedCount + 1;
		const nextState: LoginAttemptState = {
			firstAttemptAt: attemptState.firstAttemptAt,
			failedCount: nextFailedCount,
			blockedUntil: nextFailedCount >= MAX_LOGIN_ATTEMPTS ? now + LOGIN_BLOCK_MS : 0
		};

		await saveDbAttemptState(db, key, nextState, now);
		return nextState;
	} catch (error) {
		console.error('Error writing DB rate-limit state. Falling back to memory store.', error);
		return registerMemoryFailedAttempt(key, now);
	}
}

async function clearLoginAttempts(db: Database, key: string, useDbStore: boolean): Promise<void> {
	if (!useDbStore) {
		clearMemoryAttemptState(key);
		return;
	}

	try {
		await clearDbAttemptState(db, key);
	} catch (error) {
		console.error('Error clearing DB rate-limit state. Falling back to memory store.', error);
		clearMemoryAttemptState(key);
	}
}

export const load: PageServerLoad = async () => {
	return {
		title: 'Iniciar Sesión'
	};
};

export const actions: Actions = {
	login: async ({ request, locals, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim().toLowerCase();
		const password = formData.get('password')?.toString();
		const now = Date.now();
		const useDbRateLimitStore = await canUseDbRateLimitStore(locals.db);

		cleanupMemoryLoginAttempts(now);

		// Validate input
		if (!email || !password) {
			return fail(400, {
				error: 'Email y contraseña son requeridos'
			});
		}

		if (!EMAIL_REGEX.test(email)) {
			return fail(400, {
				error: 'Email inválido'
			});
		}

		if (password.length < 6) {
			return fail(400, {
				error: 'La contraseña debe tener al menos 6 caracteres'
			});
		}

		const attemptKey = getLoginAttemptKey(request, email);
		const attemptState = await getAttemptState(locals.db, attemptKey, now, useDbRateLimitStore);
		if (attemptState.blockedUntil > now) {
			return fail(429, {
				error: 'Demasiados intentos fallidos. Intenta nuevamente más tarde.'
			});
		}

		// Find user by email
		const user = await locals.db
			.selectFrom('users')
			.select(['code', 'email', 'password_hash'])
			.where('email', '=', email)
			.executeTakeFirst();

		if (!user) {
			// Keep a similar timing profile to avoid user enumeration.
			await verifyPassword(password, DUMMY_BCRYPT_HASH);
			await registerFailedAttempt(locals.db, attemptKey, now, useDbRateLimitStore);
			return fail(401, {
				error: 'Credenciales inválidas'
			});
		}

		// Verify password
		const isValidPassword = await verifyPassword(password, user.password_hash);

		if (!isValidPassword) {
			await registerFailedAttempt(locals.db, attemptKey, now, useDbRateLimitStore);
			return fail(401, {
				error: 'Credenciales inválidas'
			});
		}

		await clearLoginAttempts(locals.db, attemptKey, useDbRateLimitStore);

		// Create session
		const session = await createSession(locals.db, user.code, cookies);

		if (!session) {
			return fail(500, {
				error: 'Error al crear la sesión'
			});
		}

		// Redirect to dashboard
		throw redirect(303, '/');
	}
};
