/**
 * Slippage tolerance utilities for buy/sell trades (#872, #877).
 *
 * Computes the on-chain `max_price` (buy) / `min_price` (sell) bounds from a
 * preview price and a selected tolerance percentage, so the contract call
 * rejects the trade if the executed price moves against the user by more
 * than the tolerance allows.
 */

/** Preset slippage tolerance percentages surfaced in the selector UI. */
export const SLIPPAGE_TOLERANCE_PRESETS = [0.5, 1, 5] as const;

/** Default tolerance applied when the user has not made a selection. */
export const DEFAULT_SLIPPAGE_TOLERANCE_PERCENT = 1;

export const SLIPPAGE_TOLERANCE_BOUNDS = {
	MIN_PERCENT: 0,
	MAX_PERCENT: 50,
} as const;

/** Tolerances above this percentage are rejected as invalid. */
export const MAX_SLIPPAGE_TOLERANCE_PERCENT = 50;

/** Tolerances below this percentage are rejected as invalid. */
export const MIN_SLIPPAGE_TOLERANCE_PERCENT = 0;

export type TradeSide = 'buy' | 'sell';

// ---------------------------------------------------------------------------
// Legacy stroops-based helpers (#872) — used by TradeDialog
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// XLM-based helpers (#877) — used by the standalone selector & tests
// ---------------------------------------------------------------------------

export interface SlippagePriceBounds {
	/**
	 * Highest price the trade will accept paying, for a buy. `null` for
	 * sell-side computations.
	 */
	maxPrice: number | null;
	/**
	 * Lowest price the trade will accept receiving, for a sell. `null` for
	 * buy-side computations.
	 */
	minPrice: number | null;
}

/**
 * Decimal places prices are rounded to. Guards against binary
 * floating-point drift (e.g. `100 * 1.005` landing on 100.49999999999999
 * instead of 100.5) — XLM prices in this app are never displayed or
 * compared at finer than micro-XLM precision.
 */
const PRICE_DECIMAL_PLACES = 7;

function roundPrice(value: number): number {
	const factor = 10 ** PRICE_DECIMAL_PLACES;
	return Math.round(value * factor) / factor;
}

/**
 * Computes the max_price (buy) or min_price (sell) bound for a trade given
 * the preview price and a slippage tolerance percentage.
 *
 * @param previewPrice   The quoted/preview price before slippage is applied.
 * @param tolerancePercent  Slippage tolerance as a percent (e.g. 0.5 for 0.5%).
 * @param side  Whether this is a 'buy' (computes max_price) or 'sell'
 *              (computes min_price).
 */
export function computeSlippagePriceBounds(
	previewPrice: number,
	tolerancePercent: number,
	side: TradeSide
): SlippagePriceBounds {
	const multiplier = tolerancePercent / 100;

	if (side === 'buy') {
		return {
			maxPrice: roundPrice(previewPrice * (1 + multiplier)),
			minPrice: null,
		};
	}

	return {
		maxPrice: null,
		minPrice: roundPrice(previewPrice * (1 - multiplier)),
	};
}

export interface SlippageToleranceValidation {
	valid: boolean;
	/** Human-readable validation error, or `null` when the tolerance is valid. */
	error: string | null;
}

/**
 * Validates a (typically custom) slippage tolerance percentage.
 *
 * Valid range is [0, 50]. Anything above 50% is rejected as an unreasonably
 * high tolerance that would let a trade execute far away from the preview
 * price; negative values and non-finite input are also rejected.
 */
export function validateSlippageTolerance(
	tolerancePercent: number
): SlippageToleranceValidation {
	if (!Number.isFinite(tolerancePercent)) {
		return { valid: false, error: 'Enter a valid slippage tolerance.' };
	}

	if (tolerancePercent < MIN_SLIPPAGE_TOLERANCE_PERCENT) {
		return {
			valid: false,
			error: 'Slippage tolerance cannot be negative.',
		};
	}

	if (tolerancePercent > MAX_SLIPPAGE_TOLERANCE_PERCENT) {
		return {
			valid: false,
			error: `Slippage tolerance cannot exceed ${MAX_SLIPPAGE_TOLERANCE_PERCENT}%.`,
		};
	}

	return { valid: true, error: null };
}
