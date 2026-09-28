import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Available lock durations for the staking vault. */
export type StakingVaultLockPeriod = 7 | 30 | 90 | 180;

/** A single active vault stake for one (wallet, key) pair. */
export interface VaultStake {
	/** Unique stake identifier used as a React list key. */
	id: string;
	/** Creator key id this stake belongs to. */
	keyId: string;
	/** Number of whole keys locked in the vault. */
	stakedAmount: number;
	/** ISO-8601 timestamp at which the lock expires and unstaking is allowed. */
	lockExpiresAt: string;
	/** Accrued rewards in XLM (whole units) at the time of the last API poll. */
	accruedRewards: number;
	/** Reward pool balance for this key at the time of the last API poll (XLM). */
	rewardPoolBalance: number;
}

/** Response envelope from GET /keys/:keyId/vault-stakes/:wallet */
export interface VaultStakesResponse {
	stakes: VaultStake[];
}

/** Estimated reward preview returned by POST /keys/:keyId/vault-stakes/estimate */
export interface StakeRewardEstimate {
	estimatedReward: number;
	lockPeriodDays: StakingVaultLockPeriod;
	annualisedApy: number | null;
}

/** Params for fetching vault stakes. */
export interface GetVaultStakesParams {
	keyId: string;
	wallet: string;
}

/** Variables passed to the stake mutation. */
export interface StakeVaultVariables {
	keyId: string;
	wallet: string;
	amount: number;
	lockPeriodDays: StakingVaultLockPeriod;
}

/** Variables passed to the unstake mutation. */
export interface UnstakeVaultVariables {
	keyId: string;
	wallet: string;
	stakeId: string;
}

// ─── Cache constants ───────────────────────────────────────────────────────────

const VAULT_STAKES_CACHE_PREFIX = 'vault_stakes_';
const VAULT_STAKES_CACHE_TTL_MS = 15_000;

// ─── Service ──────────────────────────────────────────────────────────────────

class StakingVaultService extends BaseApiService {
	/**
	 * Fetches the active vault stakes for a wallet on a specific key.
	 * GET /keys/:keyId/vault-stakes/:wallet
	 */
	async getVaultStakes({
		keyId,
		wallet,
	}: GetVaultStakesParams): Promise<VaultStakesResponse> {
		const cacheKey = `${VAULT_STAKES_CACHE_PREFIX}${keyId}_${wallet}`;
		const cached = cacheManager.get<VaultStakesResponse>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<APIResponse<VaultStakesResponse>>(
				`/keys/${keyId}/vault-stakes/${wallet}`
			);
			const data = response.data.data;
			cacheManager.set(cacheKey, data, VAULT_STAKES_CACHE_TTL_MS);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Submits a stake transaction to the backend signing pipeline.
	 * POST /keys/:keyId/vault-stakes
	 */
	async stakeKeys(variables: StakeVaultVariables): Promise<{ success: true }> {
		try {
			await this.api.post<APIResponse<{ success: true }>>(
				`/keys/${variables.keyId}/vault-stakes`,
				{
					wallet: variables.wallet,
					amount: variables.amount,
					lockPeriodDays: variables.lockPeriodDays,
				}
			);
			// Bust cache so the next query fetches fresh stakes
			cacheManager.invalidate(
				`${VAULT_STAKES_CACHE_PREFIX}${variables.keyId}_${variables.wallet}`
			);
			return { success: true };
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Submits an unstake transaction after lock expiry.
	 * POST /keys/:keyId/vault-stakes/:stakeId/unstake
	 */
	async unstakeKeys(
		variables: UnstakeVaultVariables
	): Promise<{ success: true }> {
		try {
			await this.api.post<APIResponse<{ success: true }>>(
				`/keys/${variables.keyId}/vault-stakes/${variables.stakeId}/unstake`,
				{ wallet: variables.wallet }
			);
			cacheManager.invalidate(
				`${VAULT_STAKES_CACHE_PREFIX}${variables.keyId}_${variables.wallet}`
			);
			return { success: true };
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const stakingVaultService = new StakingVaultService();

// Convenience wrappers that can be spied on in tests without mocking the
// service class instance directly.

export async function fetchVaultStakes(
	keyId: string,
	wallet: string
): Promise<VaultStakesResponse> {
	return stakingVaultService.getVaultStakes({ keyId, wallet });
}

export async function submitStakeKeys(
	variables: StakeVaultVariables
): Promise<{ success: true }> {
	return stakingVaultService.stakeKeys(variables);
}

export async function submitUnstakeKeys(
	variables: UnstakeVaultVariables
): Promise<{ success: true }> {
	return stakingVaultService.unstakeKeys(variables);
}
