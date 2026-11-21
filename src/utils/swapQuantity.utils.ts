import { TRADE_FEE_ESTIMATE } from '@/constants/fees';

export type SwapSide = 'buy' | 'sell';

/**
 * Sell quick-select percentages offered on the sell tab (#1299).
 */
export const SELL_QUICK_PERCENTS = [25, 50, 75] as const;

/**
 * Computes a sell quantity equal to pct% of the held balance, rounded down
 * to whole keys. Never exceeds the held balance, even at tiny balances where
 * floating-point drift could otherwise round up.
 */
export function percentOfBalance(balance: number, pct: number): number {
	if (
		!Number.isFinite(balance) ||
		balance <= 0 ||
		!Number.isFinite(pct) ||
		pct <= 0
	) {
		return 0;
	}
	const raw = balance * (pct / 100);
	const qty = Math.floor(raw);
	return Math.min(qty, Math.floor(balance));
}

/** Whole-key sell max: the entire held balance. */
export function maxSellAmount(balance: number): number {
	if (!Number.isFinite(balance) || balance <= 0) return 0;
	return Math.floor(balance);
}

/**
 * Buy Max derived from the XLM balance minus a reserved network fee.
 * Leaves enough XLM for fees and reserve. Result never exceeds the balance.
 *
 * The reserved fee should come from the trade fee estimate helper
 * (`TRADE_FEE_ESTIMATE.DEFAULT_NETWORK_FEE`) so on-chain fee estimates stay
 * the single source of truth.
 */
export function maxBuyAmount(
	xlmBalance: number,
	reservedNetworkFee: number
): number {
	if (!Number.isFinite(xlmBalance) || xlmBalance <= 0) return 0;
	const fee = Number.isFinite(reservedNetworkFee) ? reservedNetworkFee : 0;
	return Math.max(0, Math.floor(xlmBalance - fee));
}

/** Default reserved network fee for a buy, taken from the fee estimate helper. */
export function defaultReservedNetworkFee(): number {
	return TRADE_FEE_ESTIMATE.DEFAULT_NETWORK_FEE;
}
