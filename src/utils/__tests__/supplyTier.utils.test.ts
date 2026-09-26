import { describe, expect, it } from 'vitest';
import {
	classifySupplyTier,
	matchesSupplyTier,
	SUPPLY_TIERS,
	supplyTierLabel,
	type SupplyTierId,
} from '../supplyTier.utils';

describe('classifySupplyTier', () => {
	it('classifies by minted supply milestone boundaries (#918)', () => {
		expect(classifySupplyTier(0)).toBe('early');
		expect(classifySupplyTier(99)).toBe('early');
		expect(classifySupplyTier(100)).toBe('growth');
		expect(classifySupplyTier(499)).toBe('growth');
		expect(classifySupplyTier(500)).toBe('established');
		expect(classifySupplyTier(999)).toBe('established');
		expect(classifySupplyTier(1000)).toBe('maxed');
		expect(classifySupplyTier(10_000)).toBe('maxed');
	});

	it('returns null for unknown or non-finite supply', () => {
		expect(classifySupplyTier(null)).toBeNull();
		expect(classifySupplyTier(undefined)).toBeNull();
		expect(classifySupplyTier(Number.NaN)).toBeNull();
	});
});

describe('supplyTierLabel', () => {
	it('returns a human label for every defined tier', () => {
		for (const tier of SUPPLY_TIERS) {
			expect(supplyTierLabel(tier.id)).toBe(tier.label);
		}
	});

	it('falls back to the raw id for unknown tiers', () => {
		expect(supplyTierLabel('unknown' as SupplyTierId)).toBe('unknown');
	});
});

describe('matchesSupplyTier', () => {
	it('matches when supply falls inside the selected tier', () => {
		expect(matchesSupplyTier(250, 'growth')).toBe(true);
		expect(matchesSupplyTier(250, 'early')).toBe(false);
		expect(matchesSupplyTier(250, 'established')).toBe(false);
	});

	it('includes every supply value under the "all" filter', () => {
		expect(matchesSupplyTier(0, 'all')).toBe(true);
		expect(matchesSupplyTier(9999, 'all')).toBe(true);
		expect(matchesSupplyTier(null, 'all')).toBe(true);
		expect(matchesSupplyTier(undefined, 'all')).toBe(true);
	});

	it('never matches a specific tier when supply is unknown', () => {
		expect(matchesSupplyTier(null, 'early')).toBe(false);
		expect(matchesSupplyTier(undefined, 'maxed')).toBe(false);
		expect(matchesSupplyTier(Number.NaN, 'growth')).toBe(false);
	});
});