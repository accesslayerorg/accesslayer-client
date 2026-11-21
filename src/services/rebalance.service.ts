import { BaseApiService, type APIResponse } from './api.service';

/** A target allocation percentage configured for one held key. */
export interface RebalanceAllocationInput {
	keyId: string;
	/** Target share of the portfolio, in percent (0-100). */
	targetPercent: number;
}

/** A single swap required to move from the current to target allocation. */
export interface RebalanceSwap {
	keyId: string;
	keyTitle?: string;
	/** Positive to buy more of this key, negative to sell. */
	deltaQuantity: number;
	/** Estimated stroops cost (positive) or proceeds (negative) of the swap. */
	estimatedCostStroops: number;
}

export interface RebalancePreview {
	swaps: RebalanceSwap[];
	/** Sum of all positive estimated costs, in stroops. */
	estimatedTotalCostStroops: number;
}

class RebalanceService extends BaseApiService {
	/**
	 * Previews the swaps required to move a wallet's portfolio to the given
	 * target allocations, via `POST /wallets/:wallet/rebalance/preview`
	 * (#1139). Does not execute anything on-chain.
	 */
	async getRebalancePreview(
		wallet: string,
		allocations: RebalanceAllocationInput[]
	): Promise<RebalancePreview> {
		try {
			const response = await this.api.post<APIResponse<RebalancePreview>>(
				`/wallets/${wallet}/rebalance/preview`,
				{ allocations }
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const rebalanceService = new RebalanceService();
