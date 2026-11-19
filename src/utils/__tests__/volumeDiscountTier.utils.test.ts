import { describe, it, expect } from 'vitest';
import {
	classifyVolumeDiscountTier,
	getTierDiscountBps,
	computeTierProgress,
	TIER_THRESHOLDS_STROOPS,
	TIER_DISCOUNT_BPS,
} from '../volumeDiscountTier.utils';

describe('classifyVolumeDiscountTier', () => {
	it('returns null below the bronze threshold', () => {
		expect(classifyVolumeDiscountTier(0)).toBeNull();
		expect(
			classifyVolumeDiscountTier(TIER_THRESHOLDS_STROOPS.bronze - 1)
		).toBeNull();
	});

	it('returns bronze at and above the bronze threshold', () => {
		expect(classifyVolumeDiscountTier(TIER_THRESHOLDS_STROOPS.bronze)).toBe(
			'bronze'
		);
		expect(
			classifyVolumeDiscountTier(TIER_THRESHOLDS_STROOPS.silver - 1)
		).toBe('bronze');
	});

	it('returns silver at and above the silver threshold', () => {
		expect(classifyVolumeDiscountTier(TIER_THRESHOLDS_STROOPS.silver)).toBe(
			'silver'
		);
		expect(classifyVolumeDiscountTier(TIER_THRESHOLDS_STROOPS.gold - 1)).toBe(
			'silver'
		);
	});

	it('returns gold at and above the gold threshold', () => {
		expect(classifyVolumeDiscountTier(TIER_THRESHOLDS_STROOPS.gold)).toBe(
			'gold'
		);
		expect(
			classifyVolumeDiscountTier(TIER_THRESHOLDS_STROOPS.gold * 10)
		).toBe('gold');
	});

	it('returns null for non-finite input', () => {
		expect(classifyVolumeDiscountTier(NaN)).toBeNull();
		expect(classifyVolumeDiscountTier(Infinity)).toBeNull();
	});

	it('returns null for negative volume', () => {
		expect(classifyVolumeDiscountTier(-1)).toBeNull();
	});
});

describe('getTierDiscountBps', () => {
	it('returns 0 for no tier', () => {
		expect(getTierDiscountBps(null)).toBe(0);
	});

	it('returns the configured discount for each tier', () => {
		expect(getTierDiscountBps('bronze')).toBe(TIER_DISCOUNT_BPS.bronze);
		expect(getTierDiscountBps('silver')).toBe(TIER_DISCOUNT_BPS.silver);
		expect(getTierDiscountBps('gold')).toBe(TIER_DISCOUNT_BPS.gold);
	});
});

describe('computeTierProgress', () => {
	it('targets bronze when the wallet has no volume yet', () => {
		const progress = computeTierProgress(0);
		expect(progress.nextTier).toBe('bronze');
		expect(progress.volumeStroopsToNextTier).toBe(
			TIER_THRESHOLDS_STROOPS.bronze
		);
	});

	it('targets silver once bronze is reached', () => {
		const progress = computeTierProgress(TIER_THRESHOLDS_STROOPS.bronze);
		expect(progress.nextTier).toBe('silver');
		expect(progress.volumeStroopsToNextTier).toBe(
			TIER_THRESHOLDS_STROOPS.silver - TIER_THRESHOLDS_STROOPS.bronze
		);
	});

	it('targets gold once silver is reached', () => {
		const progress = computeTierProgress(TIER_THRESHOLDS_STROOPS.silver);
		expect(progress.nextTier).toBe('gold');
		expect(progress.volumeStroopsToNextTier).toBe(
			TIER_THRESHOLDS_STROOPS.gold - TIER_THRESHOLDS_STROOPS.silver
		);
	});

	it('has no next tier once gold is reached', () => {
		const progress = computeTierProgress(TIER_THRESHOLDS_STROOPS.gold);
		expect(progress.nextTier).toBeNull();
		expect(progress.volumeStroopsToNextTier).toBeNull();
	});

	it('treats negative or non-finite volume as zero', () => {
		expect(computeTierProgress(-100).nextTier).toBe('bronze');
		expect(computeTierProgress(NaN).nextTier).toBe('bronze');
	});
});
