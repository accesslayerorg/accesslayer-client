/**
 * Key buy simulation utilities (#875).
 *
 * Lets a user model a hypothetical buy of N keys from the key detail page
 * and see the projected price/cost/slippage impact before committing to a
 * real trade. Reuses the same bonding-curve cost primitive
 * (`computeBuyCost`) and fee math (`calculateFeeBreakdown`'s bps
 * calculation) already used by the real buy flow, rather than duplicating
 * pricing logic.
 */

import {
	computeBondingCurvePrice,
	computeBuyCost,
	DEFAULT_BONDING_CURVE_PARAMS,
	type BondingCurveParams,
} from '@/utils/bondingCurve.utils';

export interface KeySimulationRequest {
	/** Hypothetical quantity of keys to simulate buying. */
	quantity: number;
	/** Current key supply the simulation buys from. */
	currentSupply: number;
	/** Protocol fee in basis points (100 = 1%). */
	protocolFeeBps?: number;
	/** Creator fee in basis points (100 = 1%). */
	creatorFeeBps?: number;
	/** Bonding curve parameters; defaults to the platform default curve. */
	curveParams?: BondingCurveParams;
}

export interface KeySimulationResult {
	/** Per-key price at the current supply, before this hypothetical buy. */
	startPriceStroops: number;
	/** Per-key price at supply + quantity, after this hypothetical buy. */
	endPriceStroops: number;
	/** Curve-aware gross cost (stroops) for buying `quantity` keys. */
	grossCostStroops: number;
	protocolFeeStroops: number;
	protocolFeeBps: number;
	creatorFeeStroops: number;
	creatorFeeBps: number;
	/** Total cost after fees (stroops). */
	totalCostStroops: number;
	/**
	 * Price impact of this buy: how much the per-key price rises from start
	 * to end, as a percentage of the start price.
	 */
	priceImpactPercent: number;
	/** Average per-key price actually paid across the simulated buy. */
	averagePriceStroops: number;
}

/**
 * Simulates buying `quantity` keys from `currentSupply`, projecting the
 * curve-aware cost and the resulting price impact.
 *
 * Pure and synchronous — safe to call on every keystroke of a simulation
 * input without debouncing.
 */
export function simulateKeyBuy(
	request: KeySimulationRequest
): KeySimulationResult | null {
	const {
		quantity,
		currentSupply,
		protocolFeeBps = 0,
		creatorFeeBps = 0,
		curveParams = DEFAULT_BONDING_CURVE_PARAMS,
	} = request;

	if (!Number.isFinite(quantity) || quantity <= 0) return null;
	if (!Number.isFinite(currentSupply) || currentSupply < 0) return null;

	const startPriceStroops = computeBondingCurvePrice(
		currentSupply,
		curveParams
	);
	const endPriceStroops = computeBondingCurvePrice(
		currentSupply + quantity,
		curveParams
	);
	const grossCostStroops = computeBuyCost(currentSupply, quantity, curveParams);

	const protocolFeeStroops = Math.round(
		(grossCostStroops * protocolFeeBps) / 10_000
	);
	const creatorFeeStroops = Math.round(
		(grossCostStroops * creatorFeeBps) / 10_000
	);
	const totalCostStroops =
		grossCostStroops + protocolFeeStroops + creatorFeeStroops;

	const priceImpactPercent =
		startPriceStroops > 0
			? ((endPriceStroops - startPriceStroops) / startPriceStroops) * 100
			: 0;

	const averagePriceStroops = grossCostStroops / quantity;

	return {
		startPriceStroops,
		endPriceStroops,
		grossCostStroops,
		protocolFeeStroops,
		protocolFeeBps,
		creatorFeeStroops,
		creatorFeeBps,
		totalCostStroops,
		priceImpactPercent,
		averagePriceStroops,
	};
}
