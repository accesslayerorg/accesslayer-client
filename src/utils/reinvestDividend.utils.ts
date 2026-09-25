import { STROOPS_PER_XLM } from '@/constants/stellar';

/**
 * Reinvest-dividend math for the portfolio page (#824).
 *
 * An unclaimed dividend balance (in XLM) is compounded back into more creator
 * keys using the current per-key price. Because keys are purchased in whole
 * units, only the whole-key portion is converted and the remainder stays as
 * XLM in the wallet.
 */

export interface ReinvestEstimate {
	/** Unclaimed dividend expressed in stroops. */
	unclaimedStroops: number;
	/** Per-key price in stroops (null when unavailable). */
	keyPriceStroops: number | null;
	/** Fractional number of keys the balance could buy. */
	estimatedKeys: number;
	/** Whole keys actually bought when reinvesting. */
	wholeKeys: number;
	/** XLM remainder (in stroops) not converted to a whole key. */
	remainderStroops: number;
}

function toNonNegative(value: number | null | undefined): number {
	if (value == null || !Number.isFinite(value) || value <= 0) return 0;
	return value;
}

/**
 * Estimates the key purchase from an unclaimed dividend balance.
 *
 * Returns `null` when the estimate cannot be computed (no unclaimed balance or
 * no usable key price) so callers can render a placeholder.
 */
export function estimateReinvest(
	unclaimedDividendXlm: number | null | undefined,
	keyPriceStroops: number | null | undefined
): ReinvestEstimate | null {
	if (
		keyPriceStroops == null ||
		!Number.isFinite(keyPriceStroops) ||
		keyPriceStroops <= 0
	) {
		return null;
	}

	const unclaimedStroops =
		toNonNegative(unclaimedDividendXlm) * STROOPS_PER_XLM;

	if (unclaimedStroops <= 0) {
		return null;
	}

	const estimatedKeys = unclaimedStroops / keyPriceStroops;
	const wholeKeys = Math.floor(estimatedKeys);
	const remainderStroops = unclaimedStroops % keyPriceStroops;

	return {
		unclaimedStroops,
		keyPriceStroops,
		estimatedKeys,
		wholeKeys,
		remainderStroops,
	};
}

/**
 * Converts an XLM amount stored as a decimal number into stroops.
 */
export function xlmToStroops(xlm: number | null | undefined): number {
	return toNonNegative(xlm) * STROOPS_PER_XLM;
}

/**
 * Whether a position carries an unclaimed dividend balance worth surfacing a
 * badge for.
 */
export function hasUnclaimedDividend(
	unclaimedDividendXlm: number | null | undefined
): boolean {
	return toNonNegative(unclaimedDividendXlm) > 0;
}
