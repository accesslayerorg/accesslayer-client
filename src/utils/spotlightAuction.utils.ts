import { DEFAULT_AUCTION_MIN_INCREMENT } from '@/utils/auctionBid.utils';

/** Smallest bid the spotlight round will accept right now, in XLM (#1147). */
export function getMinimumSpotlightBid(
	highestBid: number | null | undefined,
	minIncrement: number | null | undefined
): number {
	const increment =
		minIncrement != null && minIncrement > 0
			? minIncrement
			: DEFAULT_AUCTION_MIN_INCREMENT;
	return highestBid != null ? highestBid + increment : increment;
}

/** Returns a blocking message for a bid amount, or null when it is valid (#1147). */
export function validateSpotlightBid(
	amount: number,
	minimumBid: number,
	slotId: string
): string | null {
	if (!slotId) return 'Choose a spotlight slot.';
	if (!Number.isFinite(amount) || amount <= 0) {
		return 'Enter a bid amount greater than zero.';
	}
	if (amount < minimumBid) {
		return `Your bid must be at least ${minimumBid.toFixed(2)} XLM.`;
	}
	return null;
}

/**
 * Current Dutch auction price, linearly interpolated from start to floor
 * across the auction duration. Clamps to the floor once the auction has ended.
 */
export function getDutchAuctionCurrentPrice(
	startPrice: number,
	floorPrice: number,
	startLedger: number,
	endLedger: number,
	currentLedger: number
): number {
	if (endLedger <= startLedger) return floorPrice;
	if (currentLedger <= startLedger) return startPrice;
	if (currentLedger >= endLedger) return floorPrice;
	const progress = (currentLedger - startLedger) / (endLedger - startLedger);
	return startPrice - (startPrice - floorPrice) * progress;
}

/** Total cost for a purchase including protocol fee and creator royalty. */
export function getDutchAuctionTotalCost(
	unitPrice: number,
	quantity: number,
	protocolFeeRate: number,
	royaltyRate: number
): { subtotal: number; protocolFee: number; royalty: number; total: number } {
	const subtotal = unitPrice * quantity;
	const protocolFee = subtotal * protocolFeeRate;
	const royalty = subtotal * royaltyRate;
	return { subtotal, protocolFee, royalty, total: subtotal + protocolFee + royalty };
}

/** Countdown text for a round end time, or null once the round has closed (#1147). */
export function formatSpotlightTimeRemaining(
	endsAt: string | null | undefined,
	now: number
): string | null {
	if (!endsAt) return null;
	const remainingMs = new Date(endsAt).getTime() - now;
	if (Number.isNaN(remainingMs) || remainingMs <= 0) return null;

	const totalSeconds = Math.floor(remainingMs / 1000);
	const days = Math.floor(totalSeconds / 86_400);
	const hours = Math.floor((totalSeconds % 86_400) / 3_600);
	const minutes = Math.floor((totalSeconds % 3_600) / 60);
	const seconds = totalSeconds % 60;

	if (days > 0) return `${days}d ${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
	return `${minutes}m ${seconds}s`;
}
