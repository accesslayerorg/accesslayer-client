import { describe, it, expect } from 'vitest';
import {
	stroopsToXLM,
	xlmToStroops,
	calculatePriceAtSupply,
	generateBondingCurveData,
	calculatePriceImpact,
	generateChartDataPoints,
	findMilestoneRange,
	computeBondingCurvePrice,
	computeBondingCurvePriceXLM,
	computeBuyCost,
	computeSellRevenue,
	DEFAULT_BONDING_CURVE_PARAMS,
	type BondingCurveParams,
} from '../bondingCurve.utils';

describe('bondingCurve.utils', () => {
	describe('Graduated bonding curve functions', () => {
		describe('stroopsToXLM', () => {
			it('should convert stroops to XLM correctly', () => {
				expect(stroopsToXLM(10_000_000)).toBe(1);
				expect(stroopsToXLM(5_000_000)).toBe(0.5);
				expect(stroopsToXLM(1_000_000)).toBe(0.1);
			});

			it('should handle zero stroops', () => {
				expect(stroopsToXLM(0)).toBe(0);
			});
		});

		describe('xlmToStroops', () => {
			it('should convert XLM to stroops correctly', () => {
				expect(xlmToStroops(1)).toBe(10_000_000);
				expect(xlmToStroops(0.5)).toBe(5_000_000);
				expect(xlmToStroops(0.1)).toBe(1_000_000);
			});

			it('should handle zero XLM', () => {
				expect(xlmToStroops(0)).toBe(0);
			});
		});

		describe('calculatePriceAtSupply', () => {
			const defaultMilestones = [
				{ supply: 0, priceStroops: 1000, label: 'Launch' },
				{ supply: 100, priceStroops: 2000, label: '100 keys' },
				{ supply: 500, priceStroops: 5000, label: '500 keys' },
			];

			it('should return first milestone price for supply before first milestone', () => {
				expect(calculatePriceAtSupply(-10, defaultMilestones)).toBe(1000);
				expect(calculatePriceAtSupply(0, defaultMilestones)).toBe(1000);
			});

			it('should return last milestone price for supply after last milestone', () => {
				expect(calculatePriceAtSupply(1000, defaultMilestones)).toBe(5000);
				expect(calculatePriceAtSupply(500, defaultMilestones)).toBe(5000);
			});

			it('should interpolate price between milestones', () => {
				// At supply 50 (halfway between 0 and 100), price should be halfway between 1000 and 2000
				expect(calculatePriceAtSupply(50, defaultMilestones)).toBe(1500);
				// At supply 300 (50% between 100 and 500), price should be 50% between 2000 and 5000
				expect(calculatePriceAtSupply(300, defaultMilestones)).toBe(3500);
			});

			it('should return exact milestone price at milestone boundaries', () => {
				expect(calculatePriceAtSupply(0, defaultMilestones)).toBe(1000);
				expect(calculatePriceAtSupply(100, defaultMilestones)).toBe(2000);
				expect(calculatePriceAtSupply(500, defaultMilestones)).toBe(5000);
			});

			it('should handle empty milestones array', () => {
				expect(calculatePriceAtSupply(100, [])).toBe(0);
			});
		});

		describe('generateBondingCurveData', () => {
			it('should generate bonding curve data with XLM prices', () => {
				const result = generateBondingCurveData(250, 3000);

				expect(result.milestones).toHaveLength(8);
				expect(result.currentSupply).toBe(250);
				expect(result.currentPriceStroops).toBe(3000);

				// Check that XLM prices are calculated
				result.milestones.forEach(milestone => {
					expect(milestone.priceXLM).toBe(milestone.priceStroops / 10_000_000);
				});
			});

			it('should use custom milestones when provided', () => {
				const customMilestones = [
					{ supply: 0, priceStroops: 500, label: 'Custom' },
					{ supply: 1000, priceStroops: 1000, label: 'Custom 1K' },
				];

				const result = generateBondingCurveData(500, 750, customMilestones);

				expect(result.milestones).toHaveLength(2);
				expect(result.milestones[0].label).toBe('Custom');
				expect(result.milestones[1].label).toBe('Custom 1K');
			});
		});

		describe('calculatePriceImpact', () => {
			const defaultMilestones = [
				{ supply: 0, priceStroops: 1000, label: 'Launch' },
				{ supply: 100, priceStroops: 2000, label: '100 keys' },
			];

			it('should calculate price impact correctly', () => {
				const result = calculatePriceImpact(50, 50, defaultMilestones);

				expect(result.currentPrice).toBe(1500);
				expect(result.newPrice).toBe(2000);
				expect(result.priceIncrease).toBe(500);
				expect(result.priceIncreasePercent).toBeCloseTo(33.33, 1);
			});

			it('should handle zero buy quantity', () => {
				const result = calculatePriceImpact(50, 0, defaultMilestones);

				expect(result.currentPrice).toBe(1500);
				expect(result.newPrice).toBe(1500);
				expect(result.priceIncrease).toBe(0);
				expect(result.priceIncreasePercent).toBe(0);
			});

			it('should handle buy quantity that crosses milestone boundary', () => {
				const result = calculatePriceImpact(80, 30, defaultMilestones);

				expect(result.currentPrice).toBe(1800);
				expect(result.newPrice).toBe(2000);
			});
		});

		describe('generateChartDataPoints', () => {
			const milestones = [
				{ supply: 0, priceStroops: 1000, priceXLM: 0.0001, label: 'Launch' },
				{ supply: 100, priceStroops: 2000, priceXLM: 0.0002, label: '100 keys' },
			];

			it('should generate smooth chart data points', () => {
				const result = generateChartDataPoints(milestones, 5);

				// Should have: first milestone + 4 intermediate + last milestone = 6 points
				expect(result).toHaveLength(6);
				expect(result[0].supply).toBe(0);
				expect(result[result.length - 1].supply).toBe(100);
			});

			it('should generate correct number of points based on pointsPerSegment', () => {
				const result = generateChartDataPoints(milestones, 10);
				// 1 milestone + 9 intermediate + 1 milestone = 11 points
				expect(result).toHaveLength(11);
			});

			it('should include milestone boundaries in data', () => {
				const result = generateChartDataPoints(milestones, 3);

				const hasFirstMilestone = result.some(p => p.supply === 0);
				const hasLastMilestone = result.some(p => p.supply === 100);

				expect(hasFirstMilestone).toBe(true);
				expect(hasLastMilestone).toBe(true);
			});
		});

		describe('findMilestoneRange', () => {
			const milestones = [
				{ supply: 0, priceStroops: 1000, priceXLM: 0.0001, label: 'Launch' },
				{ supply: 100, priceStroops: 2000, priceXLM: 0.0002, label: '100 keys' },
				{ supply: 500, priceStroops: 5000, priceXLM: 0.0005, label: '500 keys' },
			];

			it('should find correct range for supply between milestones', () => {
				const result = findMilestoneRange(250, milestones);

				expect(result).not.toBeNull();
				expect(result?.current.supply).toBe(100);
				expect(result?.next?.supply).toBe(500);
			});

			it('should return first milestone for supply before first milestone', () => {
				const result = findMilestoneRange(-10, milestones);

				expect(result).not.toBeNull();
				expect(result?.current.supply).toBe(0);
				expect(result?.next).toBeUndefined();
			});

			it('should return last milestone for supply after last milestone', () => {
				const result = findMilestoneRange(1000, milestones);

				expect(result).not.toBeNull();
				expect(result?.current.supply).toBe(500);
				expect(result?.next).toBeUndefined();
			});

			it('should return null for empty milestones', () => {
				const result = findMilestoneRange(100, []);
				expect(result).toBeNull();
			});

			it('should handle exact milestone boundaries', () => {
				const result = findMilestoneRange(100, milestones);

				expect(result).not.toBeNull();
				expect(result?.current.supply).toBe(100);
				expect(result?.next?.supply).toBe(500);
			});
		});
	});

	describe('Parameter-based bonding curve functions', () => {
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
});
