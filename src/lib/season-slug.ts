import type { Highlight, SeasonSummary } from './sinno-cup';

export function seasonSlug(title: string): string {
	const slug = title
		.toLocaleLowerCase('vi')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/đ/g, 'd')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
	return slug || 'mua-giai';
}

export function seasonPath(season: SeasonSummary, seasons: SeasonSummary[]): string {
	const slug = seasonSlug(season.title);
	const hasCollision = seasons.some(
		(other) => other.title !== season.title && seasonSlug(other.title) === slug
	);
	return `/${slug}${hasCollision ? `-${season.createdAt}` : ''}`;
}

export function findSeasonBySlug(
	slug: string,
	seasons: SeasonSummary[]
): SeasonSummary | undefined {
	const requestedSlug = slug.toLocaleLowerCase('vi');
	return seasons.find((season) => {
		const generatedSlug = seasonPath(season, seasons).slice(1);
		if (generatedSlug.toLocaleLowerCase('vi') === requestedSlug) return true;

		const baseSlug = seasonSlug(season.title);
		return (
			baseSlug === requestedSlug &&
			!seasons.some((other) => other.title !== season.title && seasonSlug(other.title) === baseSlug)
		);
	});
}

export function highlightSlug(title: string): string {
	return seasonSlug(title);
}

export function highlightPath(
	season: SeasonSummary,
	highlight: Highlight,
	index: number,
	highlights: Highlight[],
	seasons: SeasonSummary[]
): string {
	const slug = highlightSlug(highlight.title);
	const hasCollision = highlights.some(
		(other, otherIndex) => otherIndex !== index && highlightSlug(other.title) === slug
	);
	return `${seasonPath(season, seasons)}/${slug}${hasCollision ? `-${index + 1}` : ''}`;
}
