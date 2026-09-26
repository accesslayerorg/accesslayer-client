import { STROOPS_PER_XLM } from '@/constants/stellar';

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
 * Bonding curve parameters for calculating prices and costs.
 * Compatible with the existing simulation and pricing utilities.
 */
export interface BondingCurveParams {
	milestones: Omit<BondingCurveMilestone, 'priceXLM'>[];
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
			const progress = (supply - current.supply) / (next.supply - current.supply);
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
	const milestones = (customMilestones || DEFAULT_MILESTONES).map(milestone => ({
		...milestone,
		priceXLM: stroopsToXLM(milestone.priceStroops),
	}));

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
): { currentPrice: number; newPrice: number; priceIncrease: number; priceIncreasePercent: number } {
	const currentPrice = calculatePriceAtSupply(currentSupply, milestones);
	const newSupply = currentSupply + buyQuantity;
	const newPrice = calculatePriceAtSupply(newSupply, milestones);
	const priceIncrease = newPrice - currentPrice;
	const priceIncreasePercent = currentPrice > 0 ? (priceIncrease / currentPrice) * 100 : 0;

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
	const dataPoints: Array<{ supply: number; priceStroops: number; priceXLM: number }> = [];

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
			const supply = current.supply + (next.supply - current.supply) * progress;
			const priceStroops = Math.round(current.priceStroops + (next.priceStroops - current.priceStroops) * progress);
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

/**
 * Default bonding curve parameters for use across the application.
 */
export const DEFAULT_BONDING_CURVE_PARAMS: BondingCurveParams = {
	milestones: DEFAULT_MILESTONES,
};

/**
 * Alias for calculatePriceAtSupply to match the expected API name
 * used by simulation utilities.
 */
export function computeBondingCurvePrice(
	supply: number,
	params: BondingCurveParams = DEFAULT_BONDING_CURVE_PARAMS
): number {
	return calculatePriceAtSupply(supply, params.milestones);
}

/**
 * Computes the total cost to buy a quantity of keys from the current supply.
 * Uses the bonding curve to calculate the price at each step and sums the costs.
 */
export function computeBuyCost(
	currentSupply: number,
	quantity: number,
	params: BondingCurveParams = DEFAULT_BONDING_CURVE_PARAMS
): number {
	if (quantity <= 0) return 0;
	if (currentSupply < 0) return 0;

	let totalCost = 0;
	for (let i = 0; i < quantity; i++) {
		const supplyAtStep = currentSupply + i;
		totalCost += computeBondingCurvePrice(supplyAtStep, params);
	}

	return totalCost;
}
