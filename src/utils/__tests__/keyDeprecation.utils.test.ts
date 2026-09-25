/**
 * Unit tests for key deprecation utilities (#871).
 */

import { describe, expect, it } from 'vitest';
import { isKeyDeprecated, estimateRedeemValue } from '../keyDeprecation.utils';

describe('keyDeprecation.utils', () => {
	describe('isKeyDeprecated', () => {
		it('returns true when deprecated is exactly true', () => {
			expect(isKeyDeprecated({ deprecated: true })).toBe(true);
		});

		it('returns false when deprecated is false', () => {
			expect(isKeyDeprecated({ deprecated: false })).toBe(false);
		});

		it('returns false when deprecated is absent', () => {
			expect(isKeyDeprecated({})).toBe(false);
		});

		it('returns false for null/undefined input', () => {
			expect(isKeyDeprecated(null)).toBe(false);
			expect(isKeyDeprecated(undefined)).toBe(false);
		});
	});

	describe('estimateRedeemValue', () => {
		it('computes totalValueStroops as quantity * keyPriceStroops', () => {
			const estimate = estimateRedeemValue(5, { priceStroops: 1_000_000 });

			expect(estimate).toEqual({
				quantity: 5,
				keyPriceStroops: 1_000_000,
				totalValueStroops: 5_000_000,
			});
		});

		it('resolves legacy XLM price via resolveCreatorKeyPriceStroops', () => {
			const estimate = estimateRedeemValue(2, { price: 0.1 });

			expect(estimate?.keyPriceStroops).toBe(1_000_000);
			expect(estimate?.totalValueStroops).toBe(2_000_000);
		});

		it('returns null for a zero or negative quantity', () => {
			expect(estimateRedeemValue(0, { priceStroops: 1_000_000 })).toBeNull();
			expect(estimateRedeemValue(-1, { priceStroops: 1_000_000 })).toBeNull();
		});

		it('returns null for a null/undefined quantity', () => {
			expect(estimateRedeemValue(null, { priceStroops: 1_000_000 })).toBeNull();
			expect(estimateRedeemValue(undefined, { priceStroops: 1_000_000 })).toBeNull();
		});

		it('returns null when no usable price is available', () => {
			expect(estimateRedeemValue(5, {})).toBeNull();
		});
	});
});
