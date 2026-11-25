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

/** Dutch auction state for a secondary key sale (issue: Dutch auction buying page). */
export type DutchAuctionStatus = 'active' | 'filled' | 'cancelled' | 'closed';

export interface DutchAuction {
	id: string;
	keyName: string;
	creatorId: string;
	status: DutchAuctionStatus;
	/** Price in XLM at the auction start ledger. */
	startPrice: number;
	/** Lowest price in XLM the auction can decay to. */
	floorPrice: number;
	/** Ledger sequence when the price begins decaying. */
	startLedger: number;
	/** Ledger sequence when the auction reaches the floor price. */
	endLedger: number;
	/** Price decay per ledger in XLM (linear interpolation). */
	decayPerLedger: number;
	/** Units still available for purchase. */
	remainingQuantity: number;
	/** Protocol fee as a fraction of the price (e.g. 0.02 = 2%). */
	protocolFeeRate: number;
	/** Creator royalty as a fraction of the price (e.g. 0.05 = 5%). */
	creatorRoyaltyRate: number;
	/** Average ledger close time in seconds, used to schedule price updates. */
	ledgerCloseSeconds: number;
	/** Ledger at which the auction was filled or cancelled, if closed. */
	settledLedger: number | null;
	/** Final sale price per unit in XLM, when filled. */
	settledPrice: number | null;
	/** Quantity sold in total, when closed. */
	soldQuantity: number;
}

export interface DutchAuctionPriceSnapshot {
	/** Current price per unit in XLM at the given ledger. */
	currentPrice: number;
	/** Ledger whose price change will next move the displayed value. */
	nextPriceChangeAt: number;
}

export interface DutchAuctionCostBreakdown {
	quantity: number;
	unitPrice: number;
	subtotal: number;
	protocolFee: number;
	creatorRoyalty: number;
	total: number;
}

/**
 * Linear Dutch auction price at a ledger, matching the contract interpolation.
 * Price starts at startPrice at startLedger and decays to floorPrice at endLedger.
 */
export function interpolateDutchAuctionPrice(
	auction: Pick<DutchAuction, 'startPrice' | 'floorPrice' | 'startLedger' | 'endLedger'>,
	ledger: number
): DutchAuctionPriceSnapshot {
	const { startPrice, floorPrice, startLedger, endLedger } = auction;
	if (ledger <= startLedger) {
		return { currentPrice: startPrice, nextPriceChangeAt: startLedger + 1 };
	}
	if (ledger >= endLedger || endLedger <= startLedger) {
		return { currentPrice: floorPrice, nextPriceChangeAt: endLedger };
	}
	const span = endLedger - startLedger;
	const elapsed = ledger - startLedger;
	const progress = elapsed / span;
	const currentPrice = startPrice - (startPrice - floorPrice) * progress;
	return {
		currentPrice,
		nextPriceChangeAt: ledger + 1,
	};
}

/** Total cost for a purchase including protocol fee and creator royalty. */
export function computeDutchAuctionCost(
	unitPrice: number,
	quantity: number,
	protocolFeeRate: number,
	creatorRoyaltyRate: number
): DutchAuctionCostBreakdown {
	const subtotal = unitPrice * quantity;
	const protocolFee = subtotal * protocolFeeRate;
	const creatorRoyalty = subtotal * creatorRoyaltyRate;
	return {
		quantity,
		unitPrice,
		subtotal,
		protocolFee,
		creatorRoyalty,
		total: subtotal + protocolFee + creatorRoyalty,
	};
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
	 * Dutch auction for a secondary key sale (GET /v1/auctions/:id).
	 */
	async getDutchAuction(auctionId: string): Promise<DutchAuction> {
		try {
			const response = await this.api.get<APIResponse<DutchAuction>>(
				`/v1/auctions/${auctionId}`
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
