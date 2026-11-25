import { describe, expect, it } from 'vitest';
import {
	computeBuyCostPreview,
	computeBondingCurvePrice,
	DEFAULT_BONDING_CURVE_PARAMS,
} from '@/utils/bondingCurve.utils';
import {
	calculateCurveBuy,
	calculateCurveQuote,
	calculateCurveSell,
	compareBuyStrategies,
	type CurveTradeRequest,
} from '@/utils/curveCalculator.utils';

const REQUEST: CurveTradeRequest = {
	quantity: 5,
	currentSupply: 20,
	params: DEFAULT_BONDING_CURVE_PARAMS,
	protocolFeeBps: 100,
	creatorFeeBps: 200,
};

describe('curve calculator utilities (#1411)', () => {
	it('matches the contract-style bigint quote within rounding tolerance', () => {
		const quote = calculateCurveBuy({
			...REQUEST,
			protocolFeeBps: 0,
			creatorFeeBps: 0,
		})!;
		const preview = computeBuyCostPreview(
			BigInt(REQUEST.currentSupply),
			BigInt(REQUEST.quantity),
			0n
		);
		expect(
			Math.abs(quote.grossStroops - Number(preview.grossCost))
		).toBeLessThanOrEqual(2);
		expect(quote.totalStroops).toBeCloseTo(quote.grossStroops, 0);
		expect(quote.averagePriceStroops).toBeCloseTo(
			quote.grossStroops / REQUEST.quantity,
			5
		);
	});

	it('includes both fees and price impact in the buy quote', () => {
		const quote = calculateCurveBuy(REQUEST)!;
		expect(quote.protocolFeeStroops).toBeGreaterThan(0);
		expect(quote.creatorFeeStroops).toBeGreaterThan(0);
		expect(quote.totalStroops).toBe(
			quote.grossStroops + quote.protocolFeeStroops + quote.creatorFeeStroops
		);
		expect(quote.endPriceStroops).toBeGreaterThan(quote.startPriceStroops);
		expect(quote.priceImpactPercent).toBeGreaterThan(0);
	});

	it('caps sells at the current supply and reports a negative price impact', () => {
		const quote = calculateCurveSell({ ...REQUEST, quantity: 100 })!;
		expect(quote.quantity).toBe(REQUEST.currentSupply);
		expect(quote.startPriceStroops).toBe(
			computeBondingCurvePrice(REQUEST.currentSupply, REQUEST.params)
		);
		expect(quote.endPriceStroops).toBe(
			computeBondingCurvePrice(0, REQUEST.params)
		);
		expect(quote.priceImpactPercent).toBeGreaterThan(0);
		expect(quote.priceImpactPercent).toBeLessThan(100);
		expect(quote.totalStroops).toBe(
			quote.grossStroops - quote.protocolFeeStroops - quote.creatorFeeStroops
		);
	});

	it('routes buy/sell quotes and rejects invalid quantities', () => {
		expect(calculateCurveQuote('buy', REQUEST)).toEqual(
			calculateCurveBuy(REQUEST)
		);
		expect(calculateCurveQuote('sell', REQUEST)).toEqual(
			calculateCurveSell(REQUEST)
		);
		expect(calculateCurveBuy({ ...REQUEST, quantity: 0 })).toBeNull();
		expect(calculateCurveSell({ ...REQUEST, currentSupply: 0 })).toBeNull();
	});

	it('compares one large buy against several smaller buys', () => {
		const comparison = compareBuyStrategies({ ...REQUEST, chunkCount: 5 })!;
		expect(comparison.chunkCount).toBe(5);
		expect(comparison.lumpSumCostStroops).toBe(
			calculateCurveBuy(REQUEST)!.totalStroops
		);
		expect(comparison.splitCostStroops).toBeCloseTo(
			comparison.lumpSumCostStroops,
			0
		);
		expect(Math.abs(comparison.savingsStroops)).toBeLessThan(2);
	});
});
