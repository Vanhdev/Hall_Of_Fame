import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

export const adminCookieName = 'sinno_admin';
const sessionDurationSeconds = 8 * 60 * 60;

function getConfiguration() {
	const password = process.env.SINNO_ADMIN_PASSWORD;
	const secret = process.env.SINNO_ADMIN_SESSION_SECRET;
	if (!password || !secret || secret.length < 32) return null;
	return { password, secret };
}

export function adminConfigurationReady() {
	return getConfiguration() !== null;
}

export function verifyAdminPassword(candidate: unknown) {
	const configuration = getConfiguration();
	if (!configuration || typeof candidate !== 'string') return false;
	const expected = createHash('sha256').update(configuration.password).digest();
	const received = createHash('sha256').update(candidate).digest();
	return timingSafeEqual(expected, received);
}

function sign(expiresAt: string, secret: string) {
	return createHmac('sha256', secret).update(expiresAt).digest('base64url');
}

export function createAdminSession(cookies: Cookies) {
	const configuration = getConfiguration();
	if (!configuration) throw new Error('Admin authentication is not configured');

	const expiresAt = String(Math.floor(Date.now() / 1000) + sessionDurationSeconds);
	const signature = sign(expiresAt, configuration.secret);
	cookies.set(adminCookieName, `${expiresAt}.${signature}`, {
		httpOnly: true,
		sameSite: 'strict',
		secure:
			process.env.SINNO_ADMIN_COOKIE_SECURE === 'true' ||
			(process.env.SINNO_ADMIN_COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production'),
		path: '/',
		maxAge: sessionDurationSeconds
	});
}

export function clearAdminSession(cookies: Cookies) {
	cookies.delete(adminCookieName, { path: '/' });
}

export function hasAdminSession(cookies: Cookies) {
	const configuration = getConfiguration();
	const token = cookies.get(adminCookieName);
	if (!configuration || !token) return false;

	const [expiresAt, signature, extra] = token.split('.');
	if (!expiresAt || !signature || extra || !/^\d+$/.test(expiresAt)) return false;
	if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;

	const expected = Buffer.from(sign(expiresAt, configuration.secret));
	const received = Buffer.from(signature);
	return expected.length === received.length && timingSafeEqual(expected, received);
}
