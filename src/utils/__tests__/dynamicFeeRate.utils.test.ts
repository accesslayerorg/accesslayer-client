/**
 * Unit tests for the dynamic fee rate helpers powering the trade
 * confirmation screen fee breakdown (#994).
 */

import { describe, expect, it } from 'vitest';
import {
	buildDynamicFeeBreakdown,
	formatEffectiveFeeRate,
	getVolumeTierDiscountBps,
	MAX_BASE_FEE_BPS,
	MAX_CREATOR_ROYALTY_BPS,
	MAX_PROTOCOL_FEE_BPS,
	MAX_VOLUME_TIER_DISCOUNT_BPS,
} from '../dynamicFeeRate.utils';
import { STROOPS_PER_XLM } from '@/constants/stellar';

describe('getVolumeTierDiscountBps (#994)', () => {
	it('returns 0 bps for zero, negative and non-finite notionals', () => {
		expect(getVolumeTierDiscountBps(0)).toBe(0);
		expect(getVolumeTierDiscountBps(-5)).toBe(0);
		expect(getVolumeTierDiscountBps(Number.NaN)).toBe(0);
		expect(getVolumeTierDiscountBps(Number.POSITIVE_INFINITY)).toBe(0);
	});

	it('returns 0 bps below the first tier threshold', () => {
		expect(getVolumeTierDiscountBps(1_000_000)).toBe(0); // 0.1 XLM
		expect(getVolumeTierDiscountBps(99_999_999)).toBe(0); // just under 10 XLM
	});

	it('crosses tier boundaries inclusively at 10, 100 and 500 XLM', () => {
		expect(getVolumeTierDiscountBps(100_000_000)).toBe(50); // exactly 10 XLM
		expect(getVolumeTierDiscountBps(1_000_000_000)).toBe(100); // exactly 100 XLM
		expect(getVolumeTierDiscountBps(5_000_000_000)).toBe(200); // exactly 500 XLM
	});

	it('returns the largest qualifying tier for large trades', () => {
		expect(getVolumeTierDiscountBps(600 * STROOPS_PER_XLM)).toBe(200);
	});
});

describe('buildDynamicFeeBreakdown (#994)', () => {
	const baseRates = {
		baseFeeBps: 500,
		volumeTierDiscountBps: 0,
		protocolFeeBps: 250,
		creatorRoyaltyBps: 250,
	};

	it('sums all four components into the total fee for a buy', () => {
		const breakdown = buildDynamicFeeBreakdown({
			notionalStroops: 100 * STROOPS_PER_XLM, // 100 XLM
			rates: baseRates,
			isSell: false,
		});

		expect(breakdown.baseFeeStroops).toBe(5 * STROOPS_PER_XLM); // 5%
		expect(breakdown.volumeTierDiscountStroops).toBe(0);
		expect(breakdown.protocolFeeStroops).toBe(2.5 * STROOPS_PER_XLM);
		expect(breakdown.creatorRoyaltyStroops).toBe(2.5 * STROOPS_PER_XLM);
		expect(breakdown.totalFeeStroops).toBe(10 * STROOPS_PER_XLM);
		expect(breakdown.effectiveFeeBps).toBe(1000);
		expect(breakdown.isSell).toBe(false);
		expect(breakdown.netProceedsStroops).toBeNull();
	});

	it('applies the explicit volume-tier discount as a credit and lowers the effective rate', () => {
		const breakdown = buildDynamicFeeBreakdown({
			notionalStroops: 100 * STROOPS_PER_XLM,
			rates: { ...baseRates, volumeTierDiscountBps: 100 },
			isSell: false,
		});

		expect(breakdown.volumeTierDiscountStroops).toBe(1 * STROOPS_PER_XLM);
		expect(breakdown.totalFeeStroops).toBe(9 * STROOPS_PER_XLM);
		expect(breakdown.effectiveFeeBps).toBe(900);
	});

	it('derives the tier discount from notional when the contract omits it', () => {
		const breakdown = buildDynamicFeeBreakdown({
			notionalStroops: 500 * STROOPS_PER_XLM,
			rates: { ...baseRates, volumeTierDiscountBps: undefined },
			isSell: false,
		});

		// 500 XLM → top tier → 200 bps off the base fee:
		// 25 − 10 + 12.5 + 12.5 = 40 XLM total fee.
		expect(breakdown.volumeTierDiscountStroops).toBe(10 * STROOPS_PER_XLM);
		expect(breakdown.totalFeeStroops).toBe(40 * STROOPS_PER_XLM);
		expect(breakdown.effectiveFeeBps).toBe(800);
	});

	it('computes USD equivalent from the XLM/USD rate', () => {
		const breakdown = buildDynamicFeeBreakdown({
			notionalStroops: 100 * STROOPS_PER_XLM,
			rates: baseRates,
			isSell: false,
			xlmUsdRate: 0.5,
		});

		expect(breakdown.totalFeeUsd).toBeCloseTo(5, 6); // 10 XLM * $0.50
	});

	it('returns null USD when no rate is provided', () => {
		const breakdown = buildDynamicFeeBreakdown({
			notionalStroops: 100 * STROOPS_PER_XLM,
			rates: baseRates,
			isSell: false,
		});

		expect(breakdown.totalFeeUsd).toBeNull();
	});

	it('computes net proceeds for sells', () => {
		const breakdown = buildDynamicFeeBreakdown({
			notionalStroops: 100 * STROOPS_PER_XLM,
			rates: baseRates,
			isSell: true,
		});

		expect(breakdown.isSell).toBe(true);
		expect(breakdown.netProceedsStroops).toBe(90 * STROOPS_PER_XLM);
	});

	it('falls back to protocol defaults for missing rates', () => {
		// Small notional keeps the derived tier discount at zero so this
		// isolates the default-rate fallback.
		const breakdown = buildDynamicFeeBreakdown({
			notionalStroops: 1 * STROOPS_PER_XLM,
			rates: {},
			isSell: false,
		});

		expect(breakdown.effectiveFeeBps).toBe(1000); // 5 + 2.5 + 2.5
		expect(breakdown.totalFeeStroops).toBe(0.1 * STROOPS_PER_XLM);
	});

	it('clamps out-of-range and non-finite contract values', () => {
		const breakdown = buildDynamicFeeBreakdown({
			notionalStroops: 100 * STROOPS_PER_XLM,
			rates: {
				baseFeeBps: Number.NaN,
				volumeTierDiscountBps: 10_000,
				protocolFeeBps: -50,
				creatorRoyaltyBps: 999_999,
			},
			isSell: false,
		});

		expect(breakdown.effectiveFeeBps).toBeLessThanOrEqual(
			MAX_BASE_FEE_BPS + MAX_PROTOCOL_FEE_BPS + MAX_CREATOR_ROYALTY_BPS
		);
		// Discount is capped, not rejected.
		expect(breakdown.volumeTierDiscountStroops).toBe(
			(MAX_VOLUME_TIER_DISCOUNT_BPS / 10_000) * 100 * STROOPS_PER_XLM
		);
	});

	it('never produces a negative discount or total even with extreme rates', () => {
		const breakdown = buildDynamicFeeBreakdown({
			notionalStroops: 10 * STROOPS_PER_XLM,
			rates: {
				baseFeeBps: 100,
				volumeTierDiscountBps: MAX_VOLUME_TIER_DISCOUNT_BPS,
				protocolFeeBps: 0,
				creatorRoyaltyBps: 0,
			},
			isSell: false,
		});

		// A 200 bps discount clamps to the 100 bps base fee, so the
		// effective rate floors at zero instead of going negative.
		expect(breakdown.effectiveFeeBps).toBe(0);
		expect(breakdown.totalFeeStroops).toBe(0);
	});

	it('treats a zero notional as no fees rather than NaN', () => {
		const breakdown = buildDynamicFeeBreakdown({
			notionalStroops: 0,
			rates: baseRates,
			isSell: false,
		});

		expect(breakdown.totalFeeStroops).toBe(0);
		expect(breakdown.baseFeeStroops).toBe(0);
	});

	it('rounds fractional stroops to integers', () => {
		const breakdown = buildDynamicFeeBreakdown({
			notionalStroops: 123_456_789,
			rates: baseRates,
			isSell: false,
		});

		expect(Number.isInteger(breakdown.baseFeeStroops)).toBe(true);
		expect(Number.isInteger(breakdown.protocolFeeStroops)).toBe(true);
		expect(Number.isInteger(breakdown.creatorRoyaltyStroops)).toBe(true);
		expect(Number.isInteger(breakdown.totalFeeStroops)).toBe(true);
	});
});

describe('formatEffectiveFeeRate (#994)', () => {
	it('renders the effective rate with a percent sign', () => {
		expect(formatEffectiveFeeRate(1000)).toBe('Effective fee rate: 10%');
		expect(formatEffectiveFeeRate(550)).toBe('Effective fee rate: 5.5%');
	});

	it('uses a placeholder for non-finite rates', () => {
		expect(formatEffectiveFeeRate(Number.NaN)).toBe('Effective fee rate: —');
	});
});
