/**
 * Slippage tolerance and bounding calculation utilities.
 *
 * Implements calculateSlippageBounds for bonding curve swap execution,
 * inline validation for tolerance inputs, and warnings for high/low tolerance levels.
 */

export type SwapSide = 'buy' | 'sell';

export interface SwapQuote {
	side?: SwapSide;
	type?: SwapSide | 'Buy' | 'Sell';
	amount?: number;
	quantity?: number;
	keys?: number;
	keysOut?: number;
	price?: number;
	unitPrice?: number;
	expectedPrice?: number;
	expectedOutput?: number;
	expectedAmount?: number;
	amountOut?: number;
	amountIn?: number;
	expectedSpent?: number;
	expectedCost?: number;
	totalCost?: number;
	totalSpent?: number;
	cost?: number;
	expectedProceeds?: number;
	totalProceeds?: number;
	netProceeds?: number;
	expectedReceived?: number;
	total?: number;
	totalStroops?: number;
	priceImpact?: number;
	priceImpactPercent?: number;
	priceImpactBps?: number;
	[key: string]: unknown;
}

export interface SlippageBounds {
	minReceived: number;
	maxSpent: number;
	toleranceBps: number;
	tolerancePercent: number;
	minPrice?: number | null;
	maxPrice?: number | null;
	minPriceStroops?: number | null;
	maxPriceStroops?: number | null;
}

export const SLIPPAGE_PRESETS = [0.5, 1, 3] as const;
export const DEFAULT_SLIPPAGE = 1;
export const MIN_SLIPPAGE = 0.01;
export const MAX_SLIPPAGE = 50;
export const HIGH_SLIPPAGE_THRESHOLD = 5;
export const LOW_SLIPPAGE_THRESHOLD = 0.1;

/**
 * Validates a custom slippage tolerance percentage.
 * Returns an error string if invalid, or null if valid.
 */
export function validateSlippageTolerance(
	percent: number | null | undefined
): string | null {
	if (percent == null || !Number.isFinite(percent)) {
		return 'Enter a valid slippage tolerance.';
	}
	if (percent < 0) {
		return 'Slippage tolerance cannot be negative.';
	}
	if (percent < MIN_SLIPPAGE) {
		return `Slippage tolerance must be at least ${MIN_SLIPPAGE}%.`;
	}
	if (percent > MAX_SLIPPAGE) {
		return `Slippage tolerance cannot exceed ${MAX_SLIPPAGE}%.`;
	}
	return null;
}

/**
 * Returns a warning string when tolerance is unusually high (>5%) or low (<0.1%),
 * or null if no warning is needed.
 */
export function getSlippageWarning(
	percent: number | null | undefined
): string | null {
	if (percent == null || !Number.isFinite(percent)) return null;
	if (percent > HIGH_SLIPPAGE_THRESHOLD && percent <= MAX_SLIPPAGE) {
		return 'High slippage tolerance. Your transaction may be frontrun or execute at an unfavorable price.';
	}
	if (percent < LOW_SLIPPAGE_THRESHOLD && percent >= MIN_SLIPPAGE) {
		return 'Low slippage tolerance. Your transaction may fail if the market price moves slightly.';
	}
	return null;
}

export function isHighSlippage(percent: number | null | undefined): boolean {
	return (
		percent != null &&
		Number.isFinite(percent) &&
		percent > HIGH_SLIPPAGE_THRESHOLD &&
		percent <= MAX_SLIPPAGE
	);
}

export function isLowSlippage(percent: number | null | undefined): boolean {
	return (
		percent != null &&
		Number.isFinite(percent) &&
		percent < LOW_SLIPPAGE_THRESHOLD &&
		percent >= MIN_SLIPPAGE
	);
}

/**
 * Computes minReceived and maxSpent bounds for a buy or sell quote given
 * slippage tolerance in basis points (e.g. 100 bps = 1%).
 *
 * For a buy:
 *  - maxSpent is the upper bound on what the trader will spend (expectedSpent * (1 + bps/10000))
 *  - minReceived is the lower bound on tokens received (expectedReceived * (1 - bps/10000))
 *
 * For a sell:
 *  - minReceived is the lower bound on currency proceeds (expectedProceeds * (1 - bps/10000))
 *  - maxSpent is the tokens committed to the swap
 */
export function calculateSlippageBounds(
	quote: SwapQuote | number,
	bps: number
): SlippageBounds {
	if (!Number.isFinite(bps) || bps < 0) {
		throw new Error(
			'Slippage tolerance bps must be a non-negative finite number'
		);
	}

	const tolerancePercent = bps / 100;

	if (typeof quote === 'number') {
		const val = Number.isFinite(quote) ? quote : 0;
		const minReceived = (val * (10_000 - bps)) / 10_000;
		const maxSpent = (val * (10_000 + bps)) / 10_000;
		return {
			minReceived,
			maxSpent,
			toleranceBps: bps,
			tolerancePercent,
			minPrice: minReceived,
			maxPrice: maxSpent,
			minPriceStroops: Math.round(minReceived),
			maxPriceStroops: Math.round(maxSpent),
		};
	}

	if (!quote || typeof quote !== 'object') {
		throw new Error('Invalid swap quote');
	}

	const rawSide = String(
		quote.side ??
			quote.type ??
			(quote.isBuy ? 'buy' : quote.isSell ? 'sell' : 'buy')
	).toLowerCase();
	const side: SwapSide = rawSide === 'sell' ? 'sell' : 'buy';

	const unitPrice =
		(typeof quote.expectedPrice === 'number'
			? quote.expectedPrice
			: undefined) ??
		(typeof quote.unitPrice === 'number' ? quote.unitPrice : undefined) ??
		(typeof quote.price === 'number' ? quote.price : undefined);

	const tokenQuantity =
		(typeof quote.amount === 'number' ? quote.amount : undefined) ??
		(typeof quote.quantity === 'number' ? quote.quantity : undefined) ??
		(typeof quote.keys === 'number' ? quote.keys : undefined);

	if (side === 'buy') {
		// Amount to spend (e.g. XLM/stroops)
		let expectedSpent =
			(typeof quote.expectedSpent === 'number'
				? quote.expectedSpent
				: undefined) ??
			(typeof quote.expectedCost === 'number'
				? quote.expectedCost
				: undefined) ??
			(typeof quote.totalCost === 'number' ? quote.totalCost : undefined) ??
			(typeof quote.totalSpent === 'number'
				? quote.totalSpent
				: undefined) ??
			(typeof quote.cost === 'number' ? quote.cost : undefined) ??
			(typeof quote.total === 'number' ? quote.total : undefined) ??
			(typeof quote.totalStroops === 'number'
				? quote.totalStroops
				: undefined);

		if (
			expectedSpent === undefined &&
			unitPrice !== undefined &&
			tokenQuantity !== undefined
		) {
			expectedSpent = unitPrice * tokenQuantity;
		}

		// Amount to receive (e.g. keys)
		let expectedReceived =
			(typeof quote.expectedReceived === 'number'
				? quote.expectedReceived
				: undefined) ??
			(typeof quote.expectedOutput === 'number'
				? quote.expectedOutput
				: undefined) ??
			(typeof quote.amountOut === 'number' ? quote.amountOut : undefined) ??
			(typeof quote.expectedAmount === 'number'
				? quote.expectedAmount
				: undefined) ??
			(typeof quote.keysOut === 'number' ? quote.keysOut : undefined);

		if (expectedReceived === undefined && tokenQuantity !== undefined) {
			expectedReceived = tokenQuantity;
		}

		if (expectedSpent === undefined && expectedReceived !== undefined) {
			expectedSpent = expectedReceived;
		}
		if (expectedReceived === undefined && expectedSpent !== undefined) {
			expectedReceived = expectedSpent;
		}

		const spentVal = expectedSpent ?? 0;
		const receivedVal = expectedReceived ?? 0;

		const maxSpent = (spentVal * (10_000 + bps)) / 10_000;
		const minReceived = (receivedVal * (10_000 - bps)) / 10_000;

		return {
			minReceived,
			maxSpent,
			toleranceBps: bps,
			tolerancePercent,
			maxPrice: maxSpent,
			minPrice: minReceived,
			maxPriceStroops: Math.round(maxSpent),
			minPriceStroops: Math.round(minReceived),
		};
	} else {
		// SELL
		let expectedProceeds =
			(typeof quote.expectedProceeds === 'number'
				? quote.expectedProceeds
				: undefined) ??
			(typeof quote.expectedReceived === 'number'
				? quote.expectedReceived
				: undefined) ??
			(typeof quote.totalProceeds === 'number'
				? quote.totalProceeds
				: undefined) ??
			(typeof quote.netProceeds === 'number'
				? quote.netProceeds
				: undefined) ??
			(typeof quote.total === 'number' ? quote.total : undefined) ??
			(typeof quote.totalStroops === 'number'
				? quote.totalStroops
				: undefined) ??
			(typeof quote.amountOut === 'number' ? quote.amountOut : undefined);

		if (
			expectedProceeds === undefined &&
			unitPrice !== undefined &&
			tokenQuantity !== undefined
		) {
			expectedProceeds = unitPrice * tokenQuantity;
		}

		let expectedSpent =
			(typeof quote.expectedSpent === 'number'
				? quote.expectedSpent
				: undefined) ??
			(typeof quote.amountIn === 'number' ? quote.amountIn : undefined) ??
			tokenQuantity;

		if (expectedProceeds === undefined && expectedSpent !== undefined) {
			expectedProceeds = expectedSpent;
		}
		if (expectedSpent === undefined && expectedProceeds !== undefined) {
			expectedSpent = expectedProceeds;
		}

		const proceedsVal = expectedProceeds ?? 0;
		const spentVal = expectedSpent ?? 0;

		const minReceived = Math.max(0, (proceedsVal * (10_000 - bps)) / 10_000);
		const maxSpent = spentVal;

		return {
			minReceived,
			maxSpent,
			toleranceBps: bps,
			tolerancePercent,
			minPrice: minReceived,
			maxPrice: maxSpent,
			minPriceStroops: Math.round(minReceived),
			maxPriceStroops: Math.round(maxSpent),
		};
	}
}
