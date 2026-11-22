import { describe, expect, it } from 'vitest';
import type { Course } from '@/services/course.service';
import { MARKETPLACE_SORT_OPTIONS, sortCreatorsByOption } from '../marketplaceSort.utils';

function makeCreator(
	id: string,
	overrides: Partial<Course> = {}
): Course {
	return {
		id,
		title: `Creator ${id}`,
		description: 'desc',
		price: 0.1,
		instructorId: id,
		category: 'Art',
		level: 'BEGINNER',
		...overrides,
	};
}

describe('sortCreatorsByOption', () => {
	it('sorts by volume descending by default (#918)', () => {
		const creators = [
			makeCreator('low', { volume24h: 10 }),
			makeCreator('high', { volume24h: 90 }),
			makeCreator('mid', { volume24h: 50 }),
		];
		expect(sortCreatorsByOption(creators, 'volume_desc').map(c => c.id)).toEqual([
			'high',
			'mid',
			'low',
		]);
	});

	it('sorts by key price ascending using stroops over legacy XLM', () => {
		const creators = [
			makeCreator('cheap', { priceStroops: 5_000_000 }),
			makeCreator('legacy-mid', { price: 1.0 }),
			makeCreator('expensive', { priceStroops: 50_000_000 }),
		];
		expect(sortCreatorsByOption(creators, 'price_asc').map(c => c.id)).toEqual([
			'cheap',
			'legacy-mid',
			'expensive',
		]);
	});

	it('sorts by key price descending', () => {
		const creators = [
			makeCreator('cheap', { priceStroops: 5_000_000 }),
			makeCreator('expensive', { priceStroops: 50_000_000 }),
		];
		expect(sortCreatorsByOption(creators, 'price_desc').map(c => c.id)).toEqual([
			'expensive',
			'cheap',
		]);
	});

	it('keeps creators with an unknown price at the end of both price sorts', () => {
		const creators = [
			makeCreator('unknown', { priceStroops: undefined, price: undefined }),
			makeCreator('cheap', { priceStroops: 1 }),
			makeCreator('expensive', { priceStroops: 99 }),
		];
		expect(sortCreatorsByOption(creators, 'price_asc').map(c => c.id)).toEqual([
			'cheap',
			'expensive',
			'unknown',
		]);
		expect(sortCreatorsByOption(creators, 'price_desc').map(c => c.id)).toEqual([
			'expensive',
			'cheap',
			'unknown',
		]);
	});

	it('sorts newest first by joinedAt with fallbacks and unknown dates last', () => {
		const creators = [
			makeCreator('older', { joinedAt: '2026-01-01T00:00:00Z' }),
			makeCreator('newer', { joinedAt: '2026-09-01T00:00:00Z' }),
			makeCreator('fallback-drop', { nextDropAt: '2027-01-01T00:00:00Z' }),
			makeCreator('unknown-date'),
		];
		expect(sortCreatorsByOption(creators, 'newest').map(c => c.id)).toEqual([
			'fallback-drop',
			'newer',
			'older',
			'unknown-date',
		]);
	});

	it('does not mutate the input array', () => {
		const creators = [makeCreator('a'), makeCreator('b')];
		const input = [...creators];
		sortCreatorsByOption(creators, 'price_desc');
		expect(creators.map(c => c.id)).toEqual(input.map(c => c.id));
	});
});

describe('MARKETPLACE_SORT_OPTIONS', () => {
	it('covers every CourseSortOption', () => {
		const values = MARKETPLACE_SORT_OPTIONS.map(option => option.value);
		expect(values).toEqual(['volume_desc', 'price_asc', 'price_desc', 'newest']);
	});
});