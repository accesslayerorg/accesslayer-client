import { formatNumber } from '@/utils/numberFormat.utils';

export type KeyHolderLeaderboardMetric = 'volume' | 'pnl' | 'holding_days';

export interface KeyHolderLeaderboardEntry {
	rank: number;
	walletAddress: string;
	score: number;
	formattedScore?: string;
	avatarUrl?: string;
	displayName?: string;
}

export interface KeyHolderLeaderboardResponse {
	entries: KeyHolderLeaderboardEntry[];
	total: number;
	hasMore: boolean;
	nextCursor?: string | null;
	userRank?: KeyHolderLeaderboardEntry | null;
}

export interface GetKeyHolderLeaderboardOptions {
	metric: KeyHolderLeaderboardMetric;
	limit?: number;
	cursor?: string;
	userWallet?: string;
	signal?: AbortSignal;
}

export interface LeaderboardMetricTabConfig {
	id: KeyHolderLeaderboardMetric;
	label: string;
	description: string;
}

export const LEADERBOARD_METRIC_TABS: LeaderboardMetricTabConfig[] = [
	{
		id: 'volume',
		label: 'Volume',
		description: 'Ranked by total trading volume',
	},
	{
		id: 'pnl',
		label: 'PnL',
		description: 'Ranked by net profit and loss percentage',
	},
	{
		id: 'holding_days',
		label: 'Holding Days',
		description: 'Ranked by duration keys have been held',
	},
];

export function formatLeaderboardScore(
	score: number,
	metric: KeyHolderLeaderboardMetric
): string {
	if (!Number.isFinite(score)) return '0';
	switch (metric) {
		case 'volume':
			return `${formatNumber(score, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM`;
		case 'pnl':
			return `${score >= 0 ? '+' : ''}${formatNumber(score, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
		case 'holding_days':
			return `${Math.round(score)} day${Math.round(score) === 1 ? '' : 's'}`;
		default:
			return `${score}`;
	}
}

/** Pre-defined mock addresses for deterministic testing and fallback */
const MOCK_HOLDER_ADDRESSES = [
	'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFIZGK63PZZVVJAB7',
	'GCLWGQPMKXQSPF776IU33AH4PZNOOWNAWGGKVTBQMIC5IMKUNP3E6NVU',
	'GCEZGI7RJ3BMXQ22RVIWQSTHSN7LTWWOMYWJBHQ2LFD3KNPXMG7N7H5V',
	'GDNFQ5XW5TWMF7425Z3U4FUMDQQ35G34R2N3O5Y7P2A3C4D5E6F7G8H9',
	'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7',
	'GBDEVU63Y6NTHJQQZIKVTC23NWLQVPCH2H67ZAX72S5UCP2Q3T7PZ3K1',
	'GC4H74Y647M6NWKHC5A627NJVTCF4HQZ3H2H76JCKV4V5BN3K1L8M9P2',
	'GD7K93J1N4L8P5Q2R6T9V3W7X1Y4Z7A2B5C8D1E4F7G0H3J6K9L2M5N8',
	'GE1A4D7G0J3M6P9S2V5Y8B1E4H7K0N3Q6T9W2Z5C8F1I4L7O0R3U6X9A',
	'GF2B5E8H1K4N7Q0T3W6Z9C2F5I8L1O4R7U0X3A6D9G2J5M8P1S4V7Y0B',
	'GG3C6F9I2L5O8R1U4X7A0D3G6J9M2P5S8V1Y4B7E0H3K6N9Q2T5W8Z1C',
	'GH4D7G0J3M6P9S2V5Y8B1E4H7K0N3Q6T9W2Z5C8F1I4L7O0R3U6X9A2D',
	'GI5E8H1K4N7Q0T3W6Z9C2F5I8L1O4R7U0X3A6D9G2J5M8P1S4V7Y0B3E',
	'GJ6F9I2L5O8R1U4X7A0D3G6J9M2P5S8V1Y4B7E0H3K6N9Q2T5W8Z1C4F',
	'GK7G0J3M6P9S2V5Y8B1E4H7K0N3Q6T9W2Z5C8F1I4L7O0R3U6X9A2D5G',
	'GL8H1K4N7Q0T3W6Z9C2F5I8L1O4R7U0X3A6D9G2J5M8P1S4V7Y0B3E6H',
	'GM9I2L5O8R1U4X7A0D3G6J9M2P5S8V1Y4B7E0H3K6N9Q2T5W8Z1C4F7I',
	'GN0J3M6P9S2V5Y8B1E4H7K0N3Q6T9W2Z5C8F1I4L7O0R3U6X9A2D5G8J',
	'GO1K4N7Q0T3W6Z9C2F5I8L1O4R7U0X3A6D9G2J5M8P1S4V7Y0B3E6H9K',
	'GP2L5O8R1U4X7A0D3G6J9M2P5S8V1Y4B7E0H3K6N9Q2T5W8Z1C4F7I0L',
	'GQ3M6P9S2V5Y8B1E4H7K0N3Q6T9W2Z5C8F1I4L7O0R3U6X9A2D5G8J1M',
	'GR4N7Q0T3W6Z9C2F5I8L1O4R7U0X3A6D9G2J5M8P1S4V7Y0B3E6H9K2N',
	'GS5O8R1U4X7A0D3G6J9M2P5S8V1Y4B7E0H3K6N9Q2T5W8Z1C4F7I0L3O',
	'GT6P9S2V5Y8B1E4H7K0N3Q6T9W2Z5C8F1I4L7O0R3U6X9A2D5G8J1M4P',
	'GU7Q0T3W6Z9C2F5I8L1O4R7U0X3A6D9G2J5M8P1S4V7Y0B3E6H9K2N5Q',
];

export function generateMockKeyHolderLeaderboard(
	_keyId: string,
	options: GetKeyHolderLeaderboardOptions
): KeyHolderLeaderboardResponse {
	const { metric, limit = 10, cursor, userWallet } = options;
	const offset = cursor ? parseInt(cursor, 10) || 0 : 0;
	const total = MOCK_HOLDER_ADDRESSES.length;

	const allEntries: KeyHolderLeaderboardEntry[] = MOCK_HOLDER_ADDRESSES.map(
		(walletAddress, index) => {
			const rank = index + 1;
			let score = 0;

			if (metric === 'volume') {
				// Volume from ~50,000 XLM down
				score = Math.max(100, Math.round((50000 / rank) * 100) / 100);
			} else if (metric === 'pnl') {
				// PnL percentage from +150% down
				score = Math.round((150 - (rank - 1) * 5.8) * 10) / 10;
			} else {
				// Holding days from 200 days down
				score = Math.max(1, Math.round(200 - (rank - 1) * 7.5));
			}

			return {
				rank,
				walletAddress,
				score,
				formattedScore: formatLeaderboardScore(score, metric),
			};
		}
	);

	const pageEntries = allEntries.slice(offset, offset + limit);
	const nextOffset = offset + limit;
	const hasMore = nextOffset < total;

	let userRank: KeyHolderLeaderboardEntry | null = null;
	if (userWallet) {
		const normalizedUser = userWallet.toLowerCase();
		const found = allEntries.find(
			e => e.walletAddress.toLowerCase() === normalizedUser
		);
		if (found) {
			userRank = found;
		} else {
			// Simulated user ranking outside top 10 (e.g. rank 24)
			const mockUserRank = 24;
			let userScore = 0;
			if (metric === 'volume') userScore = 1250;
			else if (metric === 'pnl') userScore = 18.5;
			else userScore = 28;

			userRank = {
				rank: mockUserRank,
				walletAddress: userWallet,
				score: userScore,
				formattedScore: formatLeaderboardScore(userScore, metric),
			};
		}
	}

	return {
		entries: pageEntries,
		total,
		hasMore,
		nextCursor: hasMore ? String(nextOffset) : null,
		userRank,
	};
}
