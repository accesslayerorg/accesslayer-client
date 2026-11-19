/**
 * Bid-ask spread utilities for the creator key trading panel (#951).
 *
 * The spread is the difference between the price a buyer pays (ask / buy
 * price) and the price a seller receives (bid / sell price). It represents
 * the cost of an immediate round-trip trade — buy a key and sell it straight
 * back — so it is surfaced prominently on the trading surfaces.
 *
 * Values are reported by the key config API in stroops; the backend may send
 * an explicit `spreadStroops` / `spreadBps` pair, or just the two prices, in
 * which case the spread is derived here.
 */

/** Input shape shared by the API response and the display component. */
export interface KeySpreadInput {
	/** Current price to buy one key, in stroops. */
	buyPriceStroops?: number | null;
	/** Current price to sell one key, in stroops. */
	sellPriceStroops?: number | null;
	/** Explicit absolute spread in stroops, when the API reports it. */
	spreadStroops?: number | null;
	/** Explicit spread in basis points of the buy price, when reported. */
	spreadBps?: number | null;
}

export interface KeySpread {
	/** Buy (ask) price in stroops, when known. */
	buyPriceStroops: number | null;
	/** Sell (bid) price in stroops, when known. */
	sellPriceStroops: number | null;
	/** Absolute spread in stroops, or null when it cannot be determined. */
	spreadStroops: number | null;
	/** Spread as a percentage of the buy price, or null when unknown. */
	spreadPercent: number | null;
	/** True when both buy and sell prices are known. */
	hasPricePair: boolean;
	/** True when a non-zero spread should be rendered. */
	hasSpread: boolean;
	/** True when the config is known and buy/sell prices are equal. */
	isZero: boolean;
}

function toFiniteNumber(value: number | null | undefined): number | null {
	return value != null && Number.isFinite(value) ? value : null;
}

/**
 * Derives the spread from a key config payload.
 *
 * - An explicit `spreadStroops` wins over derived values.
 * - Otherwise the spread is `|buy - sell|` when both prices are known.
 * - An explicit `spreadBps` wins over the derived percentage.
 * - Otherwise the percentage is relative to the buy (ask) price.
 */
export function calculateKeySpread(input: KeySpreadInput = {}): KeySpread {
	const buyPriceStroops = toFiniteNumber(input.buyPriceStroops);
	const sellPriceStroops = toFiniteNumber(input.sellPriceStroops);
	const explicitSpread = toFiniteNumber(input.spreadStroops);
	const explicitSpreadBps = toFiniteNumber(input.spreadBps);
	const hasPricePair = buyPriceStroops != null && sellPriceStroops != null;

	let spreadStroops: number | null = null;
	if (explicitSpread != null) {
		spreadStroops = Math.abs(explicitSpread);
	} else if (hasPricePair) {
		spreadStroops = Math.abs(buyPriceStroops! - sellPriceStroops!);
	}

	let spreadPercent: number | null = null;
	if (explicitSpreadBps != null) {
		spreadPercent = Math.abs(explicitSpreadBps) / 100;
	} else if (
		spreadStroops != null &&
		buyPriceStroops != null &&
		buyPriceStroops > 0
	) {
		spreadPercent = (spreadStroops / buyPriceStroops) * 100;
	}

	return {
		buyPriceStroops,
		sellPriceStroops,
		spreadStroops,
		spreadPercent,
		hasPricePair,
		hasSpread: spreadStroops != null && spreadStroops > 0,
		isZero: spreadStroops === 0,
	};
}

/**
 * Whether the spread surface has anything meaningful to show: either a
 * non-zero spread, or a known price pair (which may be equal, i.e. zero
 * spread). Unknown configs render nothing.
 */
export function hasSpreadDisplay(spread: KeySpread): boolean {
	return spread.hasSpread || (spread.isZero && spread.hasPricePair);
}
