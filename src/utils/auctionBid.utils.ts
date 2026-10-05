/**
 * Pre-launch auction bidding state, countdown and validation helpers (#924).
 *
 * These helpers power the auction phase UI on the key detail page: deciding
 * whether a key is in its pre-launch bidding window, computing the minimum
 * acceptable bid, validating raw bid input, and detecting whether the
 * connected wallet is still the leading bidder.
 */

import type { AuctionBidEntry } from '@/services/course.service';
import { formatDropTimeRemaining } from '@/utils/dropCountdown.utils';
import { formatNumber } from '@/utils/numberFormat.utils';

/** Fallback minimum increment (XLM) when the contract omits one. */
export const DEFAULT_AUCTION_MIN_INCREMENT = 0.05;

export type AuctionPhaseStatus = 'inactive' | 'active' | 'ended';

export interface AuctionPhaseConfig {
	auctionPrice?: number | null;
	auctionSupply?: number | null;
	auctionSold?: number | null;
	auctionEndsAt?: string | null;
}

function isFiniteNumber(value: number | null | undefined): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function toMs(value: string | null | undefined): number | null {
	if (!value) return null;
	const ms = new Date(value).getTime();
	return Number.isNaN(ms) ? null : ms;
}

/**
 * Resolves the current pre-launch auction phase for a key.
 *
 * A key is considered to have an auction when it has a fixed price /
 * supply allocation (`auctionPrice`/`auctionSupply`) or a closing timestamp
 * (`auctionEndsAt`). The phase is `ended` once the allocation is sold out or
 * the closing timestamp passes; everything else before that is `active`.
 */
export function getAuctionPhaseStatus(
	config: AuctionPhaseConfig,
	nowMs: number = Date.now()
): AuctionPhaseStatus {
	const hasAuction =
		(config.auctionPrice ?? 0) > 0 ||
		(config.auctionSupply ?? 0) > 0 ||
		toMs(config.auctionEndsAt) != null;
	if (!hasAuction) return 'inactive';

	const endMs = toMs(config.auctionEndsAt);
	if (
		isFiniteNumber(config.auctionSupply) &&
		isFiniteNumber(config.auctionSold) &&
		config.auctionSold >= config.auctionSupply
	) {
		return 'ended';
	}
	if (endMs != null && nowMs >= endMs) return 'ended';

	return 'active';
}

export interface AuctionCountdownState {
	/** Whether the auction window has closed. */
	isEnded: boolean;
	/** Human-readable time remaining, or null when no closing timestamp exists. */
	label: string | null;
	/** Milliseconds remaining until the auction closes (clamped to zero). */
	remainingMs: number;
}

/** Countdown state relative to `nowMs`; accurate to the auction end timestamp. */
export function getAuctionCountdownState(
	endIso: string | null | undefined,
	nowMs: number = Date.now()
): AuctionCountdownState {
	const endMs = toMs(endIso);
	if (endMs == null) {
		return { isEnded: false, label: null, remainingMs: 0 };
	}
	const remainingMs = Math.max(0, endMs - nowMs);
	return {
		isEnded: remainingMs <= 0,
		label: formatDropTimeRemaining(remainingMs),
		remainingMs,
	};
}

/** Resolve the min-increment helper value (XLM), with a sane default. */
export function resolveAuctionMinIncrement(
	minIncrement: number | null | undefined
): number {
	return isFiniteNumber(minIncrement)
		? minIncrement
		: DEFAULT_AUCTION_MIN_INCREMENT;
}

/**
 * The minimum amount a new bid must be (XLM). Without an existing highest
 * bid this is the fixed early-access price (or the increment when that too
 * is absent); once a bid exists it is `highest + increment`.
 */
export function computeMinimumNextBid(
	config: {
		highestBid?: number | null;
		minIncrement?: number | null;
		startingPrice?: number | null;
	}
): number {
	const { highestBid, minIncrement, startingPrice } = config;
	const increment = resolveAuctionMinIncrement(minIncrement);

	if (isFiniteNumber(highestBid)) {
		return highestBid + increment;
	}
	if (isFiniteNumber(startingPrice)) {
		return startingPrice;
	}
	return increment;
}

export interface AuctionBidValidation {
	isValid: boolean;
	/** Human-readable error shown under the bid input when invalid. */
	error: string | null;
	/** Parsed numeric bid value when valid, otherwise null. */
	value: number | null;
}

/** Formats a bid amount for display. */
export function formatAuctionBidAmount(amount: number): string {
	return `${formatNumber(amount, {
		maximumFractionDigits: 4,
	})} XLM`;
}

/** Validates raw bid input against the minimum next bid. */
export function validateAuctionBid(
	raw: string,
	ctx: {
		highestBid?: number | null;
		minIncrement?: number | null;
		startingPrice?: number | null;
	}
): AuctionBidValidation {
	const trimmed = raw.trim();
	if (trimmed === '') {
		return { isValid: false, error: 'Enter a bid amount', value: null };
	}

	const value = Number(trimmed);
	if (!Number.isFinite(value) || value <= 0) {
		return { isValid: false, error: 'Enter a bid greater than 0', value: null };
	}

	const minimum = computeMinimumNextBid(ctx);
	if (value < minimum) {
		return {
			isValid: false,
			error: `Minimum bid is ${formatAuctionBidAmount(minimum)}`,
			value: null,
		};
	}

	return { isValid: true, error: null, value };
}

/**
 * The wallet's highest bid within the given history, or null when the wallet
 * has not placed a bid yet. Addresses are compared case-insensitively.
 */
export function findWalletBestBid(
	bids: AuctionBidEntry[] | null | undefined,
	walletAddress: string | null | undefined
): AuctionBidEntry | null {
	if (!walletAddress || !bids?.length) return null;
	const normalized = walletAddress.trim().toLowerCase();

	const walletBids = bids.filter(
		bid => bid.bidderAddress.trim().toLowerCase() === normalized
	);
	if (!walletBids.length) return null;

	return walletBids.reduce((best, bid) =>
		bid.amount > best.amount ? bid : best
	);
}

/** The current highest bid across the history, or the explicit fallback. */
export function resolveHighestBid(
	bids: AuctionBidEntry[] | null | undefined,
	explicitHighestBid?: number | null
): number | null {
	let highest: number | null = null;
	for (const bid of bids ?? []) {
		if (isFiniteNumber(bid.amount) && (highest == null || bid.amount > highest)) {
			highest = bid.amount;
		}
	}
	return highest ?? (isFiniteNumber(explicitHighestBid) ? explicitHighestBid : null);
}

/**
 * Whether the connected wallet is currently the leading bidder. Bids are
 * compared only against the actual history (never the explicit fallback), so
 * a wallet without a recorded bid can never appear as the leader.
 */
export function isWalletLeadingAuction(
	bids: AuctionBidEntry[] | null | undefined,
	walletAddress: string | null | undefined
): boolean {
	const walletBest = findWalletBestBid(bids, walletAddress);
	if (!walletBest || !bids?.length) return false;

	return bids.every(bid => bid.amount <= walletBest.amount);
}

/** Sorts bids highest-first for the leaderboard view. */
export function rankAuctionBids(
	bids: AuctionBidEntry[] | null | undefined
): AuctionBidEntry[] {
	if (!bids?.length) return [];
	return [...bids].sort((a, b) => b.amount - a.amount);
}

/** Compact display form for a long wallet address. */
export function shortenWalletAddress(
	address: string,
	prefixLength = 6,
	suffixLength = 4
): string {
	const trimmed = address.trim();
	if (trimmed.length <= prefixLength + suffixLength + 1) return trimmed;
	return `${trimmed.slice(0, prefixLength)}…${trimmed.slice(-suffixLength)}`;
}