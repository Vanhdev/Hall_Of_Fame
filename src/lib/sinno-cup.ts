export type TeamTone = 'champion' | 'silver' | 'bronze' | 'regular';
export type SeasonStatus = 'current' | 'upcoming' | 'previous';

export interface Team {
	rank: string;
	name: string;
	result: string;
	position: string;
	icon: string;
	image: string;
	tone: TeamTone;
	members: string[];
}

export interface TopScorer {
	name: string;
	team: string;
	goals: number;
}

export interface Match {
	home: string;
	homeScore: number;
	awayScore: number;
	away: string;
}

export interface Round {
	name: string;
	matches: Match[];
}

export interface Highlight {
	number: string;
	title: string;
	summary: string;
	tag: string;
	content: string;
}

export interface SeasonData {
	title: string;
	createdAt: number;
	status: SeasonStatus;
	date: string;
	venue: string;
	format: string;
	description: string;
	champion: string;
	mvp: string;
	quote: string;
	teams: Team[];
	topScorers: TopScorer[];
	rounds: Round[];
	highlights: Highlight[];
}

export type SeasonSummary = Pick<SeasonData, 'title' | 'createdAt' | 'status'>;

export interface CupData {
	seasons: Record<string, SeasonData>;
}

const previousSeason: SeasonData = {
	title: 'SINNO CUP · KỲ TRƯỚC',
	createdAt: 1,
	status: 'previous',
	date: 'Đã tổ chức',
	venue: 'Đã tổ chức',
	format: 'Đã tổ chức',
	description: 'Cùng nhìn lại những kết quả và khoảnh khắc của mùa giải.',
	champion: 'Đội Thu',
	mvp: '',
	quote: 'Có những chiến thắng không chỉ được đo bằng tỉ số, mà bằng những người đã cùng nhau đi đến tận cùng.',
	teams: [
		{ rank: '01', name: 'Đội Thu', result: 'Nhà vô địch', position: 'Nhà vô địch', icon: 'DT', image: '', tone: 'champion', members: [] },
		{ rank: '02', name: 'FC Độc Tày', result: 'Á quân', position: 'Á quân', icon: 'ĐT', image: '', tone: 'silver', members: [] },
		{ rank: '03', name: 'FC Đỉnh', result: 'Đồng hạng ba', position: 'Đồng hạng ba', icon: 'Đ', image: '', tone: 'bronze', members: [] },
		{ rank: '03', name: 'FC NDK', result: 'Đồng hạng ba', position: 'Đồng hạng ba', icon: 'N', image: '', tone: 'bronze', members: [] }
	],
	topScorers: [],
	highlights: [
		{
			number: '01',
			title: 'Hành trình lên ngôi',
			summary: 'Tỉ số và diễn biến trận đấu sẽ được cập nhật.',
			tag: 'CHUNG KẾT',
			content: ''
		},
		{
			number: '02',
			title: 'Những khoảnh khắc đáng nhớ',
			summary: 'Thêm ảnh, video và những pha bóng của giải đấu.',
			tag: 'KHOẢNH KHẮC',
			content: ''
		},
		{
			number: '03',
			title: 'Dấu ấn của các đội',
			summary: 'Một mùa giải, bốn đội bóng, thật nhiều kỷ niệm.',
			tag: 'SINNO CUP',
			content: ''
		}
	],
	rounds: [
		{
			name: 'Vòng 1',
			matches: [
				{ home: 'Đội Thu', homeScore: 6, awayScore: 0, away: 'FC Đỉnh' },
				{ home: 'FC NDK', homeScore: 5, awayScore: 5, away: 'FC Độc Tày' }
			]
		},
		{
			name: 'Vòng 2',
			matches: [
				{ home: 'FC NDK', homeScore: 2, awayScore: 2, away: 'FC Đỉnh' },
				{ home: 'FC Độc Tày', homeScore: 5, awayScore: 3, away: 'Đội Thu' }
			]
		},
		{
			name: 'Vòng 3',
			matches: [
				{ home: 'FC Đỉnh', homeScore: 3, awayScore: 3, away: 'FC Độc Tày' },
				{ home: 'Đội Thu', homeScore: 8, awayScore: 2, away: 'FC NDK' }
			]
		}
	]
};

const upcomingSeason: SeasonData = {
	title: 'SINNO CUP · KỲ TIẾP THEO',
	createdAt: 2,
	status: 'upcoming',
	date: 'Sẽ công bố',
	venue: 'Sẽ công bố',
	format: 'Sẽ công bố',
	description: 'Lịch thi đấu, thông tin đăng ký và danh sách đội sẽ được cập nhật tại đây sau khi được xác nhận.',
	champion: '',
	mvp: '',
	quote: '',
	teams: [],
	topScorers: [],
	rounds: [],
	highlights: []
};

export const defaultCupData: CupData = {
	seasons: {
		[previousSeason.title]: previousSeason,
		[upcomingSeason.title]: upcomingSeason
	},
};

export function createSeason(title: string, createdAt = Date.now()): SeasonData {
	return {
		title,
		createdAt,
		status: 'upcoming',
		date: '',
		venue: '',
		format: '',
		description: '',
		champion: '',
		mvp: '',
		quote: '',
		teams: [],
		topScorers: [],
		rounds: [],
		highlights: []
	};
}
