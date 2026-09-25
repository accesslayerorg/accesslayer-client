import { STROOPS_PER_XLM } from '@/constants/stellar';

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
