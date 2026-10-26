import { json } from '@sveltejs/kit';
import { hasAdminSession } from '../../../lib/server/admin-auth';
import { CupDataValidationError, readCupData, writeCupData } from '../../../lib/server/cup-store';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () =>
	json(await readCupData(), { headers: { 'cache-control': 'no-store' } });

export const PUT: RequestHandler = async ({ request, cookies }) => {
	if (!hasAdminSession(cookies)) {
		return json({ message: 'Vui lòng đăng nhập để cập nhật thông tin giải.' }, { status: 401 });
	}

	const body = await request.text();
	if (body.length > 24_000_000) {
		return json({ message: 'Dữ liệu vượt quá giới hạn cho phép.' }, { status: 413 });
	}

	let payload: unknown;
	try {
		payload = JSON.parse(body);
	} catch {
		return json({ message: 'Dữ liệu gửi lên không phải JSON hợp lệ.' }, { status: 400 });
	}

	try {
		return json(await writeCupData(payload));
	} catch (error) {
		if (error instanceof CupDataValidationError) {
			return json({ message: error.message }, { status: 400 });
		}
		throw error;
	}
};
