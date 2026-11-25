import { describe, expect, it } from 'vitest';
import {
	evaluateLargeTradeRules,
	calculatePriceComparison,
	calculateSplitTradePreview,
} from '@/utils/largeTradeGuard.utils';
import { STROOPS_PER_XLM } from '@/constants/stellar';

describe('LargeTradeGuard Utilities (#1480)', () => {
	describe('evaluateLargeTradeRules', () => {
		it('returns empty array for normal trades under all thresholds', () => {
			const rules = evaluateLargeTradeRules({
				amount: 5,
				unitPriceStroops: 10 * STROOPS_PER_XLM,
				totalStroops: 50 * STROOPS_PER_XLM,
				priceImpactPercent: 1.5,
				currentSupply: 500,
			});
			expect(rules).toHaveLength(0);
		});

		it('triggers PRICE_IMPACT rule when impact exceeds 5%', () => {
			const rules = evaluateLargeTradeRules({
				amount: 20,
				totalStroops: 250 * STROOPS_PER_XLM,
				priceImpactPercent: 7.4,
				currentSupply: 500,
			});
			expect(rules).toHaveLength(1);
			expect(rules[0].rule.id).toBe('PRICE_IMPACT');
			expect(rules[0].formattedActual).toBe('7.40%');
			expect(rules[0].formattedThreshold).toBe('5.00%');
		});

		it('triggers TRADE_VALUE rule when value exceeds 10,000 XLM', () => {
			const rules = evaluateLargeTradeRules({
				amount: 50,
				totalStroops: 15000 * STROOPS_PER_XLM,
				priceImpactPercent: 2.0,
				currentSupply: 1000,
			});
			expect(rules).toHaveLength(1);
			expect(rules[0].rule.id).toBe('TRADE_VALUE');
			expect(rules[0].actualValue).toBe(15000);
		});

		it('triggers SUPPLY_PERCENT rule when quantity exceeds 10% of supply', () => {
			const rules = evaluateLargeTradeRules({
				amount: 150,
				totalStroops: 1500 * STROOPS_PER_XLM,
				priceImpactPercent: 3.0,
				currentSupply: 1000,
			});
			expect(rules).toHaveLength(1);
			expect(rules[0].rule.id).toBe('SUPPLY_PERCENT');
			expect(rules[0].actualValue).toBe(15);
		});

		it('triggers multiple rules simultaneously when multiple thresholds are breached', () => {
			const rules = evaluateLargeTradeRules({
				amount: 200,
				totalStroops: 25000 * STROOPS_PER_XLM,
				priceImpactPercent: 12.5,
				currentSupply: 1000,
			});
			expect(rules).toHaveLength(3);
			expect(rules.map((r) => r.rule.id)).toEqual([
				'PRICE_IMPACT',
				'TRADE_VALUE',
				'SUPPLY_PERCENT',
			]);
		});
	});

	describe('calculatePriceComparison', () => {
		it('computes average price vs spot price and premium percentage', () => {
			const res = calculatePriceComparison({
				amount: 10,
				unitPriceStroops: 10 * STROOPS_PER_XLM,
				totalStroops: 120 * STROOPS_PER_XLM,
			});
			expect(res.spotPriceXlm).toBe(10);
			expect(res.averagePriceXlm).toBe(12);
			expect(res.priceDifferenceXlm).toBe(2);
			expect(res.premiumPercent).toBe(20);
		});
	});

	describe('calculateSplitTradePreview', () => {
		it('shows lower total cost for split trades compared to single bulk trade', () => {
			const preview = calculateSplitTradePreview(100, 20000 * STROOPS_PER_XLM, 3);
			expect(preview.numSplits).toBe(3);
			expect(preview.estimatedSingleCostXlm).toBe(20000);
			expect(preview.estimatedSplitTotalCostXlm).toBeLessThan(preview.estimatedSingleCostXlm);
			expect(preview.estimatedSavingsXlm).toBeGreaterThan(0);
		});
	});
});
