/**
 * Unit tests for key buy simulation utilities (#875).
 */

import { describe, expect, it } from 'vitest';
import { simulateKeyBuy } from '../keySimulation.utils';
import {
	computeBondingCurvePrice,
	computeBuyCost,
	DEFAULT_BONDING_CURVE_PARAMS,
} from '../bondingCurve.utils';

describe('keySimulation.utils', () => {
	describe('simulateKeyBuy', () => {
		it('reuses computeBuyCost for the gross cost (matches bonding curve math exactly)', () => {
			const result = simulateKeyBuy({ quantity: 10, currentSupply: 100 });
			const expectedGross = computeBuyCost(
				100,
				10,
				DEFAULT_BONDING_CURVE_PARAMS
			);

			expect(result?.grossCostStroops).toBe(expectedGross);
		});

		it('reports the start and end per-key prices from the bonding curve', () => {
			const result = simulateKeyBuy({ quantity: 5, currentSupply: 50 });

			expect(result?.startPriceStroops).toBe(
				computeBondingCurvePrice(50, DEFAULT_BONDING_CURVE_PARAMS)
			);
			expect(result?.endPriceStroops).toBe(
				computeBondingCurvePrice(55, DEFAULT_BONDING_CURVE_PARAMS)
			);
		});

		it('computes positive price impact for a buy (price rises with supply)', () => {
			const result = simulateKeyBuy({ quantity: 20, currentSupply: 100 });

			expect(result?.priceImpactPercent).toBeGreaterThan(0);
		});

		it('computes fees from the gross cost using bps, matching pricePreview conventions', () => {
			const result = simulateKeyBuy({
				quantity: 10,
				currentSupply: 0,
				protocolFeeBps: 250,
				creatorFeeBps: 250,
			});

			expect(result).not.toBeNull();
			const gross = result!.grossCostStroops;
			expect(result!.protocolFeeStroops).toBe(Math.round((gross * 250) / 10_000));
			expect(result!.creatorFeeStroops).toBe(Math.round((gross * 250) / 10_000));
			expect(result!.totalCostStroops).toBe(
				gross + result!.protocolFeeStroops + result!.creatorFeeStroops
			);
		});

		it('defaults fees to 0 bps when not provided', () => {
			const result = simulateKeyBuy({ quantity: 10, currentSupply: 0 });

			expect(result?.protocolFeeBps).toBe(0);
			expect(result?.creatorFeeBps).toBe(0);
			expect(result?.totalCostStroops).toBe(result?.grossCostStroops);
		});

		it('computes averagePriceStroops as gross cost divided by quantity', () => {
			const result = simulateKeyBuy({ quantity: 4, currentSupply: 10 });

			expect(result?.averagePriceStroops).toBeCloseTo(
				result!.grossCostStroops / 4
			);
		});

		it('returns null for a zero or negative quantity', () => {
			expect(simulateKeyBuy({ quantity: 0, currentSupply: 10 })).toBeNull();
			expect(simulateKeyBuy({ quantity: -5, currentSupply: 10 })).toBeNull();
		});

		it('returns null for a non-finite quantity', () => {
			expect(simulateKeyBuy({ quantity: NaN, currentSupply: 10 })).toBeNull();
		});

		it('returns null for a negative current supply', () => {
			expect(simulateKeyBuy({ quantity: 5, currentSupply: -1 })).toBeNull();
		});

		it('accepts custom curve params and uses them for cost/price', () => {
			const curveParams = { basePriceStroops: 5_000_000, growthFactor: 1.05 };
			const result = simulateKeyBuy({
				quantity: 10,
				currentSupply: 0,
				curveParams,
			});

			expect(result?.startPriceStroops).toBe(
				computeBondingCurvePrice(0, curveParams)
			);
			expect(result?.grossCostStroops).toBe(
				computeBuyCost(0, 10, curveParams)
			);
		});
	});
});
