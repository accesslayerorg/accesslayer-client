import { describe, expect, it } from 'vitest';
import {
	buildBundleBuyPayload,
	computeBundlePriceImpactSummary,
	estimateBundleItemCost,
	sumBundleTotalCostStroops,
} from '../bundleCart.utils';
import { calculateTradePriceImpact } from '@/utils/priceImpact.utils';
import type { BundleCartItem } from '@/hooks/useBundleCartStore';

function makeItem(overrides: Partial<BundleCartItem> = {}): BundleCartItem {
	return {
		keyId: 'key-1',
		keyName: 'Alpha Key',
		priceStroops: 1_000_000,
		quantity: 1,
		currentSupply: 100,
		...overrides,
	};
}

describe('estimateBundleItemCost (#1118)', () => {
	it('computes gross cost as price × quantity when no fees apply', () => {
		const breakdown = estimateBundleItemCost(
			makeItem({ priceStroops: 2_000_000, quantity: 4 })
		);

		expect(breakdown.grossCostStroops).toBe(8_000_000);
		expect(breakdown.totalCostStroops).toBe(8_000_000);
	});

	it('includes protocol and creator fees when provided', () => {
		const breakdown = estimateBundleItemCost(
			makeItem({
				priceStroops: 1_000_000,
				quantity: 10,
				protocolFeeBps: 250,
				creatorFeeBps: 500,
			})
		);

		expect(breakdown.protocolFeeStroops).toBe(250_000);
		expect(breakdown.creatorFeeStroops).toBe(500_000);
		expect(breakdown.totalCostStroops).toBe(11_750_000);
	});
});

describe('sumBundleTotalCostStroops (#1118)', () => {
	it('sums the estimated cost of every item', () => {
		const total = sumBundleTotalCostStroops([
			makeItem({ keyId: 'a', priceStroops: 1_000_000, quantity: 2 }),
			makeItem({ keyId: 'b', priceStroops: 3_000_000, quantity: 3 }),
		]);

		expect(total).toBe(2_000_000 + 9_000_000);
	});

	it('returns 0 for an empty cart', () => {
		expect(sumBundleTotalCostStroops([])).toBe(0);
	});
});

describe('computeBundlePriceImpactSummary (#1118)', () => {
	it('returns null when no item carries supply data', () => {
		expect(
			computeBundlePriceImpactSummary([
				makeItem({ currentSupply: null }),
				makeItem({ keyId: 'b', currentSupply: undefined }),
			])
		).toBeNull();
	});

	it('returns null for an empty cart', () => {
		expect(computeBundlePriceImpactSummary([])).toBeNull();
	});

	it('reports the buy-side impact for a single item', () => {
		const item = makeItem({ quantity: 50, currentSupply: 100 });

		const summary = computeBundlePriceImpactSummary([item]);

		expect(summary).not.toBeNull();
		expect(summary?.totalImpactPercent).toBeCloseTo(
			calculateTradePriceImpact({
				side: 'buy',
				quantity: 50,
				currentSupply: 100,
			})
		);
		expect(summary?.estimatedItemCount).toBe(1);
		expect(summary?.unestimatedItemCount).toBe(0);
	});

	it('weights each item impact by its estimated cost', () => {
		const cheap = makeItem({
			keyId: 'cheap',
			priceStroops: 1_000_000,
			quantity: 10,
			currentSupply: 100,
		});
		const expensive = makeItem({
			keyId: 'expensive',
			priceStroops: 9_000_000,
			quantity: 10,
			currentSupply: 5_000,
		});

		const summary = computeBundlePriceImpactSummary([cheap, expensive]);

		expect(summary).not.toBeNull();
		const cheapImpact = calculateTradePriceImpact({
			side: 'buy',
			quantity: 10,
			currentSupply: 100,
		});
		const expensiveImpact = calculateTradePriceImpact({
			side: 'buy',
			quantity: 10,
			currentSupply: 5_000,
		});
		// Cost weights: cheap = 10 stroops-units, expensive = 90.
		const expected = (cheapImpact * 10 + expensiveImpact * 90) / 100;
		expect(summary?.totalImpactPercent).toBeCloseTo(expected);
	});

	it('counts items skipped for missing supply data', () => {
		const summary = computeBundlePriceImpactSummary([
			makeItem({ keyId: 'with-supply', currentSupply: 100 }),
			makeItem({ keyId: 'without-supply', currentSupply: null }),
		]);

		expect(summary?.estimatedItemCount).toBe(1);
		expect(summary?.unestimatedItemCount).toBe(1);
	});
});

describe('buildBundleBuyPayload (#1118)', () => {
	it('maps cart items onto contract lines with their quantities', () => {
		const payload = buildBundleBuyPayload([
			makeItem({ keyId: 'a', quantity: 2 }),
			makeItem({ keyId: 'b', quantity: 5, priceStroops: 2_000_000 }),
		]);

		expect(payload.items).toEqual([
			{ keyId: 'a', amount: 2 },
			{ keyId: 'b', amount: 5 },
		]);
		expect(payload.totalCostStroops).toBe(2_000_000 + 10_000_000);
	});

	it('drops items with a non-positive or non-finite quantity', () => {
		const payload = buildBundleBuyPayload([
			makeItem({ keyId: 'valid', quantity: 3 }),
			makeItem({ keyId: 'zero', quantity: 0 }),
			makeItem({ keyId: 'nan', quantity: Number.NaN }),
		]);

		expect(payload.items).toEqual([{ keyId: 'valid', amount: 3 }]);
		expect(payload.totalCostStroops).toBe(3_000_000);
	});
});
