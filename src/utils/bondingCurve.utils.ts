import { STROOPS_PER_XLM } from '@/constants/stellar';

// ============================================================================
// GRADUATED BONDING CURVE (Milestone-based)
// ============================================================================

export interface BondingCurveMilestone {
	supply: number;
	priceStroops: number;
	priceXLM: number;
	label: string;
}

export interface BondingCurveData {
	milestones: BondingCurveMilestone[];
	currentSupply: number;
	currentPriceStroops: number;
}

/**
 * Default graduated bonding curve configuration.
 * Prices increase in steps at specific supply milestones.
 */
const DEFAULT_MILESTONES: Omit<BondingCurveMilestone, 'priceXLM'>[] = [
	{ supply: 0, priceStroops: 1000, label: 'Launch' },
	{ supply: 100, priceStroops: 2000, label: '100 keys' },
	{ supply: 500, priceStroops: 5000, label: '500 keys' },
	{ supply: 1000, priceStroops: 10000, label: '1K keys' },
	{ supply: 5000, priceStroops: 25000, label: '5K keys' },
	{ supply: 10000, priceStroops: 50000, label: '10K keys' },
	{ supply: 50000, priceStroops: 150000, label: '50K keys' },
	{ supply: 100000, priceStroops: 300000, label: '100K keys' },
];

/**
 * Converts stroops to XLM for display purposes.
 */
export function stroopsToXLM(stroops: number): number {
	return stroops / STROOPS_PER_XLM;
}

/**
 * Converts XLM to stroops for calculations.
 */
export function xlmToStroops(xlm: number): number {
	return Math.round(xlm * STROOPS_PER_XLM);
}

/**
 * Calculates the price at a specific supply point on the bonding curve.
 * Uses linear interpolation between milestones.
 */
export function calculatePriceAtSupply(
	supply: number,
	milestones: Omit<BondingCurveMilestone, 'priceXLM'>[] = DEFAULT_MILESTONES
): number {
	if (milestones.length === 0) return 0;

	// If supply is before the first milestone, use first milestone price
	if (supply <= milestones[0].supply) {
		return milestones[0].priceStroops;
	}

	// If supply is after the last milestone, use last milestone price
	if (supply >= milestones[milestones.length - 1].supply) {
		return milestones[milestones.length - 1].priceStroops;
	}

	// Find the two milestones to interpolate between
	for (let i = 0; i < milestones.length - 1; i++) {
		const current = milestones[i];
		const next = milestones[i + 1];

		if (supply >= current.supply && supply <= next.supply) {
			// Linear interpolation
			const progress =
				(supply - current.supply) / (next.supply - current.supply);
			const priceDiff = next.priceStroops - current.priceStroops;
			return Math.round(current.priceStroops + priceDiff * progress);
		}
	}

	return milestones[milestones.length - 1].priceStroops;
}

/**
 * Generates the complete bonding curve data with milestones and current position.
 */
export function generateBondingCurveData(
	currentSupply: number,
	currentPriceStroops: number,
	customMilestones?: Omit<BondingCurveMilestone, 'priceXLM'>[]
): BondingCurveData {
	const milestones = (customMilestones || DEFAULT_MILESTONES).map(
		milestone => ({
			...milestone,
			priceXLM: stroopsToXLM(milestone.priceStroops),
		})
	);

	return {
		milestones,
		currentSupply,
		currentPriceStroops,
	};
}

/**
 * Calculates the price impact of buying a specific quantity of keys.
 * Returns the new price after purchase and the price increase.
 */
export function calculatePriceImpact(
	currentSupply: number,
	buyQuantity: number,
	milestones: Omit<BondingCurveMilestone, 'priceXLM'>[] = DEFAULT_MILESTONES
): {
	currentPrice: number;
	newPrice: number;
	priceIncrease: number;
	priceIncreasePercent: number;
} {
	const currentPrice = calculatePriceAtSupply(currentSupply, milestones);
	const newSupply = currentSupply + buyQuantity;
	const newPrice = calculatePriceAtSupply(newSupply, milestones);
	const priceIncrease = newPrice - currentPrice;
	const priceIncreasePercent =
		currentPrice > 0 ? (priceIncrease / currentPrice) * 100 : 0;

	return {
		currentPrice,
		newPrice,
		priceIncrease,
		priceIncreasePercent,
	};
}

/**
 * Generates chart data points for smooth curve rendering.
 * Creates intermediate points between milestones for smoother visualization.
 */
export function generateChartDataPoints(
	milestones: BondingCurveMilestone[],
	pointsPerSegment: number = 10
): Array<{ supply: number; priceStroops: number; priceXLM: number }> {
	const dataPoints: Array<{
		supply: number;
		priceStroops: number;
		priceXLM: number;
	}> = [];

	for (let i = 0; i < milestones.length - 1; i++) {
		const current = milestones[i];
		const next = milestones[i + 1];

		// Add the current milestone
		dataPoints.push({
			supply: current.supply,
			priceStroops: current.priceStroops,
			priceXLM: current.priceXLM,
		});

		// Add intermediate points for smooth curve
		for (let j = 1; j < pointsPerSegment; j++) {
			const progress = j / pointsPerSegment;
			const supply =
				current.supply + (next.supply - current.supply) * progress;
			const priceStroops = Math.round(
				current.priceStroops +
					(next.priceStroops - current.priceStroops) * progress
			);
			const priceXLM = stroopsToXLM(priceStroops);

			dataPoints.push({ supply, priceStroops, priceXLM });
		}
	}

	// Add the last milestone
	const last = milestones[milestones.length - 1];
	dataPoints.push({
		supply: last.supply,
		priceStroops: last.priceStroops,
		priceXLM: last.priceXLM,
	});

	return dataPoints;
}

/**
 * Finds which milestone range a given supply falls into.
 */
export function findMilestoneRange(
	supply: number,
	milestones: BondingCurveMilestone[]
): { current: BondingCurveMilestone; next?: BondingCurveMilestone } | null {
	if (milestones.length === 0) return null;

	// Before first milestone
	if (supply < milestones[0].supply) {
		return { current: milestones[0] };
	}

	// After last milestone
	if (supply >= milestones[milestones.length - 1].supply) {
		return { current: milestones[milestones.length - 1] };
	}

	// Find the range
	for (let i = 0; i < milestones.length - 1; i++) {
		if (supply >= milestones[i].supply && supply < milestones[i + 1].supply) {
			return { current: milestones[i], next: milestones[i + 1] };
		}
	}

	return null;
}

// ============================================================================
// PARAMETER-BASED BONDING CURVE (Linear/Exponential)
// ============================================================================

/**
 * Bonding curve parameters for price calculation.
 * These parameters define the shape of the bonding curve.
 */
export interface BondingCurveParams {
	/** Base price in stroops when supply is 0 */
	basePriceStroops: number;
	/** Growth factor for exponential bonding curve (e.g., 1.01 for 1% growth per key) */
	growthFactor: number;
}

/**
 * Computes the bonding curve price at a given supply step.
 * Uses an exponential bonding curve formula: price = base_price * (growth_factor ^ supply)
 *
 * This is a pure computation function that does not mutate contract state.
 * It's useful for:
 * - Previewing prices before transactions
 * - Displaying price charts
 * - Calculating expected costs
 *
 * @param supply - The current supply (number of keys minted)
 * @param params - Bonding curve parameters
 * @returns Price in stroops at the given supply step
 *
 * @example
 * ```ts
 * const params = { basePriceStroops: 10000000, growthFactor: 1.01 }; // 1 XLM base, 1% growth
 * const priceAtSupply10 = computeBondingCurvePrice(10, params);
 * console.log(priceAtSupply10); // Price after 10 keys have been minted
 * ```
 */
export function computeBondingCurvePrice(
	supply: number,
	params: BondingCurveParams
): number {
	if (supply < 0) {
		throw new Error('Supply cannot be negative');
	}
	if (params.basePriceStroops < 0) {
		throw new Error('Base price cannot be negative');
	}
	if (params.growthFactor <= 0) {
		throw new Error('Growth factor must be positive');
	}

	// Linear bonding curve: price = base_price * (1 + (growth_factor - 1) * supply)
	// This is equivalent to base_price * growth_factor^supply for small growth factors
	// but more numerically stable for large supplies
	const priceMultiplier = 1 + (params.growthFactor - 1) * supply;
	return params.basePriceStroops * priceMultiplier;
}

/**
 * Computes the bonding curve price in XLM (decimal) at a given supply step.
 * Convenience wrapper around computeBondingCurvePrice that converts stroops to XLM.
 *
 * @param supply - The current supply (number of keys minted)
 * @param params - Bonding curve parameters
 * @returns Price in XLM at the given supply step
 */
export function computeBondingCurvePriceXLM(
	supply: number,
	params: BondingCurveParams
): number {
	const priceStroops = computeBondingCurvePrice(supply, params);
	return priceStroops / STROOPS_PER_XLM;
}

/**
 * Computes the total cost to buy a quantity of keys from a given supply.
 * This calculates the area under the bonding curve from `supply` to `supply + quantity`.
 *
 * For a linear bonding curve, this is the integral:
 * total_cost = base_price * quantity * (1 + (growth_factor - 1) * (supply + quantity/2))
 *
 * @param currentSupply - Current supply before purchase
 * @param quantity - Number of keys to buy
 * @param params - Bonding curve parameters
 * @returns Total cost in stroops
 */
export function computeBuyCost(
	currentSupply: number,
	quantity: number,
	params: BondingCurveParams
): number {
	if (quantity < 0) {
		throw new Error('Quantity cannot be negative');
	}
	if (currentSupply < 0) {
		throw new Error('Current supply cannot be negative');
	}

	const startPrice = computeBondingCurvePrice(currentSupply, params);
	const endPrice = computeBondingCurvePrice(currentSupply + quantity, params);

	// Average price for linear bonding curve
	const avgPrice = (startPrice + endPrice) / 2;
	return avgPrice * quantity;
}

/**
 * Computes the total revenue from selling a quantity of keys at a given supply.
 * This is the reverse of computeBuyCost - calculates the area under the curve
 * from `supply - quantity` to `supply`.
 *
 * @param currentSupply - Current supply before sale
 * @param quantity - Number of keys to sell
 * @param params - Bonding curve parameters
 * @returns Total revenue in stroops
 */
export function computeSellRevenue(
	currentSupply: number,
	quantity: number,
	params: BondingCurveParams
): number {
	if (quantity < 0) {
		throw new Error('Quantity cannot be negative');
	}
	if (quantity > currentSupply) {
		throw new Error('Cannot sell more keys than current supply');
	}

	const newSupply = currentSupply - quantity;
	const startPrice = computeBondingCurvePrice(newSupply, params);
	const endPrice = computeBondingCurvePrice(currentSupply, params);

	// Average price for linear bonding curve
	const avgPrice = (startPrice + endPrice) / 2;
	return avgPrice * quantity;
}

/**
 * Default bonding curve parameters for the platform.
 * These can be overridden per creator if needed.
 */
export const DEFAULT_BONDING_CURVE_PARAMS: BondingCurveParams = {
	basePriceStroops: 10_000_000, // 1 XLM
	growthFactor: 1.01, // 1% growth per key
};

// ============================================================================
// BIGINT CURVE ENGINE (price impact preview, #755)
// ============================================================================

/** Basis-point scale (10_000 bps = 100%). */
const BPS_SCALE = 10_000n;

/**
 * Fixed-point growth factor used by the bigint curve engine, scaled by
 * `GROWTH_SCALE`. Mirrors `DEFAULT_BONDING_CURVE_PARAMS.growthFactor` (1.01)
 * as an integer so every step of the preview is deterministic bigint math,
 * matching the contract's own fixed-point arithmetic rather than floats.
 */
const GROWTH_SCALE = 1_000_000n;
const DEFAULT_GROWTH_FACTOR_SCALED = 1_010_000n; // 1.01 * GROWTH_SCALE

const DEFAULT_BASE_PRICE_STROOPS_BIGINT = BigInt(
	DEFAULT_BONDING_CURVE_PARAMS.basePriceStroops
);

/** Price at `supply` under the same linear curve as {@link computeBondingCurvePrice}, in stroops, as a bigint. */
function priceAtSupplyBigint(
	supply: bigint,
	basePriceStroops: bigint = DEFAULT_BASE_PRICE_STROOPS_BIGINT,
	growthFactorScaled: bigint = DEFAULT_GROWTH_FACTOR_SCALED
): bigint {
	// price = basePrice * (1 + (growthFactor - 1) * supply)
	//       = basePrice * (GROWTH_SCALE + (growthFactorScaled - GROWTH_SCALE) * supply) / GROWTH_SCALE
	const multiplierScaled =
		GROWTH_SCALE + (growthFactorScaled - GROWTH_SCALE) * supply;
	return (basePriceStroops * multiplierScaled) / GROWTH_SCALE;
}

/** Result of a buy-cost preview: gross cost, fee, net cost, and resulting price — all in stroops. */
export interface CurveBuyPreview {
	grossCost: bigint;
	fee: bigint;
	netCost: bigint;
	newPrice: bigint;
}

/** Result of a sell-payout preview: gross payout, fee, net payout, and resulting price — all in stroops. */
export interface CurveSellPreview {
	grossPayout: bigint;
	fee: bigint;
	netPayout: bigint;
	newPrice: bigint;
}

/**
 * Computes the cost to buy `amount` keys starting from `currentSupply`,
 * using bigint arithmetic throughout so the preview never drifts from the
 * contract's own integer math via floating-point rounding.
 *
 * Gross cost is the average of the price before and after the purchase,
 * multiplied by the quantity — the same trapezoidal approximation the
 * float `computeBuyCost` above uses, just in bigint. `fee` is `feeBps`
 * basis points of the gross cost; `netCost` is what the trader actually
 * pays. Named distinctly from the float `computeBuyCost`/`computeSellRevenue`
 * above (which several existing call sites already depend on with a
 * `(supply, quantity, params)` float signature) to avoid colliding with them.
 */
export function computeBuyCostPreview(
	currentSupply: bigint,
	amount: bigint,
	feeBps: bigint
): CurveBuyPreview {
	if (amount < 0n) throw new Error('Amount cannot be negative');
	if (currentSupply < 0n) throw new Error('Current supply cannot be negative');

	const startPrice = priceAtSupplyBigint(currentSupply);
	const newSupply = currentSupply + amount;
	const newPrice = priceAtSupplyBigint(newSupply);

	const grossCost = ((startPrice + newPrice) * amount) / 2n;
	const fee = (grossCost * feeBps) / BPS_SCALE;
	const netCost = grossCost + fee;

	return { grossCost, fee, netCost, newPrice };
}

/**
 * Computes the payout for selling `amount` keys from `currentSupply`, using
 * bigint arithmetic throughout. Mirrors the float `computeSellRevenue`
 * above in bigint form; `fee` is deducted from the gross payout to produce
 * `netPayout`.
 */
export function computeSellPayoutPreview(
	currentSupply: bigint,
	amount: bigint,
	feeBps: bigint
): CurveSellPreview {
	if (amount < 0n) throw new Error('Amount cannot be negative');
	if (currentSupply < 0n) throw new Error('Current supply cannot be negative');
	if (amount > currentSupply) {
		throw new Error('Cannot sell more keys than current supply');
	}

	const newSupply = currentSupply - amount;
	const startPrice = priceAtSupplyBigint(newSupply);
	const endPrice = priceAtSupplyBigint(currentSupply);

	const grossPayout = ((startPrice + endPrice) * amount) / 2n;
	const fee = (grossPayout * feeBps) / BPS_SCALE;
	const netPayout = grossPayout - fee;

	return { grossPayout, fee, netPayout, newPrice: startPrice };
}

/** Slippage color band for the price-impact badge. */
export type SlippageSeverity = 'low' | 'medium' | 'high';

/**
 * Classifies a slippage percentage into the badge's green/yellow/red bands:
 * green (`low`) under 1%, yellow (`medium`) 1-5%, red (`high`) over 5%.
 */
export function classifySlippageSeverity(
	slippagePercent: number
): SlippageSeverity {
	const magnitude = Math.abs(slippagePercent);
	if (magnitude > 5) return 'high';
	if (magnitude >= 1) return 'medium';
	return 'low';
}

/**
 * Computes the slippage percentage between the pre-trade and post-trade
 * price: `(newPrice - currentPrice) / currentPrice * 100`. Returns 0 when
 * the current price is zero (nothing to compare against) rather than
 * dividing by zero.
 */
export function computeSlippagePercent(
	currentPrice: bigint,
	newPrice: bigint
): number {
	if (currentPrice === 0n) return 0;
	// Scale by 10_000 before converting to Number so sub-percent slippage
	// on small bigint values survives the bigint division's truncation.
	const scaled = ((newPrice - currentPrice) * 1_000_000n) / currentPrice;
	return Number(scaled) / 10_000;
}

/**
 * Applies a worst-case buffer (in basis points) on top of a computed cost,
 * matching the `max_price` tolerance submitted to the contract so the user
 * sees the true worst-case XLM figure, not just the expected one.
 */
export function applyWorstCaseBuffer(
	costStroops: bigint,
	bufferBps: bigint
): bigint {
	return costStroops + (costStroops * bufferBps) / BPS_SCALE;
}

// ============================================================================
// LINEAR BONDING CURVE PARAMETERS & PROPOSAL PREVIEW
// ============================================================================

export interface LinearCurveParams {
	slope: number;
	intercept: number;
}

export interface CurveImpactPreview {
	currentPrice: number;
	newPrice: number;
	priceChange: number;
	percentChange: number;
}

/**
 * Computes linear bonding curve price: intercept + slope * supply.
 * All units are in XLM.
 */
export function computeLinearCurvePrice(
	supply: number,
	slope: number,
	intercept: number
): number {
	if (supply < 0) {
		throw new Error('Supply cannot be negative');
	}
	if (slope < 0) {
		throw new Error('Slope cannot be negative');
	}
	if (intercept < 0) {
		throw new Error('Intercept cannot be negative');
	}
	return intercept + slope * supply;
}

/**
 * Computes price impact preview between current and proposed linear curve parameters.
 */
export function computeCurveImpactPreview(
	supply: number,
	current: LinearCurveParams,
	proposed: LinearCurveParams
): CurveImpactPreview {
	const currentPrice = computeLinearCurvePrice(
		supply,
		current.slope,
		current.intercept
	);
	const newPrice = computeLinearCurvePrice(
		supply,
		proposed.slope,
		proposed.intercept
	);
	const priceChange = newPrice - currentPrice;
	const percentChange =
		currentPrice > 0 ? (priceChange / currentPrice) * 100 : 0;

	return {
		currentPrice,
		newPrice,
		priceChange,
		percentChange,
	};
}
