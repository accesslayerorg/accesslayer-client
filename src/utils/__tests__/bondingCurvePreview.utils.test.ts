import { describe, it, expect } from 'vitest';
import {
	computeBuyCostPreview,
	computeSellPayoutPreview,
	classifySlippageSeverity,
	computeSlippagePercent,
	applyWorstCaseBuffer,
	computeBuyCost,
	computeSellRevenue,
	DEFAULT_BONDING_CURVE_PARAMS,
} from '../bondingCurve.utils';

/** Reference table derived from the float curve, for cross-validation. */
const REFERENCE_SUPPLIES = [0, 1, 10, 100, 1000];
const NO_FEE_BPS = 0n;
const SOME_FEE_BPS = 250n; // 2.5%

describe('computeBuyCostPreview', () => {
	it.each(REFERENCE_SUPPLIES)(
		'matches the float curve reference at supply %i (no fee)',
		supply => {
			const amount = 5n;
			const preview = computeBuyCostPreview(
				BigInt(supply),
				amount,
				NO_FEE_BPS
			);

			const referenceCost = computeBuyCost(
				supply,
				Number(amount),
				DEFAULT_BONDING_CURVE_PARAMS
			);

			// bigint integer division vs float rounding can differ by a few
			// stroops on the margin; allow a small tolerance relative to size.
			const diff = Math.abs(Number(preview.grossCost) - referenceCost);
			expect(diff).toBeLessThanOrEqual(1);
		}
	);

	it('applies feeBps on top of the gross cost', () => {
		const preview = computeBuyCostPreview(100n, 10n, SOME_FEE_BPS);
		expect(preview.fee).toBe((preview.grossCost * SOME_FEE_BPS) / 10_000n);
		expect(preview.netCost).toBe(preview.grossCost + preview.fee);
	});

	it('returns zero cost for a zero-amount buy', () => {
		const preview = computeBuyCostPreview(100n, 0n, SOME_FEE_BPS);
		expect(preview.grossCost).toBe(0n);
		expect(preview.fee).toBe(0n);
		expect(preview.netCost).toBe(0n);
	});

	it('rejects a negative amount', () => {
		expect(() => computeBuyCostPreview(100n, -1n, NO_FEE_BPS)).toThrow();
	});

	it('rejects a negative current supply', () => {
		expect(() => computeBuyCostPreview(-1n, 10n, NO_FEE_BPS)).toThrow();
	});
});

describe('computeSellPayoutPreview', () => {
	it.each(REFERENCE_SUPPLIES.filter(s => s >= 5))(
		'matches the float curve reference at supply %i (no fee)',
		supply => {
			const amount = 5n;
			const preview = computeSellPayoutPreview(
				BigInt(supply),
				amount,
				NO_FEE_BPS
			);

			const referencePayout = computeSellRevenue(
				supply,
				Number(amount),
				DEFAULT_BONDING_CURVE_PARAMS
			);

			const diff = Math.abs(Number(preview.grossPayout) - referencePayout);
			expect(diff).toBeLessThanOrEqual(1);
		}
	);

	it('deducts feeBps from the gross payout', () => {
		const preview = computeSellPayoutPreview(100n, 10n, SOME_FEE_BPS);
		expect(preview.fee).toBe((preview.grossPayout * SOME_FEE_BPS) / 10_000n);
		expect(preview.netPayout).toBe(preview.grossPayout - preview.fee);
	});

	it('rejects selling more than the current supply', () => {
		expect(() => computeSellPayoutPreview(5n, 10n, NO_FEE_BPS)).toThrow();
	});

	it('rejects a negative amount', () => {
		expect(() => computeSellPayoutPreview(100n, -1n, NO_FEE_BPS)).toThrow();
	});
});

describe('computeSlippagePercent', () => {
	it('computes the percentage increase from current to new price', () => {
		expect(computeSlippagePercent(100n, 105n)).toBeCloseTo(5, 4);
		expect(computeSlippagePercent(100n, 100n)).toBeCloseTo(0, 4);
	});

	it('returns 0 when the current price is zero to avoid dividing by zero', () => {
		expect(computeSlippagePercent(0n, 50n)).toBe(0);
	});

	it('computes negative slippage for a price decrease', () => {
		expect(computeSlippagePercent(100n, 95n)).toBeCloseTo(-5, 4);
	});
});

describe('classifySlippageSeverity', () => {
	it('classifies under 1% as low (green)', () => {
		expect(classifySlippageSeverity(0)).toBe('low');
		expect(classifySlippageSeverity(0.99)).toBe('low');
	});

	it('classifies 1% to 5% as medium (yellow)', () => {
		expect(classifySlippageSeverity(1)).toBe('medium');
		expect(classifySlippageSeverity(5)).toBe('medium');
	});

	it('classifies over 5% as high (red)', () => {
		expect(classifySlippageSeverity(5.01)).toBe('high');
		expect(classifySlippageSeverity(20)).toBe('high');
	});

	it('uses the magnitude for negative slippage', () => {
		expect(classifySlippageSeverity(-6)).toBe('high');
		expect(classifySlippageSeverity(-0.5)).toBe('low');
	});
});

describe('applyWorstCaseBuffer', () => {
	it('adds the buffer percentage on top of the cost', () => {
		// 0.5% buffer (50 bps) on 1_000_000 stroops = 5_000 extra.
		expect(applyWorstCaseBuffer(1_000_000n, 50n)).toBe(1_005_000n);
	});

	it('returns the original cost when the buffer is zero', () => {
		expect(applyWorstCaseBuffer(1_000_000n, 0n)).toBe(1_000_000n);
	});
});
