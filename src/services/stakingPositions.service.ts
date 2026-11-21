import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';

/**
 * A single active staking position returned from
 * GET /users/:wallet/staking-positions.
 *
 * Field names mirror the shape described in issue #921 so the profile page
 * can surface lock status, claimable rewards, and current value without any
 * further mapping.
 */
export interface StakingPosition {
	/** Unique position identifier used as the React list key. */
	id: string;
	/** Creator key id this position is staked in. */
	keyId: string;
	/** Human-readable key / creator name (e.g. "Alpha Key"). */
	keyName: string;
	/** Number of whole keys currently locked in the staking contract. */
	stakedQuantity: number;
	/** Ledger sequence at which this position unlocks and becomes claimable. */
	unlockLedger: number;
	/** Accumulated staking rewards claimable on unlock, in stroops. */
	claimableReward: number;
	/**
	 * Current bonding-curve key price in stroops (preferred over legacy
	 * `price`), used to value staked positions in the portfolio total.
	 */
	priceStroops?: number | null;
	/** Legacy whole-XLM price interpreted only when stroops are absent. */
	price?: number | null;
}

/** Response envelope for the staking positions endpoint. */
export interface StakingPositionsResponse {
	positions: StakingPosition[];
}

/** Parameters accepted by {@link StakingPositionsService.getStakingPositions}. */
export interface GetStakingPositionsParams {
	wallet: string;
}

const STAKING_POSITIONS_CACHE_PREFIX = 'staking_positions_';
/** Cache for 15 s — fresh enough to avoid redundant fetches while browsing,
 *  short enough to pick up newly unlocked positions quickly. */
const STAKING_POSITIONS_CACHE_TTL_MS = 15_000;

class StakingPositionsService extends BaseApiService {
	async getStakingPositions({
		wallet,
	}: GetStakingPositionsParams): Promise<StakingPositionsResponse> {
		const cacheKey = `${STAKING_POSITIONS_CACHE_PREFIX}${wallet}`;
		const cached = cacheManager.get<StakingPositionsResponse>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<
				APIResponse<StakingPositionsResponse>
			>(`/users/${wallet}/staking-positions`);

			const data = response.data.data;
			cacheManager.set(cacheKey, data, STAKING_POSITIONS_CACHE_TTL_MS);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const stakingPositionsService = new StakingPositionsService();

/**
 * Convenience wrapper that can be spied on in tests without mocking the
 * service class instance directly.
 */
export async function fetchStakingPositions(
	wallet: string
): Promise<StakingPositionsResponse> {
	return stakingPositionsService.getStakingPositions({ wallet });
}
