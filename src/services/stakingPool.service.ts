import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';

/**
 * Staking reward pool state for one creator key (#1023).
 *
 * The backend derives the estimated reward rate from the pool's current
 * balance and the key's total stake; the client re-fetches (and the form
 * re-previews) whenever the creator enters a funding amount.
 */
export interface StakingRewardPool {
  /** Current pool balance, in XLM. */
  poolBalanceXlm: number;
  /** Total XLM currently staked against this key. */
  totalStakedXlm: number;
  /** Annualized reward rate at the current pool balance (0–1). */
  rewardRate: number;
  /** Reward rate after adding `amountXlm` to the pool (0–1). */
  projectedRewardRate: number;
  /** Days of rewards the pool can cover at the current stake rate. */
  daysOfRewardsRemaining: number;
}

export interface FundRewardPoolInput {
  /** Amount to deposit into the pool, in XLM. */
  amountXlm: number;
}

const STAKING_POOL_CACHE_PREFIX = 'staking_pool_';
const STAKING_POOL_CACHE_TTL_MS = 15_000;

class StakingPoolService extends BaseApiService {
  async getRewardPool(keyId: string): Promise<StakingRewardPool> {
    const cacheKey = `${STAKING_POOL_CACHE_PREFIX}${keyId}`;
    const cached = cacheManager.get<StakingRewardPool>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.api.get<APIResponse<StakingRewardPool>>(
        `/keys/${keyId}/staking-pool`
      );
      const data = response.data.data;
      cacheManager.set(cacheKey, data, STAKING_POOL_CACHE_TTL_MS);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async fundRewardPool(
    keyId: string,
    wallet: string,
    input: FundRewardPoolInput
  ): Promise<{ transactionHash: string; pool: StakingRewardPool }> {
    try {
      const response = await this.api.post<
        APIResponse<{ transactionHash: string; pool: StakingRewardPool }>
      >(`/keys/${keyId}/staking-pool/fund`, { wallet, ...input });
      cacheManager.invalidate(cacheKey(keyId));
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

function cacheKey(keyId: string): string {
  return `${STAKING_POOL_CACHE_PREFIX}${keyId}`;
}

export const stakingPoolService = new StakingPoolService();
