import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';

/**
 * A single protocol revenue distribution event returned from GET /staker/:wallet/protocol-revenue.
 */
export interface ProtocolRevenueDistribution {
	id: string;
	distributionDate: string | number;
	totalDistributed: number;
	stakerCount: number;
	amountReceived: number;
}

/** Cursor-paginated response envelope for the protocol revenue distribution endpoint. */
export interface ProtocolRevenueDistributionPage {
	distributions: ProtocolRevenueDistribution[];
	nextCursor: string | null;
}

/** Parameters accepted by {@link StakerRevenueService.getProtocolRevenueHistory}. */
export interface GetProtocolRevenueParams {
	wallet: string;
	cursor?: string | null;
	limit?: number;
}

const STAKER_REVENUE_CACHE_PREFIX = 'staker_revenue_';
const STAKER_REVENUE_CACHE_TTL_MS = 15_000;

class StakerRevenueService extends BaseApiService {
	async getProtocolRevenueHistory({
		wallet,
		cursor,
		limit,
	}: GetProtocolRevenueParams): Promise<ProtocolRevenueDistributionPage> {
		const cacheKey = `${STAKER_REVENUE_CACHE_PREFIX}${wallet}_${cursor ?? 'first'}_${limit ?? 'default'}`;
		const cached =
			cacheManager.get<ProtocolRevenueDistributionPage>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<
				APIResponse<ProtocolRevenueDistributionPage>
			>(`/staker/${wallet}/protocol-revenue`, {
				params: {
					...(cursor ? { cursor } : {}),
					...(limit ? { limit } : {}),
				},
			});

			const data = response.data.data;
			cacheManager.set(cacheKey, data, STAKER_REVENUE_CACHE_TTL_MS);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const stakerRevenueService = new StakerRevenueService();

/**
 * Convenience wrapper for fetching a page of protocol revenue distribution history.
 * Exposed as a plain function to facilitate test spying.
 */
export async function fetchProtocolRevenuePage(
	wallet: string,
	cursor: string | null | undefined
): Promise<ProtocolRevenueDistributionPage> {
	return stakerRevenueService.getProtocolRevenueHistory({ wallet, cursor });
}
