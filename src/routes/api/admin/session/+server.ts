import { json } from '@sveltejs/kit';
import {
	adminConfigurationReady,
	clearAdminSession,
	createAdminSession,
	hasAdminSession,
	verifyAdminPassword
} from '../../../../lib/server/admin-auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ cookies }) => {
	if (!adminConfigurationReady()) {
		return json(
			{ authenticated: false, message: 'Máy chủ chưa cấu hình thông tin đăng nhập admin.' },
			{ status: 503, headers: { 'cache-control': 'no-store' } }
		);
	}
	return json({ authenticated: hasAdminSession(cookies) }, { headers: { 'cache-control': 'no-store' } });
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!adminConfigurationReady()) {
		return json({ message: 'Máy chủ chưa cấu hình thông tin đăng nhập admin.' }, { status: 503 });
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return json({ message: 'Dữ liệu đăng nhập không hợp lệ.' }, { status: 400 });
	}

	if (
		typeof payload !== 'object' ||
		payload === null ||
		!('password' in payload) ||
		!verifyAdminPassword(payload.password)
	) {
		return json({ message: 'Mật khẩu không chính xác.' }, { status: 401 });
	}

	createAdminSession(cookies);
	return json({ authenticated: true });
};

export const DELETE: RequestHandler = ({ cookies }) => {
	clearAdminSession(cookies);
	return json({ authenticated: false });
};
