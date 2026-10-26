import { error } from '@sveltejs/kit';
import { readCupSeason, readSeasonSummaries } from '../../../lib/server/cup-store';
import { findSeasonBySlug, highlightPath, seasonPath } from '../../../lib/season-slug';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const seasons = await readSeasonSummaries();
	const seasonSummary = findSeasonBySlug(params.slug, seasons);
	if (!seasonSummary) error(404, 'Không tìm thấy mùa giải.');

	const season = await readCupSeason(seasonSummary.title);
	if (!season) error(404, 'Không thể tải dữ liệu của mùa giải này.');

	const requestedSlug = params.highlight.toLocaleLowerCase('vi');
	const highlightIndex = season.highlights.findIndex(
		(highlight, index) =>
			highlightPath(seasonSummary, highlight, index, season.highlights, seasons)
				.split('/')
				.at(-1)
				?.toLocaleLowerCase('vi') === requestedSlug
	);
	if (highlightIndex < 0) error(404, 'Không tìm thấy khoảnh khắc này.');

	return {
		season,
		highlight: season.highlights[highlightIndex],
		backPath: `${seasonPath(seasonSummary, seasons)}#khoanh-khac`
	};
};
