import { describe, expect, it } from 'vitest';
import {
	computeBondingCurvePrice,
	computeBondingCurvePriceXLM,
	computeBuyCost,
	computeSellRevenue,
	DEFAULT_BONDING_CURVE_PARAMS,
	type BondingCurveParams,
} from '../bondingCurve.utils';

describe('bonding curve utilities', () => {
	const defaultParams: BondingCurveParams = {
		basePriceStroops: 10_000_000, // 1 XLM
		growthFactor: 1.01, // 1% growth per key
	};

	describe('computeBondingCurvePrice', () => {
		it('returns base price when supply is 0', () => {
			const price = computeBondingCurvePrice(0, defaultParams);
			expect(price).toBe(10_000_000);
		});

		it('increases price as supply increases', () => {
			const price0 = computeBondingCurvePrice(0, defaultParams);
			const price10 = computeBondingCurvePrice(10, defaultParams);
			const price100 = computeBondingCurvePrice(100, defaultParams);

			expect(price10).toBeGreaterThan(price0);
			expect(price100).toBeGreaterThan(price10);
		});

		it('calculates correct price for linear bonding curve', () => {
			// At supply 10: price = 10_000_000 * (1 + 0.01 * 10) = 10_000_000 * 1.1 = 11_000_000
			const price = computeBondingCurvePrice(10, defaultParams);
			expect(price).toBe(11_000_000);
		});

		it('handles fractional growth factors', () => {
			const params: BondingCurveParams = {
				basePriceStroops: 5_000_000,
				growthFactor: 1.005, // 0.5% growth
			};
			const price = computeBondingCurvePrice(20, params);
			// price = 5_000_000 * (1 + 0.005 * 20) = 5_000_000 * 1.1 = 5_500_000
			expect(price).toBeCloseTo(5_500_000);
		});

		it('throws error for negative supply', () => {
			expect(() => computeBondingCurvePrice(-1, defaultParams)).toThrow(
				'Supply cannot be negative'
			);
		});

		it('throws error for negative base price', () => {
			const invalidParams: BondingCurveParams = {
				basePriceStroops: -100,
				growthFactor: 1.01,
			};
			expect(() => computeBondingCurvePrice(10, invalidParams)).toThrow(
				'Base price cannot be negative'
			);
		});

		it('throws error for non-positive growth factor', () => {
			const invalidParams: BondingCurveParams = {
				basePriceStroops: 10_000_000,
				growthFactor: 0,
			};
			expect(() => computeBondingCurvePrice(10, invalidParams)).toThrow(
				'Growth factor must be positive'
			);
		});

		it('handles zero growth factor (flat curve)', () => {
			const flatParams: BondingCurveParams = {
				basePriceStroops: 10_000_000,
				growthFactor: 1.0, // No growth
			};
			const price = computeBondingCurvePrice(100, flatParams);
			expect(price).toBe(10_000_000); // Price stays constant
		});
	});

	describe('computeBondingCurvePriceXLM', () => {
		it('converts stroops to XLM correctly', () => {
			const priceXLM = computeBondingCurvePriceXLM(0, defaultParams);
			expect(priceXLM).toBe(1); // 10_000_000 stroops = 1 XLM
		});

		it('returns decimal XLM values', () => {
			const priceXLM = computeBondingCurvePriceXLM(10, defaultParams);
			// 11_000_000 stroops = 1.1 XLM
			expect(priceXLM).toBe(1.1);
		});

		it('handles small stroop amounts', () => {
			const smallParams: BondingCurveParams = {
				basePriceStroops: 1_000_000, // 0.1 XLM
				growthFactor: 1.01,
			};
			const priceXLM = computeBondingCurvePriceXLM(0, smallParams);
			expect(priceXLM).toBe(0.1);
		});
	});

	describe('computeBuyCost', () => {
		it('calculates cost for single key at base price', () => {
			const cost = computeBuyCost(0, 1, defaultParams);
			// avg price between supply 0 and 1: (10_000_000 + 10_100_000) / 2 = 10_050_000
			expect(cost).toBeCloseTo(10_050_000);
		});

		it('calculates cost for multiple keys', () => {
			const cost = computeBuyCost(0, 10, defaultParams);
			// Average price between supply 0 and 10: (10_000_000 + 11_000_000) / 2 = 10_500_000
			// Total cost: 10_500_000 * 10 = 105_000_000
			expect(cost).toBe(105_000_000);
		});

		it('calculates cost starting from non-zero supply', () => {
			const cost = computeBuyCost(10, 5, defaultParams);
			// Price at supply 10: 11_000_000
			// Price at supply 15: 10_000_000 * (1 + 0.01 * 15) = 11_500_000
			// Average: (11_000_000 + 11_500_000) / 2 = 11_250_000
			// Total: 11_250_000 * 5 = 56_250_000
			expect(cost).toBe(56_250_000);
		});

		it('throws error for negative quantity', () => {
			expect(() => computeBuyCost(0, -1, defaultParams)).toThrow(
				'Quantity cannot be negative'
			);
		});

		it('throws error for negative current supply', () => {
			expect(() => computeBuyCost(-1, 1, defaultParams)).toThrow(
				'Current supply cannot be negative'
			);
		});

		it('handles zero quantity', () => {
			const cost = computeBuyCost(10, 0, defaultParams);
			expect(cost).toBe(0);
		});
	});

	describe('computeSellRevenue', () => {
		it('calculates revenue for single key sale', () => {
			const revenue = computeSellRevenue(1, 1, defaultParams);
			// Price at supply 0: 10_000_000
			// Price at supply 1: 10_100_000
			// Average: (10_000_000 + 10_100_000) / 2 = 10_050_000
			expect(revenue).toBe(10_050_000);
		});

		it('calculates revenue for multiple keys', () => {
			const revenue = computeSellRevenue(10, 5, defaultParams);
			// Price at supply 5: 10_500_000
			// Price at supply 10: 11_000_000
			// Average: (10_500_000 + 11_000_000) / 2 = 10_750_000
			// Total: 10_750_000 * 5 = 53_750_000
			expect(revenue).toBe(53_750_000);
		});

		it('throws error when selling more than current supply', () => {
			expect(() => computeSellRevenue(5, 10, defaultParams)).toThrow(
				'Cannot sell more keys than current supply'
			);
		});

		it('throws error for negative quantity', () => {
			expect(() => computeSellRevenue(10, -1, defaultParams)).toThrow(
				'Quantity cannot be negative'
			);
		});

		it('handles selling entire supply', () => {
			const revenue = computeSellRevenue(10, 10, defaultParams);
			// Price at supply 0: 10_000_000
			// Price at supply 10: 11_000_000
			// Average: (10_000_000 + 11_000_000) / 2 = 10_500_000
			// Total: 10_500_000 * 10 = 105_000_000
			expect(revenue).toBe(105_000_000);
		});

		it('handles zero quantity', () => {
			const revenue = computeSellRevenue(10, 0, defaultParams);
			expect(revenue).toBe(0);
		});
	});

	describe('DEFAULT_BONDING_CURVE_PARAMS', () => {
		it('has valid default parameters', () => {
			expect(DEFAULT_BONDING_CURVE_PARAMS.basePriceStroops).toBe(10_000_000);
			expect(DEFAULT_BONDING_CURVE_PARAMS.growthFactor).toBe(1.01);
		});

		it('can be used with computeBondingCurvePrice', () => {
			const price = computeBondingCurvePrice(10, DEFAULT_BONDING_CURVE_PARAMS);
			expect(price).toBe(11_000_000);
		});
	});

	describe('integration scenarios', () => {
		it('buy and sell are inverse operations (ignoring slippage)', () => {
			const initialSupply = 10;
			const buyQuantity = 5;
			
			const buyCost = computeBuyCost(initialSupply, buyQuantity, defaultParams);
			const newSupply = initialSupply + buyQuantity;
			const sellRevenue = computeSellRevenue(newSupply, buyQuantity, defaultParams);
			
			// Due to linear curve, buy cost should equal sell revenue for same quantity
			expect(sellRevenue).toBe(buyCost);
		});

		it('calculates price progression across supply range', () => {
			const prices = [];
			for (let i = 0; i <= 100; i += 10) {
				prices.push(computeBondingCurvePrice(i, defaultParams));
			}
			
			// Verify monotonic increase
			for (let i = 1; i < prices.length; i++) {
				expect(prices[i]).toBeGreaterThan(prices[i - 1]);
			}
			
			// Verify specific values
			expect(prices[0]).toBeCloseTo(10_000_000); // Supply 0
			expect(prices[5]).toBeCloseTo(15_000_000); // Supply 50 (10M * (1 + 0.01*50))
			expect(prices[10]).toBeCloseTo(20_000_000); // Supply 100 (10M * (1 + 0.01*100))
		});

		it('handles large supply values', () => {
			const largeSupply = 10000;
			const price = computeBondingCurvePrice(largeSupply, defaultParams);
			// price = 10_000_000 * (1 + 0.01 * 10000) = 10_000_000 * 101 = 1_010_000_000
			expect(price).toBeCloseTo(1_010_000_000);
		});
	});
});
