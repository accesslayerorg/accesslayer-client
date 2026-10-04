import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';

/**
 * Royalty earnings from secondary transfers (#987).
 *
 * One event per royalty-bearing transfer; the backend aggregates the totals
 * and the claimed history from the claim transactions.
 */
export interface RoyaltyTransferEvent {
  /** Stable identifier for the transfer event. */
  id: string;
  /** ISO timestamp of the transfer. */
  transferredAt: string;
  /** Sale price of the transfer, in XLM. */
  transferAmountXlm: number;
  /** Royalty accrued to the creator from this transfer, in XLM. */
  royaltyEarnedXlm: number;
  /** Transaction hash of the transfer. */
  transactionHash: string;
}

export interface RoyaltyEarningsSummary {
  /** Lifetime royalties accrued, in XLM. */
  totalEarnedXlm: number;
  /** Royalties not yet claimed, in XLM. */
  pendingXlm: number;
  /** Royalties already withdrawn, in XLM. */
  claimedXlm: number;
  /** Per-transfer breakdown, newest first. */
  transfers: RoyaltyTransferEvent[];
  /** Completed claims with transaction hashes, newest first. */
  claims: RoyaltyClaim[];
}

export interface RoyaltyClaim {
  id: string;
  amountXlm: number;
  claimedAt: string;
  transactionHash: string;
}

const ROYALTY_CACHE_PREFIX = 'royalty_earnings_';
const ROYALTY_CACHE_TTL_MS = 30_000;

class RoyaltyService extends BaseApiService {
  async getRoyaltyEarnings(keyId: string, wallet: string): Promise<RoyaltyEarningsSummary> {
    const cacheKey = `${ROYALTY_CACHE_PREFIX}${keyId}_${wallet}`;
    const cached = cacheManager.get<RoyaltyEarningsSummary>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.api.get<APIResponse<RoyaltyEarningsSummary>>(
        `/keys/${keyId}/royalties`,
        { params: { wallet } }
      );
      const data = response.data.data;
      cacheManager.set(cacheKey, data, ROYALTY_CACHE_TTL_MS);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async claimRoyalties(keyId: string, wallet: string): Promise<{ transactionHash: string }> {
    try {
      const response = await this.api.post<APIResponse<{ transactionHash: string }>>(
        `/keys/${keyId}/royalties/claim`,
        { wallet }
      );
      // A successful claim changes every number on the card; drop the cache.
      cacheManager.invalidate(cacheKey(keyId, wallet));
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

function cacheKey(keyId: string, wallet: string): string {
  return `${ROYALTY_CACHE_PREFIX}${keyId}_${wallet}`;
}

export const royaltyService = new RoyaltyService();
