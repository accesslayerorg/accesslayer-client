import { describe, expect, it } from 'vitest';
import {
	clampBatchQuantity,
	clampBatchSlippage,
	estimateBatchItemCost,
	sumBatchTotalCostStroops,
	computeBatchPriceImpactSummary,
	buildBatchSwapPayload,
} from '../batchTrade.utils';
import type { BatchTradeItem } from '@/types/batchTrade.types';

function makeBatchItem(overrides: Partial<BatchTradeItem> = {}): BatchTradeItem {
	return {
		keyId: 'key-1',
		keyName: 'Alice Explorer',
		priceStroops: 10_000_000, // 1 XLM
		amount: 2,
		direction: 'buy',
		slippageTolerance: 1,
		currentSupply: 50,
		protocolFeeBps: 250,
		creatorFeeBps: 250,
		...overrides,
	};
}

describe('batchTrade.utils (#1155)', () => {
	describe('clampBatchQuantity', () => {
		it('clamps values below minimum to 1', () => {
			expect(clampBatchQuantity(0)).toBe(1);
			expect(clampBatchQuantity(-10)).toBe(1);
			expect(clampBatchQuantity(Number.NaN)).toBe(1);
		});

		it('clamps values above maximum to 100', () => {
			expect(clampBatchQuantity(999)).toBe(100);
		});

		it('rounds fractional quantities', () => {
			expect(clampBatchQuantity(3.7)).toBe(4);
		});
	});

	describe('clampBatchSlippage', () => {
		it('clamps values below 0 to 0', () => {
			expect(clampBatchSlippage(-5)).toBe(0);
		});

		it('clamps values above 50 to 50', () => {
			expect(clampBatchSlippage(80)).toBe(50);
		});

		it('returns default for non-finite values', () => {
			expect(clampBatchSlippage(Number.NaN)).toBe(1);
		});
	});

	describe('estimateBatchItemCost', () => {
		it('calculates buy cost including fees', () => {
			const item = makeBatchItem({
				amount: 2,
				priceStroops: 10_000_000,
				direction: 'buy',
				protocolFeeBps: 250, // 2.5%
				creatorFeeBps: 250, // 2.5%
			});
			const estimate = estimateBatchItemCost(item);

			// Gross: 20_000_000 stroops
			expect(estimate.grossStroops).toBe(20_000_000);
			// Fees: 5% of 20_000_000 = 1_000_000
			expect(estimate.feeStroops).toBe(1_000_000);
			// Net: 21_000_000
			expect(estimate.netCostStroops).toBe(21_000_000);
		});

		it('calculates sell proceeds deducting fees', () => {
			const item = makeBatchItem({
				amount: 3,
				priceStroops: 10_000_000,
				direction: 'sell',
				protocolFeeBps: 250,
				creatorFeeBps: 250,
			});
			const estimate = estimateBatchItemCost(item);

			// Gross: 30_000_000 stroops
			expect(estimate.grossStroops).toBe(30_000_000);
			// Fees: 5% of 30_000_000 = 1_500_000
			expect(estimate.feeStroops).toBe(1_500_000);
			// Net proceeds: 28_500_000
			expect(estimate.netCostStroops).toBe(28_500_000);
		});
	});

	describe('sumBatchTotalCostStroops', () => {
		it('aggregates pure buy orders accurately', () => {
			const items = [
				makeBatchItem({ keyId: '1', amount: 1, priceStroops: 10_000_000, direction: 'buy', protocolFeeBps: 0, creatorFeeBps: 0 }),
				makeBatchItem({ keyId: '2', amount: 2, priceStroops: 20_000_000, direction: 'buy', protocolFeeBps: 0, creatorFeeBps: 0 }),
			];
			const summary = sumBatchTotalCostStroops(items);
			expect(summary.totalBuyCostStroops).toBe(50_000_000);
			expect(summary.totalSellProceedsStroops).toBe(0);
			expect(summary.totalEstimatedCostStroops).toBe(50_000_000);
		});

		it('aggregates mixed buy and sell orders accurately', () => {
			const items = [
				makeBatchItem({ keyId: '1', amount: 2, priceStroops: 10_000_000, direction: 'buy', protocolFeeBps: 0, creatorFeeBps: 0 }), // 20M buy
				makeBatchItem({ keyId: '2', amount: 1, priceStroops: 10_000_000, direction: 'sell', protocolFeeBps: 0, creatorFeeBps: 0 }), // 10M sell
			];
			const summary = sumBatchTotalCostStroops(items);
			expect(summary.totalBuyCostStroops).toBe(20_000_000);
			expect(summary.totalSellProceedsStroops).toBe(10_000_000);
			expect(summary.netCostStroops).toBe(10_000_000);
			expect(summary.totalEstimatedCostStroops).toBe(20_000_000);
		});
	});

	describe('computeBatchPriceImpactSummary', () => {
		it('computes combined price impact for orders with supply data', () => {
			const items = [
				makeBatchItem({ keyId: '1', currentSupply: 50, amount: 2, direction: 'buy' }),
				makeBatchItem({ keyId: '2', currentSupply: 100, amount: 5, direction: 'sell' }),
			];
			const summary = computeBatchPriceImpactSummary(items);
			expect(summary).not.toBeNull();
			expect(summary?.estimatedItemCount).toBe(2);
			expect(summary?.unestimatedItemCount).toBe(0);
			expect(typeof summary?.totalImpactPercent).toBe('number');
		});

		it('returns null when no items have supply data', () => {
			const items = [
				makeBatchItem({ keyId: '1', currentSupply: null }),
				makeBatchItem({ keyId: '2', currentSupply: undefined }),
			];
			expect(computeBatchPriceImpactSummary(items)).toBeNull();
		});
	});

	describe('buildBatchSwapPayload', () => {
		it('constructs complete payload with min/max slippage bounds and total cost', () => {
			const items = [
				makeBatchItem({ keyId: 'k1', direction: 'buy', amount: 2, priceStroops: 10_000_000, slippageTolerance: 1 }),
				makeBatchItem({ keyId: 'k2', direction: 'sell', amount: 1, priceStroops: 10_000_000, slippageTolerance: 2 }),
			];
			const payload = buildBatchSwapPayload(items);

			expect(payload.items).toHaveLength(2);
			expect(payload.items[0]).toEqual(
				expect.objectContaining({
					keyId: 'k1',
					direction: 'buy',
					amount: 2,
					slippageTolerance: 1,
					maxPriceStroops: 10_100_000,
					minPriceStroops: null,
				})
			);
			expect(payload.items[1]).toEqual(
				expect.objectContaining({
					keyId: 'k2',
					direction: 'sell',
					amount: 1,
					slippageTolerance: 2,
					maxPriceStroops: null,
					minPriceStroops: 9_800_000,
				})
			);
			expect(payload.totalCostStroops).toBeGreaterThan(0);
		});
	});
});
