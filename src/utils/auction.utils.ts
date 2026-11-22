/**
 * Secondary-market auction helpers (#1174).
 * Duration selector values map 1:1 onto the seconds the contract expects.
 */

export const AUCTION_DURATIONS = [
	{ label: '1h', seconds: 3_600 },
	{ label: '6h', seconds: 21_600 },
	{ label: '24h', seconds: 86_400 },
] as const;

export type AuctionDurationLabel = (typeof AUCTION_DURATIONS)[number]['label'];

export interface CreateAuctionParams {
	/** Number of fractions (keys) being listed. */
	fractionAmount: number;
	/** Minimum acceptable bid, in stroops. */
	reservePriceStroops: number;
	/** Auction length in seconds (must be one of AUCTION_DURATIONS). */
	durationSeconds: number;
}

/** Map a duration label to the seconds passed to `create_auction`. */
export function durationLabelToSeconds(label: AuctionDurationLabel): number {
	const entry = AUCTION_DURATIONS.find(d => d.label === label);
	if (!entry) {
		throw new Error(`Unknown auction duration: ${label}`);
	}
	return entry.seconds;
}

/**
 * Price of a Dutch auction at a given time, linearly decaying from start
 * price to floor price over the auction duration. Clamped to [floor, start].
 */
export function dutchAuctionPriceAt(
	startPriceStroops: number,
	floorPriceStroops: number,
	startsAt: Date | number,
	durationSeconds: number,
	now: Date | number
): number {
	if (durationSeconds <= 0) return floorPriceStroops;
	const startMs = typeof startsAt === 'number' ? startsAt : startsAt.getTime();
	const nowMs = typeof now === 'number' ? now : now.getTime();
	const elapsed = Math.min(Math.max((nowMs - startMs) / 1000, 0), durationSeconds);
	const fraction = elapsed / durationSeconds;
	const price = startPriceStroops - (startPriceStroops - floorPriceStroops) * fraction;
	return Math.max(floorPriceStroops, Math.min(startPriceStroops, price));
}

/** Default max-price buffer for buy-now forms: current price plus 1%. */
export function defaultMaxPriceStroops(currentPriceStroops: number): number {
	return Math.ceil(currentPriceStroops * 1.01);
}

/**
 * Total cost of a purchase including protocol fee and creator royalty.
 * Fee and royalty are expressed in basis points of the gross amount.
 */
export function purchaseTotalStroops(
	unitPriceStroops: number,
	quantity: number,
	protocolFeeBps: number,
	royaltyBps: number
): { gross: number; protocolFee: number; creatorRoyalty: number; total: number } {
	const gross = unitPriceStroops * quantity;
	const protocolFee = Math.floor((gross * protocolFeeBps) / 10_000);
	const creatorRoyalty = Math.floor((gross * royaltyBps) / 10_000);
	return { gross, protocolFee, creatorRoyalty, total: gross + protocolFee + creatorRoyalty };
}

/** When a newly created auction ends, given a start time and duration. */
export function auctionEndTime(
	startsAt: Date | number,
	durationSeconds: number
): Date {
	const start =
		typeof startsAt === 'number' ? new Date(startsAt) : startsAt;
	return new Date(start.getTime() + durationSeconds * 1000);
}

export interface AuctionSummary {
	fractionAmount: number;
	reservePriceStroops: number;
	durationSeconds: number;
	endTime: Date;
}

/** Preview data rendered in the confirmation summary before submit. */
export function buildAuctionSummary(
	params: CreateAuctionParams,
	now: Date = new Date()
): AuctionSummary {
	if (!Number.isInteger(params.fractionAmount) || params.fractionAmount <= 0) {
		throw new Error('fractionAmount must be a positive integer');
	}
	if (
		!Number.isFinite(params.reservePriceStroops) ||
		params.reservePriceStroops <= 0
	) {
		throw new Error('reservePriceStroops must be a positive number');
	}
	if (!AUCTION_DURATIONS.some(d => d.seconds === params.durationSeconds)) {
		throw new Error(
			`durationSeconds must be one of ${AUCTION_DURATIONS.map(d => d.seconds).join(', ')}`
		);
	}

	return {
		fractionAmount: params.fractionAmount,
		reservePriceStroops: params.reservePriceStroops,
		durationSeconds: params.durationSeconds,
		endTime: auctionEndTime(now, params.durationSeconds),
	};
}

export interface ActiveAuction {
	auctionId: string;
	seller: string;
	fractionAmount: number;
	reservePriceStroops: number;
	/** Current highest bid in stroops; 0 when no bids yet. */
	highestBidStroops: number;
	highestBidder: string | null;
	endsAt: Date | string;
	status: 'active' | 'settled' | 'cancelled';
}

/** True when this wallet is the auction's seller (case-insensitive). */
export function isAuctionSeller(
	auction: Pick<ActiveAuction, 'seller'>,
	walletAddress: string | null | undefined
): boolean {
	if (!walletAddress) return false;
	return auction.seller.toLowerCase() === walletAddress.toLowerCase();
}
