import { error } from '@sveltejs/kit';
import { readCupSeason, readSeasonSummaries } from '../../lib/server/cup-store';
import { findSeasonBySlug } from '../../lib/season-slug';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const seasons = await readSeasonSummaries();
	const seasonSummary = findSeasonBySlug(params.slug, seasons);
	if (!seasonSummary) error(404, 'Không tìm thấy mùa giải.');

	const season = await readCupSeason(seasonSummary.title);
	if (!season) error(404, 'Không thể tải dữ liệu của mùa giải này.');

	return { seasons, season };
};
