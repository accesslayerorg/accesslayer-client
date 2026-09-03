/**
 * Unit tests for slippage tolerance utilities (#872).
 */

import { describe, expect, it } from 'vitest';
import {
	SLIPPAGE_TOLERANCE_PRESETS,
	SLIPPAGE_TOLERANCE_BOUNDS,
	DEFAULT_SLIPPAGE_TOLERANCE_PERCENT,
	validateSlippageTolerancePercent,
	computeMaxPriceStroops,
	computeMinPriceStroops,
	computeSlippageBounds,
} from '../slippageTolerance.utils';

describe('slippageTolerance.utils', () => {
	describe('presets and defaults', () => {
		it('exposes the 0.5% / 1% / 5% presets', () => {
			expect(SLIPPAGE_TOLERANCE_PRESETS).toEqual([0.5, 1, 5]);
		});

		it('defaults to 1%', () => {
			expect(DEFAULT_SLIPPAGE_TOLERANCE_PERCENT).toBe(1);
		});

		it('bounds tolerance between 0% and 50%', () => {
			expect(SLIPPAGE_TOLERANCE_BOUNDS.MIN_PERCENT).toBe(0);
			expect(SLIPPAGE_TOLERANCE_BOUNDS.MAX_PERCENT).toBe(50);
		});
	});

	describe('validateSlippageTolerancePercent', () => {
		it('accepts values within [0, 50]', () => {
			expect(validateSlippageTolerancePercent(0)).toBeNull();
			expect(validateSlippageTolerancePercent(1.5)).toBeNull();
			expect(validateSlippageTolerancePercent(50)).toBeNull();
		});

		it('rejects negative values', () => {
			expect(validateSlippageTolerancePercent(-1)).toMatch(/cannot be negative/i);
		});

		it('rejects values above 50', () => {
			expect(validateSlippageTolerancePercent(50.1)).toMatch(/cannot exceed 50%/i);
		});

		it('rejects null/undefined/NaN', () => {
			expect(validateSlippageTolerancePercent(null)).toMatch(/valid/i);
			expect(validateSlippageTolerancePercent(undefined)).toMatch(/valid/i);
			expect(validateSlippageTolerancePercent(NaN)).toMatch(/valid/i);
		});
	});

	describe('computeMaxPriceStroops', () => {
		it('computes preview_price * (1 + tolerance) for a buy', () => {
			// 1_000_000 * (1 + 0.01) = 1_010_000
			expect(computeMaxPriceStroops(1_000_000, 1)).toBe(1_010_000);
		});

		it('handles 0% tolerance (max == preview price)', () => {
			expect(computeMaxPriceStroops(1_000_000, 0)).toBe(1_000_000);
		});

		it('handles the 5% preset', () => {
			expect(computeMaxPriceStroops(2_000_000, 5)).toBe(2_100_000);
		});

		it('returns null when preview price is null/undefined', () => {
			expect(computeMaxPriceStroops(null, 1)).toBeNull();
			expect(computeMaxPriceStroops(undefined, 1)).toBeNull();
		});

		it('returns null when preview price is negative or non-finite', () => {
			expect(computeMaxPriceStroops(-100, 1)).toBeNull();
			expect(computeMaxPriceStroops(NaN, 1)).toBeNull();
		});

		it('rounds to the nearest stroop', () => {
			expect(computeMaxPriceStroops(3, 1)).toBe(Math.round(3 * 1.01));
		});
	});

	describe('computeMinPriceStroops', () => {
		it('computes preview_price * (1 - tolerance) for a sell', () => {
			// 1_000_000 * (1 - 0.01) = 990_000
			expect(computeMinPriceStroops(1_000_000, 1)).toBe(990_000);
		});

		it('handles 0% tolerance (min == preview price)', () => {
			expect(computeMinPriceStroops(1_000_000, 0)).toBe(1_000_000);
		});

		it('floors at 0 when tolerance is 100%+ (never returns a negative price)', () => {
			expect(computeMinPriceStroops(1_000_000, 100)).toBe(0);
		});

		it('returns null when preview price is null/undefined', () => {
			expect(computeMinPriceStroops(null, 1)).toBeNull();
			expect(computeMinPriceStroops(undefined, 1)).toBeNull();
		});

		it('returns null when preview price is negative or non-finite', () => {
			expect(computeMinPriceStroops(-100, 1)).toBeNull();
			expect(computeMinPriceStroops(NaN, 1)).toBeNull();
		});
	});

	describe('computeSlippageBounds', () => {
		it('only populates maxPriceStroops for a buy', () => {
			const bounds = computeSlippageBounds('buy', 1_000_000, 1);
			expect(bounds.maxPriceStroops).toBe(1_010_000);
			expect(bounds.minPriceStroops).toBeNull();
			expect(bounds.toleranceZPercent).toBe(1);
		});

		it('only populates minPriceStroops for a sell', () => {
			const bounds = computeSlippageBounds('sell', 1_000_000, 1);
			expect(bounds.minPriceStroops).toBe(990_000);
			expect(bounds.maxPriceStroops).toBeNull();
		});

		it('propagates null bounds when the reference price is unavailable', () => {
			expect(computeSlippageBounds('buy', null, 1).maxPriceStroops).toBeNull();
			expect(computeSlippageBounds('sell', undefined, 1).minPriceStroops).toBeNull();
		});
import { describe, expect, it } from 'vitest';
import {
	computeSlippagePriceBounds,
	validateSlippageTolerance,
	MAX_SLIPPAGE_TOLERANCE_PERCENT,
} from '@/utils/slippageTolerance.utils';

describe('computeSlippagePriceBounds (#877)', () => {
	it('computes max_price of 100.5 for a 0.5% buy tolerance on a 100 XLM preview', () => {
		const { maxPrice, minPrice } = computeSlippagePriceBounds(
			100,
			0.5,
			'buy'
		);
		expect(maxPrice).toBe(100.5);
		expect(minPrice).toBeNull();
	});

	it('computes max_price of 105 for a 5% buy tolerance on a 100 XLM preview', () => {
		const { maxPrice } = computeSlippagePriceBounds(100, 5, 'buy');
		expect(maxPrice).toBe(105);
	});

	it('computes min_price of 99 for a 1% sell tolerance on a 100 XLM preview', () => {
		const { minPrice, maxPrice } = computeSlippagePriceBounds(
			100,
			1,
			'sell'
		);
		expect(minPrice).toBe(99);
		expect(maxPrice).toBeNull();
	});

	it('sets max_price equal to the preview price for a custom 0% tolerance', () => {
		const { maxPrice } = computeSlippagePriceBounds(100, 0, 'buy');
		expect(maxPrice).toBe(100);
	});

	it('sets min_price equal to the preview price for a custom 0% sell tolerance', () => {
		const { minPrice } = computeSlippagePriceBounds(100, 0, 'sell');
		expect(minPrice).toBe(100);
	});

	it('does not accumulate binary floating-point drift for common percentages', () => {
		// 100 * 1.005 === 100.49999999999999 in raw IEEE-754 arithmetic;
		// the util must round this back to the exact expected value.
		expect(computeSlippagePriceBounds(100, 0.5, 'buy').maxPrice).toBe(
			100.5
		);
		expect(computeSlippagePriceBounds(37.5, 1.5, 'buy').maxPrice).toBeCloseTo(
			38.0625,
			7
		);
	});
});

describe('validateSlippageTolerance (#877)', () => {
	it('accepts a custom tolerance of 0%', () => {
		expect(validateSlippageTolerance(0)).toEqual({
			valid: true,
			error: null,
		});
	});

	it('accepts tolerances within the valid range', () => {
		expect(validateSlippageTolerance(0.5).valid).toBe(true);
		expect(validateSlippageTolerance(25).valid).toBe(true);
		expect(validateSlippageTolerance(MAX_SLIPPAGE_TOLERANCE_PERCENT).valid).toBe(
			true
		);
	});

	it('rejects a custom tolerance above 50% with a validation error', () => {
		const result = validateSlippageTolerance(51);
		expect(result.valid).toBe(false);
		expect(result.error).toMatch(/50%/);
	});

	it('rejects negative tolerances', () => {
		const result = validateSlippageTolerance(-1);
		expect(result.valid).toBe(false);
		expect(result.error).toBeTruthy();
	});

	it('rejects non-finite input', () => {
		expect(validateSlippageTolerance(NaN).valid).toBe(false);
		expect(validateSlippageTolerance(Infinity).valid).toBe(false);
	});
});
