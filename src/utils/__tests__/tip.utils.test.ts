import { describe, it, expect } from 'vitest';
import {
	calculateTipBreakdown,
	isTipMessageValid,
	isTipAmountValid,
	TIP_FEE_PERCENT,
	TIP_MESSAGE_MAX_LENGTH,
} from '@/utils/tip.utils';

describe('tip.utils', () => {
	describe('calculateTipBreakdown', () => {
		it('calculates 2% fee deduction and net amount correctly for whole amounts', () => {
			const result = calculateTipBreakdown(100);
			expect(result.amount).toBe(100);
			expect(result.fee).toBe(2);
			expect(result.netAmount).toBe(98);
			expect(result.feePercent).toBe(2);
		});

		it('calculates 2% fee deduction and net amount correctly for decimal amounts', () => {
			const result = calculateTipBreakdown(10);
			expect(result.amount).toBe(10);
			expect(result.fee).toBe(0.2);
			expect(result.netAmount).toBe(9.8);
		});

		it('calculates small fractional amounts accurately without float drift', () => {
			const result = calculateTipBreakdown(5.5);
			expect(result.amount).toBe(5.5);
			expect(result.fee).toBe(0.11);
			expect(result.netAmount).toBe(5.39);
		});

		it('returns zeroes for zero or negative amounts', () => {
			expect(calculateTipBreakdown(0)).toEqual({
				amount: 0,
				fee: 0,
				netAmount: 0,
				feePercent: TIP_FEE_PERCENT,
			});
			expect(calculateTipBreakdown(-15)).toEqual({
				amount: 0,
				fee: 0,
				netAmount: 0,
				feePercent: TIP_FEE_PERCENT,
			});
		});

		it('returns zeroes for NaN or non-finite values', () => {
			expect(calculateTipBreakdown(NaN)).toEqual({
				amount: 0,
				fee: 0,
				netAmount: 0,
				feePercent: TIP_FEE_PERCENT,
			});
			expect(calculateTipBreakdown(Infinity)).toEqual({
				amount: 0,
				fee: 0,
				netAmount: 0,
				feePercent: TIP_FEE_PERCENT,
			});
		});
	});

	describe('isTipMessageValid', () => {
		it('accepts undefined, null, or empty string', () => {
			expect(isTipMessageValid(undefined)).toBe(true);
			expect(isTipMessageValid(null)).toBe(true);
			expect(isTipMessageValid('')).toBe(true);
		});

		it('accepts messages within the 280-character limit', () => {
			expect(isTipMessageValid('Thanks for creating great content!')).toBe(true);
			expect(isTipMessageValid('a'.repeat(TIP_MESSAGE_MAX_LENGTH))).toBe(true);
		});

		it('rejects messages strictly above the 280-character limit', () => {
			expect(isTipMessageValid('a'.repeat(TIP_MESSAGE_MAX_LENGTH + 1))).toBe(false);
			expect(isTipMessageValid('a'.repeat(300))).toBe(false);
		});
	});

	describe('isTipAmountValid', () => {
		it('returns true for positive finite numbers', () => {
			expect(isTipAmountValid(0.1)).toBe(true);
			expect(isTipAmountValid(10)).toBe(true);
			expect(isTipAmountValid(1000)).toBe(true);
		});

		it('returns false for zero, negative, NaN, or null', () => {
			expect(isTipAmountValid(0)).toBe(false);
			expect(isTipAmountValid(-5)).toBe(false);
			expect(isTipAmountValid(NaN)).toBe(false);
			expect(isTipAmountValid(null)).toBe(false);
			expect(isTipAmountValid(undefined)).toBe(false);
		});
	});
});
