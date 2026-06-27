import { describe, it, expect } from 'vitest';
import { clampBuyQuantity } from '../buyQuantity';
import { BUY_QUANTITY_BOUNDS } from '@/constants/fees';

describe('clampBuyQuantity utility', () => {
	it('keeps valid integer inputs within bounds unchanged', () => {
		const result = clampBuyQuantity(5);
		expect(result.value).toBe(5);
		expect(result.adjusted).toBe(false);
		expect(result.reason).toBe('none');
	});

	it('keeps border values unchanged', () => {
		const minResult = clampBuyQuantity(BUY_QUANTITY_BOUNDS.MIN_QTY);
		expect(minResult.value).toBe(BUY_QUANTITY_BOUNDS.MIN_QTY);
		expect(minResult.adjusted).toBe(false);

		const maxResult = clampBuyQuantity(BUY_QUANTITY_BOUNDS.MAX_QTY);
		expect(maxResult.value).toBe(BUY_QUANTITY_BOUNDS.MAX_QTY);
		expect(maxResult.adjusted).toBe(false);
	});

	it('clamps values below minimum to minimum', () => {
		const zeroResult = clampBuyQuantity(0);
		expect(zeroResult.value).toBe(BUY_QUANTITY_BOUNDS.MIN_QTY);
		expect(zeroResult.adjusted).toBe(true);
		expect(zeroResult.reason).toBe('below_min');

		const negativeResult = clampBuyQuantity(-10);
		expect(negativeResult.value).toBe(BUY_QUANTITY_BOUNDS.MIN_QTY);
		expect(negativeResult.adjusted).toBe(true);
		expect(negativeResult.reason).toBe('below_min');
	});

	it('clamps values above maximum to maximum', () => {
		const excessiveResult = clampBuyQuantity(105);
		expect(excessiveResult.value).toBe(BUY_QUANTITY_BOUNDS.MAX_QTY);
		expect(excessiveResult.adjusted).toBe(true);
		expect(excessiveResult.reason).toBe('above_max');
	});

	it('handles invalid numeric inputs (NaN, empty string) by clamping to minimum', () => {
		const nanResult = clampBuyQuantity(NaN);
		expect(nanResult.value).toBe(BUY_QUANTITY_BOUNDS.MIN_QTY);
		expect(nanResult.adjusted).toBe(true);
		expect(nanResult.reason).toBe('below_min');

		const emptyResult = clampBuyQuantity('');
		expect(emptyResult.value).toBe(BUY_QUANTITY_BOUNDS.MIN_QTY);
		expect(emptyResult.adjusted).toBe(true);
		expect(emptyResult.reason).toBe('below_min');
	});

	it('rounds fractional inputs to the nearest integer', () => {
		const fractionResult = clampBuyQuantity(5.4);
		expect(fractionResult.value).toBe(5);
		expect(fractionResult.adjusted).toBe(true);

		const fractionUpResult = clampBuyQuantity(5.7);
		expect(fractionUpResult.value).toBe(6);
		expect(fractionUpResult.adjusted).toBe(true);
	});

	it('allows custom min and max bounds', () => {
		const customResult = clampBuyQuantity(25, 5, 20);
		expect(customResult.value).toBe(20);
		expect(customResult.adjusted).toBe(true);
		expect(customResult.reason).toBe('above_max');

		const customMinResult = clampBuyQuantity(2, 5, 20);
		expect(customMinResult.value).toBe(5);
		expect(customMinResult.adjusted).toBe(true);
		expect(customMinResult.reason).toBe('below_min');
	});
});
