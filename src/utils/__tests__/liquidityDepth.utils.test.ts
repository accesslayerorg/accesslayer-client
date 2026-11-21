import { describe, expect, it } from 'vitest';
import {
	DEPTH_WARNING_RATIO,
	classifyLiquidityDepth,
	computeMaxBuyWithinSlippage,
} from '@/utils/liquidityDepth.utils';
import { calculateTradePriceImpact } from '@/utils/priceImpact.utils';

const impact = (quantity: number, currentSupply: number) =>
	calculateTradePriceImpact({ side: 'buy', quantity, currentSupply });

describe('computeMaxBuyWithinSlippage (#1108)', () => {
	it('returns the largest quantity whose impact stays within tolerance', () => {
		const supply = 1_000;
		const tolerance = 1;
		const max = computeMaxBuyWithinSlippage({
			currentSupply: supply,
			slippageTolerancePercent: tolerance,
		});

		expect(max).toBeGreaterThan(0);
		expect(impact(max, supply)).toBeLessThanOrEqual(tolerance);
		if (max < 100) {
			expect(impact(max + 1, supply)).toBeGreaterThan(tolerance);
		}
	});

	it('grows when the slippage tolerance is raised', () => {
		const supply = 1_000;
		const low = computeMaxBuyWithinSlippage({
			currentSupply: supply,
			slippageTolerancePercent: 0.5,
		});
		const high = computeMaxBuyWithinSlippage({
			currentSupply: supply,
			slippageTolerancePercent: 2,
		});
		expect(high).toBeGreaterThan(low);
	});

	it('is limited by the per-trade maximum', () => {
		expect(
			computeMaxBuyWithinSlippage({
				currentSupply: 1_000_000,
				slippageTolerancePercent: 50,
				upperBound: 25,
			})
		).toBe(25);
	});

	it('returns 0 when even one key exceeds the tolerance', () => {
		expect(
			computeMaxBuyWithinSlippage({
				currentSupply: 1,
				slippageTolerancePercent: 0,
			})
		).toBe(0);
	});

	it('returns 0 for invalid input', () => {
		expect(
			computeMaxBuyWithinSlippage({
				currentSupply: Number.NaN,
				slippageTolerancePercent: 1,
			})
		).toBe(0);
		expect(
			computeMaxBuyWithinSlippage({
				currentSupply: 100,
				slippageTolerancePercent: -1,
			})
		).toBe(0);
	});
});

describe('classifyLiquidityDepth (#1108)', () => {
	it('is ok well under the limit', () => {
		expect(classifyLiquidityDepth(10, 100)).toBe('ok');
	});

	it('warns from the warning ratio up to and including the limit', () => {
		expect(classifyLiquidityDepth(100 * DEPTH_WARNING_RATIO, 100)).toBe(
			'approaching'
		);
		expect(classifyLiquidityDepth(100, 100)).toBe('approaching');
	});

	it('flags amounts above the limit as exceeded', () => {
		expect(classifyLiquidityDepth(101, 100)).toBe('exceeded');
		expect(classifyLiquidityDepth(1, 0)).toBe('exceeded');
	});

	it('does not warn for empty or invalid amounts', () => {
		expect(classifyLiquidityDepth(Number.NaN, 100)).toBe('ok');
		expect(classifyLiquidityDepth(0, 100)).toBe('ok');
	});
});
