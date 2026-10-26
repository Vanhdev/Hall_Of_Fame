import { redirect } from '@sveltejs/kit';
import { hasAdminSession } from '../../lib/server/admin-auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies }) => {
	if (!hasAdminSession(cookies)) {
		redirect(303, '/login?next=%2Fadmin');
	}
};
