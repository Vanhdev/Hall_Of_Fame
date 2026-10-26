import {
	createPool,
	type Pool,
	type PoolConnection,
	type ResultSetHeader,
	type RowDataPacket
} from 'mysql2/promise';
import sanitizeHtml from 'sanitize-html';
import {
	defaultCupData,
	type CupData,
	type Match,
	type SeasonData,
	type SeasonSummary,
	type TeamTone
} from '../sinno-cup';

export class CupDataValidationError extends Error {}

const highlightHtmlOptions: sanitizeHtml.IOptions = {
	allowedTags: [
		'p',
		'div',
		'br',
		'strong',
		'b',
		'em',
		'i',
		'u',
		's',
		'ul',
		'ol',
		'li',
		'h2',
		'h3',
		'blockquote',
		'a',
		'img'
	],
	allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt'] },
	allowedSchemes: ['http', 'https', 'mailto'],
	allowedSchemesByTag: { img: ['data'] },
	allowedStyles: {},
	enforceHtmlBoundary: true,
	exclusiveFilter: (frame) =>
		frame.tag === 'img' &&
		(!(frame.attribs.src?.length <= 700_000) ||
			!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
				frame.attribs.src ?? ''
			)),
	transformTags: {
		a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' })
	}
};

function sanitizeHighlightHtml(html: string): string {
	return sanitizeHtml(html, highlightHtmlOptions);
}

interface LegacyCupRow extends RowDataPacket {
	data: CupData | string;
}

interface SeasonSummaryRow extends RowDataPacket {
	title: string;
	createdAt: number;
	status: SeasonSummary['status'];
}

interface SeasonDetailRow extends RowDataPacket {
	title: string;
	createdAt: number;
	status: SeasonData['status'];
	date: string;
	venue: string;
	format: string;
	description: string;
	champion: string;
	mvp: string;
	quote: string;
}

interface TeamRow extends RowDataPacket {
	id: number;
	rank: string;
	name: string;
	result: string;
	position: string;
	icon: string;
	image: string;
	tone: TeamTone;
}

interface MemberRow extends RowDataPacket {
	teamId: number;
	name: string;
}

interface TopScorerRow extends RowDataPacket {
	name: string;
	team: string;
	goals: number;
}

interface RoundRow extends RowDataPacket {
	id: number;
	name: string;
}

interface MatchRow extends RowDataPacket {
	roundId: number;
	home: string;
	homeScore: number;
	awayScore: number;
	away: string;
}

interface HighlightRow extends RowDataPacket {
	number: string;
	title: string;
	summary: string;
	tag: string;
	content: string;
}

const globalForCupDatabase = globalThis as typeof globalThis & {
	sinnoCupPool?: Pool;
	sinnoCupRelationalSchemaReady?: Promise<void>;
};

const pool =
	globalForCupDatabase.sinnoCupPool ??
	createPool({
		host: process.env.DB_HOST ?? '127.0.0.1',
		port: Number(process.env.DB_PORT ?? 3307),
		user: process.env.DB_USER ?? 'sinno',
		password: process.env.DB_PASSWORD ?? 'sinno',
		database: process.env.DB_NAME ?? 'sinno',
		waitForConnections: true,
		connectionLimit: 10,
		maxIdle: 5,
		idleTimeout: 60_000,
		queueLimit: 0,
		enableKeepAlive: true,
		charset: 'utf8mb4'
	});

globalForCupDatabase.sinnoCupPool = pool;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertText(value: unknown, field: string, maxLength = 300): asserts value is string {
	if (typeof value !== 'string' || value.length > maxLength) {
		throw new CupDataValidationError(`${field} must be text with at most ${maxLength} characters`);
	}
}

function assertRequiredText(value: unknown, field: string, maxLength = 300): asserts value is string {
	assertText(value, field, maxLength);
	if (!value.trim()) throw new CupDataValidationError(`${field} cannot be empty`);
}

function assertSeason(value: unknown, key: string): asserts value is SeasonData {
	if (!isRecord(value)) throw new CupDataValidationError(`Invalid season: ${key}`);
	assertRequiredText(value.title, `${key}.title`, 100);
	if (value.title !== key) throw new CupDataValidationError('Season keys must match their names');
	if (['__proto__', 'constructor', 'prototype'].includes(key)) {
		throw new CupDataValidationError('This season name cannot be used as a key');
	}
	if (!Number.isSafeInteger(value.createdAt) || Number(value.createdAt) < 0) {
		throw new CupDataValidationError(`Invalid creation time for ${key}`);
	}
	if (!['current', 'upcoming', 'previous'].includes(String(value.status))) {
		throw new CupDataValidationError(`Invalid status for ${key}`);
	}
	for (const field of [
		'date',
		'venue',
		'format',
		'description',
		'champion',
		'mvp',
		'quote'
	] as const) {
		assertText(value[field], `${key}.${field}`);
	}

	const { teams, topScorers, rounds, highlights } = value;
	if (!Array.isArray(teams) || teams.length > 32) {
		throw new CupDataValidationError('Add no more than 32 teams');
	}
	for (const team of teams) {
		if (!isRecord(team)) throw new CupDataValidationError('Invalid team entry');
		assertText(team.rank, 'team.rank', 20);
		assertRequiredText(team.name, 'team.name', 80);
		assertRequiredText(team.result, 'team.result', 80);
		assertRequiredText(team.position, 'team.position', 80);
		assertText(team.icon, 'team.icon', 8);
		if (team.image !== undefined) {
			assertText(team.image, 'team.image', 700_000);
			if (
				team.image &&
				!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(team.image)
			) {
				throw new CupDataValidationError('Team images must be JPEG, PNG, or WebP files');
			}
		}
		if (!['champion', 'silver', 'bronze', 'regular'].includes(String(team.tone))) {
			throw new CupDataValidationError('Invalid team ranking style');
		}
		if (!Array.isArray(team.members) || team.members.length > 100) {
			throw new CupDataValidationError('Add no more than 100 members per team');
		}
		for (const member of team.members) {
			assertRequiredText(member, 'team.members[]', 100);
		}
	}

	if (!Array.isArray(topScorers) || topScorers.length > 100) {
		throw new CupDataValidationError('Add no more than 100 top scorers');
	}
	for (const scorer of topScorers) {
		if (!isRecord(scorer)) throw new CupDataValidationError('Invalid top scorer entry');
		assertRequiredText(scorer.name, 'topScorer.name', 100);
		assertRequiredText(scorer.team, 'topScorer.team', 80);
		if (!Number.isInteger(scorer.goals) || Number(scorer.goals) < 0 || Number(scorer.goals) > 999) {
			throw new CupDataValidationError('Top scorer goals must be a whole number from 0 to 999');
		}
	}

	if (!Array.isArray(rounds) || rounds.length > 20) {
		throw new CupDataValidationError('Add no more than 20 rounds');
	}
	for (const round of rounds) {
		if (!isRecord(round) || !Array.isArray(round.matches) || round.matches.length > 32) {
			throw new CupDataValidationError('Invalid round or match list');
		}
		assertRequiredText(round.name, 'round.name', 80);
		for (const match of round.matches) {
			if (!isRecord(match)) throw new CupDataValidationError('Invalid match entry');
			assertRequiredText(match.home, 'match.home', 80);
			assertRequiredText(match.away, 'match.away', 80);
			if (
				!Number.isInteger(match.homeScore) ||
				Number(match.homeScore) < 0 ||
				Number(match.homeScore) > 99 ||
				!Number.isInteger(match.awayScore) ||
				Number(match.awayScore) < 0 ||
				Number(match.awayScore) > 99
			) {
				throw new CupDataValidationError('Match scores must be whole numbers from 0 to 99');
			}
		}
	}

	if (!Array.isArray(highlights) || highlights.length > 30) {
		throw new CupDataValidationError('Add no more than 30 highlights');
	}
	for (const highlight of highlights) {
		if (!isRecord(highlight)) throw new CupDataValidationError('Invalid highlight entry');
		assertText(highlight.number, 'highlight.number', 20);
		assertRequiredText(highlight.title, 'highlight.title', 120);
		assertText(highlight.summary, 'highlight.summary', 500);
		assertText(highlight.tag, 'highlight.tag', 40);
		assertText(highlight.content, 'highlight.content', 2_000_000);
	}
}

function assertCupData(value: unknown): asserts value is CupData {
	if (!isRecord(value) || !isRecord(value.seasons)) {
		throw new CupDataValidationError('Cup data must contain named seasons');
	}
	const entries = Object.entries(value.seasons);
	if (entries.length === 0 || entries.length > 100) {
		throw new CupDataValidationError('Cup data must contain between 1 and 100 seasons');
	}

	const creationTimes = new Set<number>();
	const statuses = new Set<string>();
	for (const [key, season] of entries) {
		assertSeason(season, key);
		if (creationTimes.has(season.createdAt)) {
			throw new CupDataValidationError('Season creation times must be unique');
		}
		creationTimes.add(season.createdAt);
		if (season.status !== 'previous' && statuses.has(season.status)) {
			throw new CupDataValidationError(`Only one season can have status ${season.status}`);
		}
		statuses.add(season.status);
	}
}

function normalizeTeamData(value: unknown): unknown {
	if (!isRecord(value) || !Array.isArray(value.teams)) return value;
	return {
		...value,
		teams: value.teams.map((team) =>
			isRecord(team)
				? {
						...team,
						position: team.position ?? team.result,
						members: team.members ?? [],
						image: team.image ?? ''
					}
				: team
		),
		topScorers: value.topScorers ?? []
	};
}

function normalizeHighlightData(value: unknown): unknown {
	if (!isRecord(value) || !Array.isArray(value.highlights)) return value;
	return {
		...value,
		highlights: value.highlights.map((highlight) => {
			if (!isRecord(highlight)) return highlight;
			const content = Array.isArray(highlight.contents)
				? highlight.contents
						.map((block) => {
							if (!isRecord(block)) return '';
							if (block.type === 'text' && typeof block.text === 'string') {
								return block.text;
							}
							if (block.type === 'image' && typeof block.image === 'string') {
								const alt =
									typeof block.alt === 'string'
										? block.alt.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
										: '';
								return `<p><img src="${block.image}" alt="${alt}"></p>`;
							}
							return '';
						})
						.join('')
				: typeof highlight.content === 'string'
					? highlight.content
					: '';
			return {
				...highlight,
				summary: highlight.summary ?? highlight.detail ?? '',
				content
			};
		})
	};
}

function migrateLegacyCupData(value: unknown): CupData {
	if (!isRecord(value) || !isRecord(value.current) || !isRecord(value.upcoming)) {
		throw new CupDataValidationError('Cup data has an unsupported format');
	}

	const previous: Record<string, unknown> = {
		...value.current,
		createdAt: 1,
		status: 'previous',
		description: 'Cùng nhìn lại những kết quả và khoảnh khắc của mùa giải.'
	};
	const current: Record<string, unknown> = {
		...value.upcoming,
		createdAt: 2,
		status: 'upcoming',
		champion: '',
		mvp: '',
		quote: '',
		teams: [],
		topScorers: [],
		rounds: [],
		highlights: []
	};
	assertRequiredText(previous.title, 'current.title', 100);
	assertRequiredText(current.title, 'upcoming.title', 100);
	if (previous.title === current.title) {
		throw new CupDataValidationError('Legacy season names must be unique to migrate');
	}
	const seasons = Object.fromEntries([
		[previous.title, normalizeTeamData(normalizeHighlightData(previous))],
		[current.title, current]
	]);
	const migrated: unknown = { seasons };
	assertCupData(migrated);
	return migrated;
}

function normalizeStoredCupData(value: unknown): CupData {
	if (!isRecord(value) || !isRecord(value.seasons)) return migrateLegacyCupData(value);

	const seasons: Record<string, unknown> = {};
	for (const [key, storedSeason] of Object.entries(value.seasons)) {
		if (!isRecord(storedSeason)) throw new CupDataValidationError(`Invalid season: ${key}`);
		seasons[key] = normalizeTeamData(normalizeHighlightData({
			...storedSeason,
			status:
				storedSeason.status === 'completed'
					? 'previous'
					: storedSeason.status ?? (value.currentSeason === key ? 'current' : 'previous')
		}));
	}

	const normalized: unknown = { seasons };
	assertCupData(normalized);
	return normalized;
}

const relationalSchema = [
	`CREATE TABLE IF NOT EXISTS seasons (
		title VARCHAR(100) NOT NULL PRIMARY KEY,
		created_at BIGINT UNSIGNED NOT NULL,
		status VARCHAR(16) NOT NULL,
		date VARCHAR(300) NOT NULL,
		venue VARCHAR(300) NOT NULL,
		format VARCHAR(300) NOT NULL,
		description VARCHAR(300) NOT NULL,
		champion VARCHAR(300) NOT NULL,
		mvp VARCHAR(300) NOT NULL,
		quote VARCHAR(300) NOT NULL,
		INDEX seasons_status_created_at (status, created_at)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS teams (
		id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
		season_title VARCHAR(100) NOT NULL,
		position_index SMALLINT UNSIGNED NOT NULL,
		rank_label VARCHAR(20) NOT NULL,
		name VARCHAR(80) NOT NULL,
		result VARCHAR(80) NOT NULL,
		position_label VARCHAR(80) NOT NULL,
		icon VARCHAR(8) NOT NULL,
		image MEDIUMTEXT NOT NULL,
		tone VARCHAR(16) NOT NULL,
		UNIQUE KEY teams_season_position (season_title, position_index),
		CONSTRAINT teams_season_fk FOREIGN KEY (season_title) REFERENCES seasons (title) ON DELETE CASCADE
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS team_members (
		id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
		team_id BIGINT UNSIGNED NOT NULL,
		position_index SMALLINT UNSIGNED NOT NULL,
		name VARCHAR(100) NOT NULL,
		UNIQUE KEY members_team_position (team_id, position_index),
		CONSTRAINT members_team_fk FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS top_scorers (
		id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
		season_title VARCHAR(100) NOT NULL,
		position_index SMALLINT UNSIGNED NOT NULL,
		name VARCHAR(100) NOT NULL,
		team VARCHAR(80) NOT NULL,
		goals SMALLINT UNSIGNED NOT NULL,
		UNIQUE KEY scorers_season_position (season_title, position_index),
		CONSTRAINT scorers_season_fk FOREIGN KEY (season_title) REFERENCES seasons (title) ON DELETE CASCADE
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS rounds (
		id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
		season_title VARCHAR(100) NOT NULL,
		position_index SMALLINT UNSIGNED NOT NULL,
		name VARCHAR(80) NOT NULL,
		UNIQUE KEY rounds_season_position (season_title, position_index),
		CONSTRAINT rounds_season_fk FOREIGN KEY (season_title) REFERENCES seasons (title) ON DELETE CASCADE
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS matches (
		id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
		round_id BIGINT UNSIGNED NOT NULL,
		position_index SMALLINT UNSIGNED NOT NULL,
		home VARCHAR(80) NOT NULL,
		home_score TINYINT UNSIGNED NOT NULL,
		away_score TINYINT UNSIGNED NOT NULL,
		away VARCHAR(80) NOT NULL,
		UNIQUE KEY matches_round_position (round_id, position_index),
		CONSTRAINT matches_round_fk FOREIGN KEY (round_id) REFERENCES rounds (id) ON DELETE CASCADE
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS highlights (
		id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
		season_title VARCHAR(100) NOT NULL,
		position_index SMALLINT UNSIGNED NOT NULL,
		number_label VARCHAR(20) NOT NULL,
		title VARCHAR(120) NOT NULL,
		summary VARCHAR(500) NOT NULL DEFAULT '',
		tag VARCHAR(40) NOT NULL,
		content MEDIUMTEXT NOT NULL,
		UNIQUE KEY highlights_season_position (season_title, position_index),
		CONSTRAINT highlights_season_fk FOREIGN KEY (season_title) REFERENCES seasons (title) ON DELETE CASCADE
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS sinno_cup_migrations (
		version INT UNSIGNED NOT NULL PRIMARY KEY,
		applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

async function insertCupData(connection: PoolConnection, data: CupData): Promise<void> {
	for (const season of Object.values(data.seasons)) {
		await connection.execute(
			`INSERT INTO seasons
				(title, created_at, status, date, venue, format, description, champion, mvp, quote)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				season.title,
				season.createdAt,
				season.status,
				season.date,
				season.venue,
				season.format,
				season.description,
				season.champion,
				season.mvp,
				season.quote
			]
		);

		for (const [teamIndex, team] of season.teams.entries()) {
			const [teamResult] = await connection.execute<ResultSetHeader>(
				`INSERT INTO teams
					(season_title, position_index, rank_label, name, result, position_label, icon, image, tone)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					season.title,
					teamIndex,
					team.rank,
					team.name,
					team.result,
					team.position,
					team.icon,
					team.image ?? '',
					team.tone
				]
			);
			for (const [memberIndex, name] of team.members.entries()) {
				await connection.execute(
					'INSERT INTO team_members (team_id, position_index, name) VALUES (?, ?, ?)',
					[teamResult.insertId, memberIndex, name]
				);
			}
		}

		for (const [index, scorer] of season.topScorers.entries()) {
			await connection.execute(
				`INSERT INTO top_scorers
					(season_title, position_index, name, team, goals)
				VALUES (?, ?, ?, ?, ?)`,
				[season.title, index, scorer.name, scorer.team, scorer.goals]
			);
		}

		for (const [roundIndex, round] of season.rounds.entries()) {
			const [roundResult] = await connection.execute<ResultSetHeader>(
				'INSERT INTO rounds (season_title, position_index, name) VALUES (?, ?, ?)',
				[season.title, roundIndex, round.name]
			);
			for (const [matchIndex, match] of round.matches.entries()) {
				await connection.execute(
					`INSERT INTO matches
						(round_id, position_index, home, home_score, away_score, away)
					VALUES (?, ?, ?, ?, ?, ?)`,
					[
						roundResult.insertId,
						matchIndex,
						match.home,
						match.homeScore,
						match.awayScore,
						match.away
					]
				);
			}
		}

		for (const [index, highlight] of season.highlights.entries()) {
			await connection.execute(
				`INSERT INTO highlights
					(season_title, position_index, number_label, title, summary, tag, content)
				VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[
					season.title,
					index,
					highlight.number,
					highlight.title,
					highlight.summary,
					highlight.tag,
					highlight.content
				]
			);
		}
	}
}

async function persistCupData(connection: PoolConnection, data: CupData): Promise<void> {
	await connection.execute('DELETE FROM seasons');
	await insertCupData(connection, data);
}

async function ensureCupSchema(): Promise<void> {
	globalForCupDatabase.sinnoCupRelationalSchemaReady ??= (async () => {
		for (const statement of relationalSchema) await pool.execute(statement);

		const connection = await pool.getConnection();
		let migrationLockAcquired = false;
		try {
			const [lockRows] = await connection.query<RowDataPacket[]>(
				'SELECT GET_LOCK(?, 30) AS acquired',
				['sinno_cup_relational_migration']
			);
			if (Number(lockRows[0]?.acquired) !== 1) {
				throw new Error('Could not acquire the SINNO CUP database migration lock');
			}
			migrationLockAcquired = true;

			const [migrationRows] = await connection.execute<RowDataPacket[]>(
				'SELECT version FROM sinno_cup_migrations WHERE version = ?',
				[1]
			);
			if (migrationRows.length === 0) {
				const [legacyTableRows] = await connection.execute<RowDataPacket[]>(
					`SELECT COUNT(*) AS tableCount FROM information_schema.tables
					WHERE table_schema = DATABASE() AND table_name = ?`,
					['sinno_cup_data']
				);
				let migratedData = defaultCupData;
				if (Number(legacyTableRows[0]?.tableCount) > 0) {
					const [legacyRows] = await connection.execute<LegacyCupRow[]>(
						'SELECT data FROM sinno_cup_data WHERE id = ?',
						[1]
					);
					if (!legacyRows[0]) throw new Error('SINNO CUP legacy data row is missing');

					const stored: unknown =
						typeof legacyRows[0].data === 'string'
							? JSON.parse(legacyRows[0].data)
							: legacyRows[0].data;
					migratedData = normalizeStoredCupData(stored);
				}
				try {
					await connection.beginTransaction();
					await persistCupData(connection, migratedData);
					await connection.execute(
						'INSERT INTO sinno_cup_migrations (version) VALUES (?)',
						[1]
					);
					await connection.commit();
				} catch (error) {
					await connection.rollback();
					throw error;
				}
			}

			const [summaryColumns] = await connection.execute<RowDataPacket[]>(
				`SELECT COUNT(*) AS columnCount FROM information_schema.columns
				WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
				['highlights', 'summary']
			);
			if (Number(summaryColumns[0]?.columnCount) === 0) {
				await connection.execute(
					"ALTER TABLE highlights ADD COLUMN summary VARCHAR(500) NOT NULL DEFAULT ''"
				);
			}

			const [detailColumns] = await connection.execute<RowDataPacket[]>(
				`SELECT COUNT(*) AS columnCount FROM information_schema.columns
				WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
				['highlights', 'detail']
			);
			const [contentMigrationRows] = await connection.execute<RowDataPacket[]>(
				'SELECT version FROM sinno_cup_migrations WHERE version = ?',
				[2]
			);
			if (contentMigrationRows.length === 0) {
				try {
					await connection.beginTransaction();
					if (Number(detailColumns[0]?.columnCount) > 0) {
						await connection.execute(
							'UPDATE highlights SET summary = detail WHERE summary = ?',
							['']
						);
					}
					await connection.execute(
						'INSERT INTO sinno_cup_migrations (version) VALUES (?)',
						[2]
					);
					await connection.commit();
				} catch (error) {
					await connection.rollback();
					throw error;
				}
			}

			const [legacyDetailColumns] = await connection.execute<RowDataPacket[]>(
				`SELECT COUNT(*) AS columnCount FROM information_schema.columns
				WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
				['highlights', 'detail']
			);
			const [cleanupMigrationRows] = await connection.execute<RowDataPacket[]>(
				'SELECT version FROM sinno_cup_migrations WHERE version = ?',
				[3]
			);
			if (cleanupMigrationRows.length === 0) {
				if (Number(legacyDetailColumns[0]?.columnCount) > 0) {
					await connection.execute('ALTER TABLE highlights DROP COLUMN detail');
				}
				await connection.execute(
					'INSERT INTO sinno_cup_migrations (version) VALUES (?)',
					[3]
				);
			}

			const [richTextMigrationRows] = await connection.execute<RowDataPacket[]>(
				'SELECT version FROM sinno_cup_migrations WHERE version = ?',
				[4]
			);
			if (richTextMigrationRows.length === 0) {
				const [contentTableRows] = await connection.execute<RowDataPacket[]>(
					`SELECT COUNT(*) AS tableCount FROM information_schema.tables
					WHERE table_schema = DATABASE() AND table_name = ?`,
					['highlight_contents']
				);
				if (Number(contentTableRows[0]?.tableCount) > 0) {
					await connection.execute(
						'ALTER TABLE highlight_contents MODIFY text_content MEDIUMTEXT NOT NULL'
					);
				}
				await connection.execute(
					'INSERT INTO sinno_cup_migrations (version) VALUES (?)',
					[4]
				);
			}

			const [contentColumns] = await connection.execute<RowDataPacket[]>(
				`SELECT COUNT(*) AS columnCount FROM information_schema.columns
				WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
				['highlights', 'content']
			);
			if (Number(contentColumns[0]?.columnCount) === 0) {
				await connection.execute('ALTER TABLE highlights ADD COLUMN content MEDIUMTEXT NULL');
			}

			const [singleContentMigrationRows] = await connection.execute<RowDataPacket[]>(
				'SELECT version FROM sinno_cup_migrations WHERE version = ?',
				[5]
			);
			if (singleContentMigrationRows.length === 0) {
				const [contentTableRows] = await connection.execute<RowDataPacket[]>(
					`SELECT COUNT(*) AS tableCount FROM information_schema.tables
					WHERE table_schema = DATABASE() AND table_name = ?`,
					['highlight_contents']
				);
				if (Number(contentTableRows[0]?.tableCount) > 0) {
					const [blockRows] = await connection.execute<RowDataPacket[]>(
						`SELECT c.highlight_id AS highlightId, c.position_index AS positionIndex,
							c.content_type AS type, c.text_content AS text, c.image, c.alt
						FROM highlight_contents c
						JOIN highlights h ON h.id = c.highlight_id
						ORDER BY c.highlight_id, c.position_index`
					);
					const contentByHighlight = new Map<number, string>();
					for (const block of blockRows) {
						const current = contentByHighlight.get(Number(block.highlightId)) ?? '';
						if (block.type === 'text' && typeof block.text === 'string') {
							contentByHighlight.set(
								Number(block.highlightId),
								current + sanitizeHighlightHtml(block.text)
							);
						} else if (
							block.type === 'image' &&
							typeof block.image === 'string' &&
							/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(block.image)
						) {
							const alt =
								typeof block.alt === 'string'
									? block.alt
											.replace(/&/g, '&amp;')
											.replace(/"/g, '&quot;')
											.replace(/</g, '&lt;')
									: '';
							contentByHighlight.set(
								Number(block.highlightId),
								current +
									sanitizeHighlightHtml(`<p><img src="${block.image}" alt="${alt}"></p>`)
							);
						}
					}
					for (const [highlightId, content] of contentByHighlight) {
						await connection.execute(
							'UPDATE highlights SET content = ? WHERE id = ?',
							[content, highlightId]
						);
					}
					await connection.execute('DROP TABLE highlight_contents');
				}
				await connection.execute("UPDATE highlights SET content = '' WHERE content IS NULL");
				await connection.execute(
					'ALTER TABLE highlights MODIFY content MEDIUMTEXT NOT NULL'
				);
				await connection.execute(
					'INSERT INTO sinno_cup_migrations (version) VALUES (?)',
					[5]
				);
			}
		} finally {
			try {
				if (migrationLockAcquired) {
					await connection.query('SELECT RELEASE_LOCK(?)', [
						'sinno_cup_relational_migration'
					]);
				}
			} finally {
				connection.release();
			}
		}
	})().catch((error: unknown) => {
		globalForCupDatabase.sinnoCupRelationalSchemaReady = undefined;
		throw error;
	});
	await globalForCupDatabase.sinnoCupRelationalSchemaReady;
}

export async function readSeasonSummaries(): Promise<SeasonSummary[]> {
	await ensureCupSchema();
	const [rows] = await pool.execute<SeasonSummaryRow[]>(
		`SELECT title, created_at AS createdAt, status
		FROM seasons ORDER BY created_at DESC`
	);
	return rows.map((row) => ({
		title: row.title,
		createdAt: Number(row.createdAt),
		status: row.status
	}));
}

async function readSeasonFromConnection(
	connection: PoolConnection,
	title: string
): Promise<SeasonData | undefined> {
	const [seasonRows] = await connection.execute<SeasonDetailRow[]>(
		`SELECT title, created_at AS createdAt, status, date, venue, format, description,
			champion, mvp, quote
		FROM seasons WHERE title = ?`,
		[title]
	);
	const row = seasonRows[0];
	if (!row) return undefined;

	const [teamRows] = await connection.execute<TeamRow[]>(
		`SELECT id, rank_label AS \`rank\`, name, result, position_label AS position, icon, image, tone
		FROM teams WHERE season_title = ? ORDER BY position_index`,
		[title]
	);
	const [memberRows] = await connection.execute<MemberRow[]>(
		`SELECT team_id AS teamId, name FROM team_members
		WHERE team_id IN (SELECT id FROM teams WHERE season_title = ?)
		ORDER BY team_id, position_index`,
		[title]
	);
	const membersByTeam = new Map<number, string[]>();
	for (const member of memberRows) {
		const members = membersByTeam.get(member.teamId) ?? [];
		members.push(member.name);
		membersByTeam.set(member.teamId, members);
	}

	const [scorerRows] = await connection.execute<TopScorerRow[]>(
		`SELECT name, team, goals FROM top_scorers
		WHERE season_title = ? ORDER BY position_index`,
		[title]
	);
	const [roundRows] = await connection.execute<RoundRow[]>(
		`SELECT id, name FROM rounds WHERE season_title = ? ORDER BY position_index`,
		[title]
	);
	const [matchRows] = await connection.execute<MatchRow[]>(
		`SELECT round_id AS roundId, home, home_score AS homeScore,
			away_score AS awayScore, away
		FROM matches
		WHERE round_id IN (SELECT id FROM rounds WHERE season_title = ?)
		ORDER BY round_id, position_index`,
		[title]
	);
	const matchesByRound = new Map<number, Match[]>();
	for (const match of matchRows) {
		const matches = matchesByRound.get(match.roundId) ?? [];
		matches.push({
			home: match.home,
			homeScore: Number(match.homeScore),
			awayScore: Number(match.awayScore),
			away: match.away
		});
		matchesByRound.set(match.roundId, matches);
	}
	const [highlightRows] = await connection.execute<HighlightRow[]>(
		`SELECT number_label AS number, title, summary, tag, content
		FROM highlights WHERE season_title = ? ORDER BY position_index`,
		[title]
	);

	const season: SeasonData = {
		title: row.title,
		createdAt: Number(row.createdAt),
		status: row.status,
		date: row.date,
		venue: row.venue,
		format: row.format,
		description: row.description,
		champion: row.champion,
		mvp: row.mvp,
		quote: row.quote,
		teams: teamRows.map((team) => ({
			rank: team.rank,
			name: team.name,
			result: team.result,
			position: team.position,
			icon: team.icon,
			image: team.image,
			tone: team.tone,
			members: membersByTeam.get(team.id) ?? []
		})),
		topScorers: scorerRows.map((scorer) => ({
			name: scorer.name,
			team: scorer.team,
			goals: Number(scorer.goals)
		})),
		rounds: roundRows.map((round) => ({
			name: round.name,
			matches: matchesByRound.get(round.id) ?? []
		})),
		highlights: highlightRows.map((highlight) => ({
			number: highlight.number,
			title: highlight.title,
			summary: highlight.summary,
			tag: highlight.tag,
			content: sanitizeHighlightHtml(highlight.content)
		}))
	};
	assertSeason(season, title);
	return season;
}

export async function readCupSeason(title: string): Promise<SeasonData | undefined> {
	await ensureCupSchema();
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();
		const season = await readSeasonFromConnection(connection, title);
		await connection.commit();
		return season;
	} catch (error) {
		await connection.rollback();
		throw error;
	} finally {
		connection.release();
	}
}

export async function readCupData(): Promise<CupData> {
	await ensureCupSchema();
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();
		const [summaries] = await connection.execute<SeasonSummaryRow[]>(
			`SELECT title, created_at AS createdAt, status
			FROM seasons ORDER BY created_at DESC`
		);
		const entries: Array<[string, SeasonData]> = [];
		for (const { title } of summaries) {
			const season = await readSeasonFromConnection(connection, title);
			if (!season) throw new Error(`Season disappeared while reading: ${title}`);
			entries.push([title, season]);
		}
		await connection.commit();
		return { seasons: Object.fromEntries(entries) };
	} catch (error) {
		await connection.rollback();
		throw error;
	} finally {
		connection.release();
	}
}

export async function writeCupData(data: unknown): Promise<CupData> {
	assertCupData(data);
	const validated = structuredClone(data);
	for (const season of Object.values(validated.seasons)) {
		for (const highlight of season.highlights) {
			highlight.content = sanitizeHighlightHtml(highlight.content);
		}
	}
	await ensureCupSchema();
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();
		await persistCupData(connection, validated);
		await connection.commit();
		return validated;
	} catch (error) {
		await connection.rollback();
		throw error;
	} finally {
		connection.release();
	}
}
