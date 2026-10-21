import { BaseApiService, type APIResponse } from './api.service';

/** Wallet-tier buckets by share of circulating supply (#1245). */
export type HolderTier = 'whale' | 'midTier' | 'retail';

export interface HolderTierBreakdown {
	tier: HolderTier;
	/** Combined share of circulating supply held by wallets in this tier, in percent. */
	sharePercent: number;
	/** Number of distinct wallets in this tier. */
	walletCount: number;
}

export interface TopHolder {
	id: string;
	walletAddress: string;
	/** Total keys held by this wallet. */
	keyCount: number;
	/** Share of circulating supply this wallet holds, in percent. */
	sharePercent: number;
}

export interface HolderConcentration {
	/** Total number of distinct wallets currently holding at least one key. */
	uniqueHolderCount: number;
	/** Whale (>5%), mid-tier (1-5%), and retail (<1%) breakdown. */
	tiers: HolderTierBreakdown[];
	/** Top 5 holders by share of supply, descending. */
	topHolders: TopHolder[];
}

class HolderConcentrationService extends BaseApiService {
	// GET /keys/:keyId/holders/concentration
	async getHolderConcentration(keyId: string): Promise<HolderConcentration> {
		try {
			const response = await this.api.get<APIResponse<HolderConcentration>>(
				`/keys/${keyId}/holders/concentration`
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const holderConcentrationService = new HolderConcentrationService();
