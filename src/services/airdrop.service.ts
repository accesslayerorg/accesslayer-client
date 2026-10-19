import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';
import type { AirdropAllocation } from '@/utils/airdropClaim.utils';

const AIRDROP_CACHE_PREFIX = 'airdrops_';
const AIRDROP_CACHE_TTL_MS = 15_000;

/**
 * Fetches the airdrop allocations available to a wallet for the keys it
 * holds (GET /airdrops/:wallet). Claimed status is resolved client-side
 * from local claim history — see `useAirdropClaims`.
 */
class AirdropService extends BaseApiService {
	async getAirdropsForWallet(wallet: string): Promise<AirdropAllocation[]> {
		const cacheKey = `${AIRDROP_CACHE_PREFIX}${wallet}`;
		const cached = cacheManager.get<AirdropAllocation[]>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<APIResponse<AirdropAllocation[]>>(
				`/airdrops/${wallet}`
			);
			const data = response.data.data ?? [];
			cacheManager.set(cacheKey, data, AIRDROP_CACHE_TTL_MS);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const airdropService = new AirdropService();

/**
 * Convenience wrapper for fetching a wallet's airdrop allocations.
 * Exposed as a plain function to facilitate test spying.
 */
export async function fetchAirdropsForWallet(
	wallet: string
): Promise<AirdropAllocation[]> {
	return airdropService.getAirdropsForWallet(wallet);
}
