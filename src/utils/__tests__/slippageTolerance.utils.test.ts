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
