import {
	computeBondingCurvePrice,
	DEFAULT_BONDING_CURVE_PARAMS,
	type BondingCurveParams,
} from '@/utils/bondingCurve.utils';

/**
 * Price impact calculation for the key simulation tool and trading flow (#887, #919).
 *
 * impact = (simulated_price - spot_price) / spot_price * 100
 */

/** Default threshold in percent above which price impact is considered high. */
export const PRICE_IMPACT_THRESHOLD_PERCENT = 5;

export function calculatePriceImpact(
	simulatedPrice: number,
	spotPrice: number
): number {
	if (!spotPrice || spotPrice <= 0) return 0;
	return ((simulatedPrice - spotPrice) / spotPrice) * 100;
}

export function formatPriceImpact(impact: number): string {
	if (impact === 0) return '0.00%';
	if (impact > 0) return `+${impact.toFixed(2)}%`;
	return `${impact.toFixed(2)}%`;
}

/**
 * Determines whether a given price impact percentage exceeds the warning threshold.
 */
export function isHighPriceImpact(
	impactPercent: number | null | undefined,
	threshold: number = PRICE_IMPACT_THRESHOLD_PERCENT
): boolean {
	if (impactPercent == null || !Number.isFinite(impactPercent)) return false;
	return Math.abs(impactPercent) > threshold;
}

export interface TradePriceImpactOptions {
	side: 'buy' | 'sell';
	quantity: number;
	currentSupply: number;
	curveParams?: BondingCurveParams;
}

/**
 * Computes the percentage price impact for a buy or sell trade on the bonding curve.
 *
 * For buys: price increases as supply increases ((nextPrice - spotPrice) / spotPrice * 100).
 * For sells: price decreases as supply decreases ((spotPrice - nextPrice) / spotPrice * 100).
 */
export function calculateTradePriceImpact({
	side,
	quantity,
	currentSupply,
	curveParams = DEFAULT_BONDING_CURVE_PARAMS,
}: TradePriceImpactOptions): number {
	if (!Number.isFinite(quantity) || quantity <= 0) return 0;
	if (!Number.isFinite(currentSupply) || currentSupply < 0) return 0;

	const spotPrice = computeBondingCurvePrice(currentSupply, curveParams);
	if (spotPrice <= 0) return 0;

	if (side === 'buy') {
		const nextPrice = computeBondingCurvePrice(
			currentSupply + quantity,
			curveParams
		);
		return ((nextPrice - spotPrice) / spotPrice) * 100;
	}

	const newSupply = Math.max(0, currentSupply - quantity);
	const nextPrice = computeBondingCurvePrice(newSupply, curveParams);
	return ((spotPrice - nextPrice) / spotPrice) * 100;
}
