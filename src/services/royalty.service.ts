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
  /** Creator royalty rate in basis points (100 = 1%), when the API reports it (#1177). */
  royaltyRateBps?: number;
}

export interface RoyaltyClaim {
  id: string;
  amountXlm: number;
  claimedAt: string;
  transactionHash: string;
}

/**
 * Royalty enforcement status for a key (marketplace-restricted transfers).
 */
export interface RoyaltyEnforcementStatus {
  /** Whether transfers are restricted to approved marketplaces. */
  enforced: boolean;
  /** True when the setting can no longer be changed (holder threshold reached). */
  locked: boolean;
  /** Holder count at which the setting locks, when applicable. */
  lockThreshold?: number;
  /** Current number of holders. */
  holderCount?: number;
}

export interface ApprovedMarketplace {
  id: string;
  name: string;
  url: string;
  /** ISO date the marketplace was approved. */
  approvedAt: string;
  /** Stellar address used as transfer recipient for this marketplace. */
  address: string;
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

  async getRoyaltyEnforcement(keyId: string): Promise<RoyaltyEnforcementStatus> {
    try {
      const response = await this.api.get<APIResponse<RoyaltyEnforcementStatus>>(
        `/v1/keys/${keyId}/royalty-enforcement`
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getApprovedMarketplaces(): Promise<ApprovedMarketplace[]> {
    try {
      const response = await this.api.get<APIResponse<ApprovedMarketplace[]>>(
        '/v1/marketplaces'
      );
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
