// src/services/tradeHistory.service.ts
import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';

/**
 * A single trade entry returned from GET /users/:wallet/trades.
 *
 * Field names mirror the shape specified in issue #784 so the UI
 * can display key name, trade type, quantity, price-per-key, total
 * cost, and timestamp without any further mapping.
 */
export interface Trade {
	/** Unique trade identifier used as the React list key. */
	id: string;
	/** Human-readable key / creator name (e.g. "Alpha Key"). */
	keyName: string;
	/** Whether the user bought or sold. */
	tradeType: 'Buy' | 'Sell';
	/** Number of keys exchanged. */
	quantity: number;
	/** Price per key in XLM at the time of the trade. */
	pricePerKey: number;
	/** Unix timestamp (milliseconds) of when the trade settled. */
	timestamp: number;
	/** Platform fee in XLM charged for this trade. */
	fee: number;
	/**
	 * On-chain transaction hash for this trade, or `null` when no hash is
	 * available. Powers the copy-hash and block-explorer actions on each
	 * trade history row.
	 */
	transactionHash: string | null;
}

/** Cursor-paginated response envelope for the trade history endpoint. */
export interface TradeHistoryPage {
	trades: Trade[];
	/**
	 * Opaque cursor for the next page. `null` signals there are no
	 * more pages and the "Load More" button should be hidden.
	 */
	nextCursor: string | null;
}

/** Parameters accepted by {@link TradeHistoryService.getTradeHistory}. */
export interface GetTradeHistoryParams {
	/** Wallet address that owns the trade history. */
	wallet: string;
	/** Cursor returned by the previous page. Omit for the first page. */
	cursor?: string | null;
	/** Number of rows per page. Defaults to the server's preferred page size. */
	limit?: number;
}

const TRADE_HISTORY_CACHE_PREFIX = 'trade_history_';
/** Cache pages for 15 s — fresh enough to avoid redundant fetches while
 *  scrolling, but short enough to pick up new trades quickly. */
const TRADE_HISTORY_PAGE_TTL_MS = 15_000;

class TradeHistoryService extends BaseApiService {
	async getTradeHistory({
		wallet,
		cursor,
		limit,
	}: GetTradeHistoryParams): Promise<TradeHistoryPage> {
		const cacheKey = `${TRADE_HISTORY_CACHE_PREFIX}${wallet}_${cursor ?? 'first'}_${limit ?? 'default'}`;
		const cached = cacheManager.get<TradeHistoryPage>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<APIResponse<TradeHistoryPage>>(
				`/users/${wallet}/trades`,
				{
					params: {
						...(cursor ? { cursor } : {}),
						...(limit ? { limit } : {}),
					},
				}
			);

			const data = response.data.data;
			cacheManager.set(cacheKey, data, TRADE_HISTORY_PAGE_TTL_MS);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const tradeHistoryService = new TradeHistoryService();

/**
 * Convenience wrapper that can be spied on in tests without mocking the
 * service class instance directly.
 */
export async function fetchTradeHistoryPage(
	wallet: string,
	cursor: string | null | undefined
): Promise<TradeHistoryPage> {
	return tradeHistoryService.getTradeHistory({ wallet, cursor });
}

/**
 * Fetches all trade history pages for a wallet by paginating through
 * cursor-based results until there are no more pages.
 */
export async function fetchAllTrades(wallet: string): Promise<Trade[]> {
	const allTrades: Trade[] = [];
	let cursor: string | null | undefined = undefined;

	do {
		const page = await tradeHistoryService.getTradeHistory({
			wallet,
			cursor,
			limit: 100,
		});
		allTrades.push(...page.trades);
		cursor = page.nextCursor;
	} while (cursor);

	return allTrades;
}
