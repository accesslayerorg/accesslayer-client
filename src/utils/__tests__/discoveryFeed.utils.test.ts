import { describe, expect, it } from 'vitest';
import type { Course } from '@/services/course.service';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import {
	computeMarketCapStroops,
	computeTrendingScore,
	filterDiscoveryKeysByCategory,
	isValidDiscoveryFeedSort,
	mapDiscoverySortToServerSort,
	sortDiscoveryKeys,
} from '../discoveryFeed.utils';

function makeCreator(overrides: Partial<Course> = {}): Course {
	return {
		id: 'key-1',
		title: 'Key One',
		description: '',
		price: 1,
		instructorId: 'creator',
		category: 'Art',
		level: 'BEGINNER',
		...overrides,
	};
}

describe('computeMarketCapStroops (#1113)', () => {
	it('multiplies current price by minted supply', () => {
		const creator = makeCreator({
			priceStroops: 2_000_000,
			creatorShareSupply: 300,
		});
		expect(computeMarketCapStroops(creator)).toBe(600_000_000);
	});

	it('falls back to the legacy XLM price field', () => {
		const creator = makeCreator({ price: 2, creatorShareSupply: 100 });
		expect(computeMarketCapStroops(creator)).toBe(200 * STROOPS_PER_XLM);
	});

	it('returns null when price or supply is unknown', () => {
		expect(
			computeMarketCapStroops(makeCreator({ priceStroops: undefined, price: undefined }))
		).toBeNull();
		expect(
			computeMarketCapStroops(
				makeCreator({ priceStroops: 1_000_000, creatorShareSupply: undefined })
			)
		).toBeNull();
		expect(
			computeMarketCapStroops(
				makeCreator({ priceStroops: 1_000_000, creatorShareSupply: 0 })
			)
		).toBeNull();
	});
});

describe('computeTrendingScore (#1113)', () => {
	it('weights volume by positive 24h change', () => {
		expect(
			computeTrendingScore(makeCreator({ volume24h: 100, change24h: 50 }))
		).toBe(150);
	});

	it('keeps raw volume for flat or falling keys', () => {
		expect(
			computeTrendingScore(makeCreator({ volume24h: 100, change24h: -20 }))
		).toBe(100);
		expect(
			computeTrendingScore(makeCreator({ volume24h: 100 }))
		).toBe(100);
	});
});

describe('sortDiscoveryKeys (#1113)', () => {
	const alpha = makeCreator({
		id: 'alpha',
		volume24h: 50,
		change24h: 100,
		createdAt: '2026-01-01T00:00:00Z',
		priceStroops: 1_000_000,
		creatorShareSupply: 100,
	}); // trending 100, mcap 100 XLM
	const beta = makeCreator({
		id: 'beta',
		volume24h: 120,
		change24h: 0,
		createdAt: '2026-06-01T00:00:00Z',
		priceStroops: 3_000_000,
		creatorShareSupply: 500,
	}); // trending 120, mcap 1500 XLM
	const gamma = makeCreator({
		id: 'gamma',
		createdAt: '2025-06-01T00:00:00Z',
	}); // no volume/price → unknown keys sink last

	it('orders trending by momentum score', () => {
		const result = sortDiscoveryKeys([gamma, alpha, beta], 'trending');
		expect(result.map(c => c.id)).toEqual(['beta', 'alpha', 'gamma']);
	});

	it('orders newest by creation date', () => {
		const result = sortDiscoveryKeys([gamma, alpha, beta], 'newest');
		expect(result.map(c => c.id)).toEqual(['beta', 'alpha', 'gamma']);
	});

	it('orders volume by 24h volume with unknowns last', () => {
		const result = sortDiscoveryKeys([gamma, alpha, beta], 'volume');
		expect(result.map(c => c.id)).toEqual(['beta', 'alpha', 'gamma']);
	});

	it('orders market cap by estimated cap with unknowns last', () => {
		const result = sortDiscoveryKeys([gamma, alpha, beta], 'market_cap');
		expect(result.map(c => c.id)).toEqual(['beta', 'alpha', 'gamma']);
	});

	it('does not mutate the input array', () => {
		const input = [gamma, alpha, beta];
		sortDiscoveryKeys(input, 'volume');
		expect(input.map(c => c.id)).toEqual(['gamma', 'alpha', 'beta']);
	});
});

describe('filterDiscoveryKeysByCategory (#1113)', () => {
	const art = makeCreator({ id: 'art', category: 'Art' });
	const music = makeCreator({ id: 'music', category: 'Music' });

	it('passes everything through for "All"', () => {
		expect(filterDiscoveryKeysByCategory([art, music], 'All')).toHaveLength(2);
		expect(filterDiscoveryKeysByCategory([art, music], undefined)).toHaveLength(2);
	});

	it('matches categories case-insensitively', () => {
		expect(
			filterDiscoveryKeysByCategory([art, music], 'music').map(c => c.id)
		).toEqual(['music']);
	});

	it('returns an empty list when nothing matches', () => {
		expect(filterDiscoveryKeysByCategory([art, music], 'Gaming')).toEqual([]);
	});
});

describe('sort option helpers (#1113)', () => {
	it('validates feed sort values', () => {
		expect(isValidDiscoveryFeedSort('trending')).toBe(true);
		expect(isValidDiscoveryFeedSort('market_cap')).toBe(true);
		expect(isValidDiscoveryFeedSort('price_asc')).toBe(false);
		expect(isValidDiscoveryFeedSort(null)).toBe(false);
	});

	it('maps feed sorts onto supported server sorts', () => {
		expect(mapDiscoverySortToServerSort('trending')).toBe('volume_desc');
		expect(mapDiscoverySortToServerSort('volume')).toBe('volume_desc');
		expect(mapDiscoverySortToServerSort('newest')).toBe('newest');
		expect(mapDiscoverySortToServerSort('market_cap')).toBe('price_desc');
	});
});
