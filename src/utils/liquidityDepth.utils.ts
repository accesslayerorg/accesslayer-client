/**
 * Liquidity depth helpers for the buy form (#1108).
 *
 * "Depth" is the largest number of keys a user can buy in one trade before the
 * bonding-curve price impact exceeds their slippage tolerance. Buying more
 * than that would move the price past the tolerance and the trade would be
 * rejected on-chain, so the buy form warns about it and blocks it.
 */
import { calculateTradePriceImpact } from '@/utils/priceImpact.utils';
import { BUY_QUANTITY_BOUNDS } from '@/constants/fees';

/** Share of the max depth at which the "approaching limit" warning starts. */
export const DEPTH_WARNING_RATIO = 0.8;

export type LiquidityDepthStatus = 'ok' | 'approaching' | 'exceeded';

export interface MaxBuyWithinSlippageOptions {
	/** Current key supply. */
	currentSupply: number;
	/** User's slippage tolerance in percent (e.g. 1 = 1%). */
	slippageTolerancePercent: number;
	/** Upper bound for the search; defaults to the per-trade buy maximum. */
	upperBound?: number;
}

/**
 * Largest whole number of keys whose price impact stays within the slippage
 * tolerance. Price impact grows monotonically with quantity on the bonding
 * curve, so a binary search finds it. Returns 0 when even one key is too much.
 */
export function computeMaxBuyWithinSlippage({
	currentSupply,
	slippageTolerancePercent,
	upperBound = BUY_QUANTITY_BOUNDS.MAX_QTY,
}: MaxBuyWithinSlippageOptions): number {
	if (
		!Number.isFinite(currentSupply) ||
		currentSupply < 0 ||
		!Number.isFinite(slippageTolerancePercent) ||
		slippageTolerancePercent < 0 ||
		!Number.isFinite(upperBound) ||
		upperBound < 1
	) {
		return 0;
	}

	const withinTolerance = (quantity: number): boolean =>
		calculateTradePriceImpact({
			side: 'buy',
			quantity,
			currentSupply,
		}) <= slippageTolerancePercent;

	if (!withinTolerance(1)) return 0;
	const cap = Math.floor(upperBound);
	if (withinTolerance(cap)) return cap;

	let low = 1; // known to fit
	let high = cap; // known not to fit
	while (high - low > 1) {
		const mid = Math.floor((low + high) / 2);
		if (withinTolerance(mid)) {
			low = mid;
		} else {
			high = mid;
		}
	}
	return low;
}

/**
 * Classifies the entered amount against the max depth. Amounts that are not a
 * positive number are `ok` (there is nothing to warn about yet).
 */
export function classifyLiquidityDepth(
	amount: number,
	maxDepth: number
): LiquidityDepthStatus {
	if (!Number.isFinite(amount) || amount <= 0) return 'ok';
	if (amount > maxDepth) return 'exceeded';
	if (amount >= maxDepth * DEPTH_WARNING_RATIO) return 'approaching';
	return 'ok';
}
