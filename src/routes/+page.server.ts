import { readSeasonSummaries } from '../lib/server/cup-store';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	seasons: await readSeasonSummaries()
});
