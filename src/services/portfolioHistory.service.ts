// src/services/portfolioHistory.service.ts
import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';
import {
	normalizeHistory,
	type PortfolioHistoryPoint,
	type PortfolioHistoryRange,
} from '@/utils/portfolioHistory.utils';

/** Parameters accepted by {@link PortfolioHistoryService.getPortfolioHistory}. */
export interface GetPortfolioHistoryParams {
	/** Wallet address that owns the portfolio. */
	wallet: string;
	/**
	 * Range to request from the server. Omit (or pass `all`) to fetch the full
	 * history and let the chart slice it client-side, which keeps range
	 * switching instant.
	 */
	range?: PortfolioHistoryRange;
}

const PORTFOLIO_HISTORY_CACHE_PREFIX = 'portfolio_history_';
/** Cache for 30 s — long enough to dedupe re-renders, short enough to pick
 *  up a newly settled trade on the next visit. */
const PORTFOLIO_HISTORY_CACHE_TTL_MS = 30_000;

class PortfolioHistoryService extends BaseApiService {
	/**
	 * Fetches the wallet's portfolio value history from
	 * `GET /users/:wallet/portfolio-history`.
	 *
	 * The raw payload is normalized (sorted ascending, malformed samples
	 * dropped) before it is returned so the chart never has to defend against a
	 * bad endpoint response.
	 */
	async getPortfolioHistory({
		wallet,
		range = 'all',
	}: GetPortfolioHistoryParams): Promise<PortfolioHistoryPoint[]> {
		const cacheKey = `${PORTFOLIO_HISTORY_CACHE_PREFIX}${wallet}_${range}`;
		const cached = cacheManager.get<PortfolioHistoryPoint[]>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<
				APIResponse<PortfolioHistoryPoint[]>
			>(`/users/${wallet}/portfolio-history`, {
				params: { range },
			});

			const data = normalizeHistory(response.data.data ?? []);
			cacheManager.set(cacheKey, data, PORTFOLIO_HISTORY_CACHE_TTL_MS);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const portfolioHistoryService = new PortfolioHistoryService();

/**
 * Convenience wrapper that can be spied on in tests without mocking the
 * service class instance directly.
 */
export async function fetchPortfolioHistory(
	wallet: string,
	range: PortfolioHistoryRange = 'all'
): Promise<PortfolioHistoryPoint[]> {
	return portfolioHistoryService.getPortfolioHistory({ wallet, range });
}
