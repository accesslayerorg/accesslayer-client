import { BaseApiService, type APIResponse } from './api.service';

export interface SpotlightSlot {
	id: string;
	label: string;
}

export interface SpotlightAuctionState {
	slots: SpotlightSlot[];
	/** Wallet currently holding the top placement, or null when unclaimed. */
	currentWinnerWallet: string | null;
	/** Highest bid in XLM for the active round, or null when there are no bids. */
	highestBid: number | null;
	/** Minimum increment in XLM over the highest bid (nullable → default). */
	minIncrement: number | null;
	/** ISO timestamp when the current round closes. */
	endsAt: string | null;
}

export type SpotlightBidStatus = 'leading' | 'outbid' | 'won';

export interface SpotlightBid {
	id: string;
	slotId: string;
	slotLabel: string;
	amount: number;
	status: SpotlightBidStatus;
	/** XLM owed back to the wallet after being outbid (0 when nothing is pending). */
	refundPending: number;
}

/** The key currently holding the paid marketplace spotlight placement (#1219). */
export interface ActiveSpotlight {
	creatorId: string;
	keyName: string;
	creatorName: string;
	creatorHandle?: string | null;
	thumbnail?: string | null;
	/** Current bonding-curve price in XLM. */
	priceXlm: number;
	/** Trailing 24h trading volume in XLM. */
	volume24hXlm: number;
	holderCount: number;
	/** ISO timestamp when the spotlight placement ends. */
	endsAt: string;
	/** Optional sponsor copy; the banner falls back to "Sponsored". */
	sponsorLabel?: string | null;
}

class SpotlightAuctionService extends BaseApiService {
	/**
	 * Spotlighted key shown at the top of the marketplace (#1219).
	 * GET /marketplace/spotlight — resolves to null when no placement is active.
	 */
	async getActiveSpotlight(): Promise<ActiveSpotlight | null> {
		try {
			const response = await this.api.get<APIResponse<ActiveSpotlight | null>>(
				'/marketplace/spotlight'
			);
			const spotlight = response.data.data;
			return spotlight?.creatorId ? spotlight : null;
		} catch (error) {
			const apiError = this.handleError(error);
			if (apiError.status === 404) return null;
			throw apiError;
		}
	}

	/**
	 * Current spotlight round for a creator (#1147).
	 * GET /creators/:creatorId/spotlight/auction
	 */
	async getSpotlightAuction(creatorId: string): Promise<SpotlightAuctionState> {
		try {
			const response = await this.api.get<APIResponse<SpotlightAuctionState>>(
				`/creators/${creatorId}/spotlight/auction`
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Bids a wallet has placed on a creator's spotlight slots (#1147).
	 * GET /creators/:creatorId/spotlight/bids?wallet=
	 */
	async getSpotlightBids(
		creatorId: string,
		wallet: string
	): Promise<SpotlightBid[]> {
		try {
			const response = await this.api.get<APIResponse<SpotlightBid[]>>(
				`/creators/${creatorId}/spotlight/bids`,
				{ params: { wallet } }
			);
			return response.data.data ?? [];
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const spotlightAuctionService = new SpotlightAuctionService();
