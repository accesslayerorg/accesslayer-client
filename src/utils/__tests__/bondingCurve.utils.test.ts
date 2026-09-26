import { describe, it, expect } from 'vitest';
import {
	stroopsToXLM,
	xlmToStroops,
	calculatePriceAtSupply,
	generateBondingCurveData,
	calculatePriceImpact,
	generateChartDataPoints,
	findMilestoneRange,
} from '../bondingCurve.utils';

describe('bondingCurve.utils', () => {
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
