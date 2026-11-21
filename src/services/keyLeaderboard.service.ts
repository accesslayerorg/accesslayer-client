import { BaseApiService, type APIResponse } from './api.service';
import {
	analyticsService,
	type LeaderboardMetric,
	type KeyLeaderboardEntry,
	type KeyLeaderboardCreator,
	type RawKeyLeaderboardEntry,
} from './analytics.service';

export type {
	LeaderboardMetric,
	KeyLeaderboardEntry,
	KeyLeaderboardCreator,
	RawKeyLeaderboardEntry,
};

export type KeyHolderLeaderboardMetric = 'volume' | 'pnl' | 'holding_days';

export interface KeyHolderLeaderboardEntry {
	id: string;
	rank: number;
	wallet: string;
	score: number;
}

type RawKeyHolderLeaderboardEntry = Record<string, unknown>;

type KeyHolderLeaderboardPayload =
	| RawKeyHolderLeaderboardEntry[]
	| {
			entries?: RawKeyHolderLeaderboardEntry[];
			leaderboard?: RawKeyHolderLeaderboardEntry[];
			holders?: RawKeyHolderLeaderboardEntry[];
			data?: RawKeyHolderLeaderboardEntry[];
	  };

const SCORE_KEYS: Record<KeyHolderLeaderboardMetric, string[]> = {
	volume: ['score', 'metricValue', 'value', 'volume', 'volumeXlm', 'totalVolume'],
	pnl: ['score', 'metricValue', 'value', 'pnl', 'profitLoss', 'profit'],
	holding_days: [
		'score',
		'metricValue',
		'value',
		'holdingDays',
		'holding_days',
		'days',
	],
};

const WALLET_KEYS = ['wallet', 'walletAddress', 'address', 'holderAddress'];

function readString(entry: RawKeyHolderLeaderboardEntry, keys: string[]): string {
	for (const key of keys) {
		const value = entry[key];
		if (typeof value === 'string' && value.trim()) return value;
		if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	}
	return '';
}

function readNumber(entry: RawKeyHolderLeaderboardEntry, keys: string[]): number | null {
	for (const key of keys) {
		const value = entry[key];
		const candidate =
			typeof value === 'string' ? Number(value.replace(/,/g, '')) : value;
		if (typeof candidate === 'number' && Number.isFinite(candidate)) {
			return candidate;
		}
	}
	return null;
}

function extractEntries(payload: KeyHolderLeaderboardPayload | undefined | null) {
	if (Array.isArray(payload)) return payload;
	if (!payload || typeof payload !== 'object') return [];
	const entries =
		payload.entries ?? payload.leaderboard ?? payload.holders ?? payload.data ?? [];
	return Array.isArray(entries) ? entries : [];
}

export function normalizeKeyHolderLeaderboardEntry(
	raw: RawKeyHolderLeaderboardEntry,
	index: number,
	metric: KeyHolderLeaderboardMetric
): KeyHolderLeaderboardEntry {
	const wallet = readString(raw, WALLET_KEYS);
	const rank = readNumber(raw, ['rank', 'position']) ?? index + 1;
	const score = readNumber(raw, SCORE_KEYS[metric]) ?? 0;
	const id = readString(raw, ['id', 'holderId', 'walletId']) || `${rank}-${wallet}`;

	return { id, rank, wallet, score };
}

export class KeyLeaderboardService extends BaseApiService {
	async getKeyDiscoveryLeaderboard(
		metric: LeaderboardMetric = 'volume'
	): Promise<KeyLeaderboardEntry[]> {
		return analyticsService.getKeyDiscoveryLeaderboard(metric);
	}

	async getKeyHolderLeaderboard(
		keyId: string,
		metric: KeyHolderLeaderboardMetric
	): Promise<KeyHolderLeaderboardEntry[]> {
		try {
			const response = await this.api.get<APIResponse<KeyHolderLeaderboardPayload>>(
				`/keys/${keyId}/leaderboard`,
				{ params: { metric } }
			);

			const entries = extractEntries(response.data.data);
			return entries
				.map((entry, index) =>
					normalizeKeyHolderLeaderboardEntry(entry, index, metric)
				)
				.sort((a, b) => a.rank - b.rank);
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const keyLeaderboardService = new KeyLeaderboardService();
export const keyHolderLeaderboardService = keyLeaderboardService;
