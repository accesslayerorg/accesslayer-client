/**
 * Slippage tolerance utilities for buy/sell trades (#872).
 *
 * Computes the on-chain `max_price` (buy) / `min_price` (sell) bounds from a
 * preview price and a selected tolerance percentage, so the contract call
 * rejects the trade if the executed price moves against the user by more
 * than the tolerance allows.
 */

/**
 * Slippage tolerance selector logic — issue #877.
 *
 * A trade preview's `max_price` (for buys) or `min_price` (for sells) is
 * the preview price adjusted by the user's selected slippage tolerance:
 * buys accept paying up to `tolerance%` more than the preview price, sells
 * accept receiving up to `tolerance%` less.
 */

/** Preset tolerance options shown in the slippage selector, in percent. */
export const SLIPPAGE_TOLERANCE_PRESETS = [0.5, 1, 5] as const;

/** Tolerances above this percentage are rejected as invalid. */
export const MAX_SLIPPAGE_TOLERANCE_PERCENT = 50;

/** Tolerances below this percentage are rejected as invalid. */
export const MIN_SLIPPAGE_TOLERANCE_PERCENT = 0;

/** Default tolerance applied when the user has not made a selection. */
export const DEFAULT_SLIPPAGE_TOLERANCE_PERCENT = 1;

export const SLIPPAGE_TOLERANCE_BOUNDS = {
	MIN_PERCENT: 0,
	MAX_PERCENT: 50,
} as const;

/**
 * Validates a custom slippage tolerance input (percentage, e.g. 1.5 = 1.5%).
 * Returns an error message when invalid, or `null` when the value is usable.
 */
export function validateSlippageTolerancePercent(
	value: number | null | undefined
): string | null {
	if (value == null || !Number.isFinite(value)) {
		return 'Enter a valid slippage tolerance.';
	}
	if (value < SLIPPAGE_TOLERANCE_BOUNDS.MIN_PERCENT) {
		return 'Slippage tolerance cannot be negative.';
	}
	if (value > SLIPPAGE_TOLERANCE_BOUNDS.MAX_PERCENT) {
		return `Slippage tolerance cannot exceed ${SLIPPAGE_TOLERANCE_BOUNDS.MAX_PERCENT}%.`;
	}
	return null;
}

/**
 * Computes the maximum acceptable price (in stroops) for a buy transaction
 * given a preview price and a tolerance percentage.
 *
 * `max_price = preview_price * (1 + tolerance)`
 */
export function computeMaxPriceStroops(
	previewPriceStroops: number | null | undefined,
	toleranceZPercent: number
): number | null {
	if (
		previewPriceStroops == null ||
		!Number.isFinite(previewPriceStroops) ||
		previewPriceStroops < 0 ||
		!Number.isFinite(toleranceZPercent)
	) {
		return null;
	}

	const toleranceFraction = toleranceZPercent / 100;
	return Math.round(previewPriceStroops * (1 + toleranceFraction));
}

/**
 * Computes the minimum acceptable price (in stroops) for a sell transaction
 * given a preview price and a tolerance percentage.
 *
 * `min_price = preview_price * (1 - tolerance)`, floored at 0.
 */
export function computeMinPriceStroops(
	previewPriceStroops: number | null | undefined,
	toleranceZPercent: number
): number | null {
	if (
		previewPriceStroops == null ||
		!Number.isFinite(previewPriceStroops) ||
		previewPriceStroops < 0 ||
		!Number.isFinite(toleranceZPercent)
	) {
		return null;
	}

	const toleranceFraction = toleranceZPercent / 100;
	const minPrice = previewPriceStroops * (1 - toleranceFraction);
	return Math.max(0, Math.round(minPrice));
}

export interface SlippageBounds {
	/** Selected tolerance, as a percentage (e.g. 1 = 1%). */
	toleranceZPercent: number;
	/** `max_price` in stroops to pass to the buy contract call. */
	maxPriceStroops: number | null;
	/** `min_price` in stroops to pass to the sell contract call. */
	minPriceStroops: number | null;
}

/**
 * Computes both bounds for a given side; only the bound relevant to the
 * trade side is populated (the other is `null`), matching how buy/sell
 * contract calls only ever need one of `max_price`/`min_price`.
 */
export function computeSlippageBounds(
	side: 'buy' | 'sell',
	previewPriceStroops: number | null | undefined,
	toleranceZPercent: number
): SlippageBounds {
	return {
		toleranceZPercent,
		maxPriceStroops:
			side === 'buy'
				? computeMaxPriceStroops(previewPriceStroops, toleranceZPercent)
				: null,
		minPriceStroops:
			side === 'sell'
				? computeMinPriceStroops(previewPriceStroops, toleranceZPercent)
				: null,
	};
}

