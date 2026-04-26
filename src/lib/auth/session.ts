import type { Cookies } from '@sveltejs/kit';
import { decodeTokenExpiration, generateToken, verifyToken } from './jwt';
import type { Database } from '$lib/database';
import type { Users } from '$lib/database/types';
import type { Selectable } from 'kysely';

const SESSION_USER_COLUMNS = [
	'code',
	'name',
	'last_name',
	'email',
	'photo_url',
	'is_super_admin',
	'last_login',
	'created_at',
	'updated_at'
] as const;

export type SessionUser = Pick<Selectable<Users>, (typeof SESSION_USER_COLUMNS)[number]>;

export interface Session {
	user: SessionUser;
	token: string;
	expiresAt: number;
}

const SESSION_COOKIE_NAME = 'coeduca_session';

const cookieConfig = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: process.env.NODE_ENV === 'production',
	maxAge: 60 * 60 * 24 * 7 // 7 days
};

async function getSessionUser(db: Database, userCode: string): Promise<SessionUser | null> {
	const user = await db
		.selectFrom('users')
		.select(SESSION_USER_COLUMNS)
		.where('code', '=', userCode)
		.executeTakeFirst();

	return user ?? null;
}

/**
 * Create a new session for a user
 */
export async function createSession(
	db: Database,
	userCode: string,
	cookies: Cookies
): Promise<Session | null> {
	try {
		// Get user from database (safe shape, no password hash)
		const user = await getSessionUser(db, userCode);

		if (!user) {
			console.error('User not found:', userCode);
			return null;
		}

		// Generate JWT token
		const token = generateToken({ userCode: user.code, email: user.email });
		const expiresAt = decodeTokenExpiration(token) ?? Date.now() + cookieConfig.maxAge * 1000;

		// Set session cookie
		cookies.set(SESSION_COOKIE_NAME, token, cookieConfig);

		// Update last login
		await db
			.updateTable('users')
			.set({ last_login: new Date() })
			.where('code', '=', userCode)
			.execute();

		return {
			user,
			token,
			expiresAt
		};
	} catch (error) {
		console.error('Error creating session:', error);
		return null;
	}
}

/**
 * Get current session from cookies
 */
export async function getSession(db: Database, cookies: Cookies): Promise<Session | null> {
	try {
		const token = cookies.get(SESSION_COOKIE_NAME);
		if (!token) {
			return null;
		}

		// Verify token
		const payload = verifyToken(token);
		if (!payload) {
			destroySession(cookies);
			return null;
		}

		// Get fresh user data (safe shape, no password hash)
		const user = await getSessionUser(db, payload.userCode);

		if (!user) {
			destroySession(cookies);
			return null;
		}

		const expSeconds = payload.exp;
		if (typeof expSeconds !== 'number' || !Number.isFinite(expSeconds) || expSeconds <= 0) {
			destroySession(cookies);
			return null;
		}

		return {
			user,
			token,
			expiresAt: expSeconds * 1000
		};
	} catch (error) {
		console.error('Error getting session:', error);
		destroySession(cookies);
		return null;
	}
}

/**
 * Destroy current session
 */
export function destroySession(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

/**
 * Refresh session with new token
 */
export async function refreshSession(db: Database, cookies: Cookies): Promise<Session | null> {
	const currentSession = await getSession(db, cookies);
	if (!currentSession) {
		return null;
	}

	return createSession(db, currentSession.user.code, cookies);
}
