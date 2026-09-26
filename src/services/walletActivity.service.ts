// src/services/walletActivity.service.ts
import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';

/**
 * All event types surfaced in the wallet activity feed.
 * buy/sell — key trades
 * stake/unstake — staking operations
 * claim — staking reward claims
 * governance_vote — governance votes
 */
export type WalletActivityEventType =
	| 'buy'
	| 'sell'
	| 'stake'
	| 'unstake'
	| 'claim'
	| 'governance_vote';

/**
 * Single wallet activity entry returned from the activity feed.
 *
 * Covers all six event types. Fields that are not relevant to a given
 * event type are left undefined (e.g. `proposalId` only appears for
 * governance_vote events; `amount`/`price` are omitted for claim events).
 */
export interface WalletActivityTrade {
	id: string;
	type: WalletActivityEventType;
	/** Raw creator identifier from the API — never shown in the UI. */
	creatorId: string;
	/** Human-readable key / creator name used for display. */
	creatorHandle: string;
	/** Number of keys involved (undefined for claim / governance_vote). */
	amount?: number;
	/** Price per key in XLM (undefined for stake / unstake / claim / governance_vote). */
	price?: number;
	timestamp: number;
	txHash: string;
	status: 'completed' | 'pending' | 'failed';
	/** Only set for governance_vote events. */
	proposalId?: string;
	/** Vote direction — only set for governance_vote events. */
	voteChoice?: 'for' | 'against' | 'abstain';
}

export interface WalletActivityPage {
	trades: WalletActivityTrade[];
	/**
	 * The next page token. Returning `null` signals "no more pages"
	 * which stops the infinite query from refetching.
	 */
	nextPage: number | null;
}

export interface GetWalletActivityParams {
	address: string;
	/** 1-indexed page number. */
	page: number;
	/** Page size; defaults to the backend's first-page count. */
	limit?: number;
}

// ─── Mock data ──────────────────────────────────────────────────────────────
// Used while the backend endpoint is unavailable so the UI is fully
// interactive in dev/demo mode. Matches the shape returned by the API.

const NOW = Date.now();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const MOCK_WALLET_ACTIVITY: WalletActivityTrade[] = [
	{
		id: 'act-001',
		type: 'buy',
		creatorId: 'creator-alpha',
		creatorHandle: 'Alpha Key',
		amount: 5,
		price: 0.08,
		timestamp: NOW - 10 * MINUTE,
		txHash:
			'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
		status: 'completed',
	},
	{
		id: 'act-002',
		type: 'stake',
		creatorId: 'creator-beta',
		creatorHandle: 'Beta Key',
		amount: 10,
		timestamp: NOW - 45 * MINUTE,
		txHash:
			'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
		status: 'completed',
	},
	{
		id: 'act-003',
		type: 'governance_vote',
		creatorId: 'creator-gamma',
		creatorHandle: 'Gamma Key',
		timestamp: NOW - 2 * HOUR,
		txHash:
			'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
		status: 'completed',
		proposalId: 'prop-42',
		voteChoice: 'for',
	},
	{
		id: 'act-004',
		type: 'claim',
		creatorId: 'creator-delta',
		creatorHandle: 'Delta Key',
		price: 2.5,
		timestamp: NOW - 5 * HOUR,
		txHash:
			'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
		status: 'completed',
	},
	{
		id: 'act-005',
		type: 'sell',
		creatorId: 'creator-alpha',
		creatorHandle: 'Alpha Key',
		amount: 2,
		price: 0.12,
		timestamp: NOW - 1 * DAY,
		txHash:
			'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
		status: 'completed',
	},
	{
		id: 'act-006',
		type: 'unstake',
		creatorId: 'creator-beta',
		creatorHandle: 'Beta Key',
		amount: 3,
		timestamp: NOW - 2 * DAY,
		txHash:
			'f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1',
		status: 'completed',
	},
	{
		id: 'act-007',
		type: 'buy',
		creatorId: 'creator-epsilon',
		creatorHandle: 'Epsilon Key',
		amount: 1,
		price: 0.25,
		timestamp: NOW - 3 * DAY,
		txHash:
			'a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8',
		status: 'completed',
	},
	{
		id: 'act-008',
		type: 'governance_vote',
		creatorId: 'creator-gamma',
		creatorHandle: 'Gamma Key',
		timestamp: NOW - 4 * DAY,
		txHash:
			'b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9',
		status: 'completed',
		proposalId: 'prop-38',
		voteChoice: 'against',
	},
	{
		id: 'act-009',
		type: 'claim',
		creatorId: 'creator-alpha',
		creatorHandle: 'Alpha Key',
		price: 1.2,
		timestamp: NOW - 5 * DAY,
		txHash:
			'c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0',
		status: 'completed',
	},
	{
		id: 'act-010',
		type: 'stake',
		creatorId: 'creator-epsilon',
		creatorHandle: 'Epsilon Key',
		amount: 5,
		timestamp: NOW - 6 * DAY,
		txHash:
			'd0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1',
		status: 'completed',
	},
	// Page 2 entries — only shown after infinite scroll load
	{
		id: 'act-011',
		type: 'sell',
		creatorId: 'creator-delta',
		creatorHandle: 'Delta Key',
		amount: 4,
		price: 0.09,
		timestamp: NOW - 7 * DAY,
		txHash:
			'e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2',
		status: 'completed',
	},
	{
		id: 'act-012',
		type: 'governance_vote',
		creatorId: 'creator-beta',
		creatorHandle: 'Beta Key',
		timestamp: NOW - 8 * DAY,
		txHash:
			'f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7',
		status: 'completed',
		proposalId: 'prop-35',
		voteChoice: 'abstain',
	},
];

const PAGE_SIZE = 10;

/** Returns a mock paginated slice of the activity list. */
function getMockPage(page: number): WalletActivityPage {
	const start = (page - 1) * PAGE_SIZE;
	const end = start + PAGE_SIZE;
	const slice = MOCK_WALLET_ACTIVITY.slice(start, end);
	const hasMore = end < MOCK_WALLET_ACTIVITY.length;
	return {
		trades: slice,
		nextPage: hasMore ? page + 1 : null,
	};
}

// ─── Service ─────────────────────────────────────────────────────────────────

const ACTIVITY_CACHE_PREFIX = 'wallet_activity_';
const ACTIVITY_PAGE_TTL_MS = 15_000;

class WalletActivityService extends BaseApiService {
	async getWalletActivity({
		address,
		page,
		limit,
	}: GetWalletActivityParams): Promise<WalletActivityPage> {
		const cacheKey = `${ACTIVITY_CACHE_PREFIX}${address}_${page}_${limit ?? 'default'}`;
		const cached = cacheManager.get<WalletActivityPage>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<APIResponse<WalletActivityPage>>(
				`/wallet/${address}/activity`,
				{ params: { page, ...(limit ? { limit } : {}) } }
			);

			const data = response.data.data;
			cacheManager.set(cacheKey, data, ACTIVITY_PAGE_TTL_MS);
			return data;
		} catch {
			// API not yet available — fall back to mock data so the UI is
			// fully interactive in dev / demo environments.
			return getMockPage(page);
		}
	}
}

export const walletActivityService = new WalletActivityService();

/**
 * Convenience wrapper exposing the service call as a plain function so
 * it can be swapped via `vi.spyOn` from integration tests without needing
 * to mock the service class instance itself.
 */
export async function fetchWalletActivityPage(
	address: string,
	page: number
): Promise<WalletActivityPage> {
	return walletActivityService.getWalletActivity({ address, page });
}
