import { beforeEach, describe, expect, it } from 'vitest';
import {
	RECENTLY_VIEWED_LIMIT,
	RECENTLY_VIEWED_STORAGE_KEY,
	useRecentlyViewed,
	type RecentlyViewedKey,
} from '@/hooks/useRecentlyViewed';
import { useWatchlist } from '@/hooks/useWatchlist';

function makeKey(id: string, title = `Key ${id}`): Omit<RecentlyViewedKey, 'viewedAt'> {
	return {
		id,
		title,
		price: 0.05,
		priceStroops: 500_000,
		change24h: 1.5,
		category: 'Art',
	};
}

describe('useRecentlyViewed store', () => {
	beforeEach(() => {
		window.localStorage.clear();
		useRecentlyViewed.setState({ keys: [] });
	});

	it('records a visited key', () => {
		useRecentlyViewed.getState().addKey(makeKey('1'));
		expect(useRecentlyViewed.getState().keys).toHaveLength(1);
		expect(useRecentlyViewed.getState().keys[0].id).toBe('1');
	});

	it('prepends the most recent visit', () => {
		useRecentlyViewed.getState().addKey(makeKey('1'));
		useRecentlyViewed.getState().addKey(makeKey('2'));

		const ids = useRecentlyViewed.getState().keys.map(k => k.id);
		expect(ids).toEqual(['2', '1']);
	});

	it('caps the list at the limit, keeping the newest entries', () => {
		for (let i = 1; i <= RECENTLY_VIEWED_LIMIT + 2; i++) {
			useRecentlyViewed.getState().addKey(makeKey(String(i)));
		}

		expect(useRecentlyViewed.getState().keys).toHaveLength(
			RECENTLY_VIEWED_LIMIT
		);
		// Oldest entries are evicted first.
		expect(
			useRecentlyViewed.getState().keys.some(k => k.id === '1')
		).toBe(false);
		expect(
			useRecentlyViewed.getState().keys.some(k => k.id === '2')
		).toBe(false);
	});

	it('dedupes by id and moves an existing key to the front', () => {
		useRecentlyViewed.getState().addKey(makeKey('1'));
		useRecentlyViewed.getState().addKey(makeKey('2'));
		useRecentlyViewed.getState().addKey(makeKey('1'));

		const ids = useRecentlyViewed.getState().keys.map(k => k.id);
		expect(ids).toEqual(['1', '2']);
	});

	it('removes a key by id', () => {
		useRecentlyViewed.getState().addKey(makeKey('1'));
		useRecentlyViewed.getState().removeKey('1');
		expect(useRecentlyViewed.getState().keys).toHaveLength(0);
	});

	it('clears all keys', () => {
		useRecentlyViewed.getState().addKey(makeKey('1'));
		useRecentlyViewed.getState().clear();
		expect(useRecentlyViewed.getState().keys).toHaveLength(0);
	});

	it('persists to the dedicated localStorage key', () => {
		useRecentlyViewed.getState().addKey(makeKey('1'));
		const raw = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
		expect(raw).toBeTruthy();
		const parsed = JSON.parse(raw as string) as {
			state: { keys: RecentlyViewedKey[] };
		};
		expect(parsed.state.keys).toHaveLength(1);
	});

	it('removes a key from recently viewed once it is added to the watchlist', () => {
		useRecentlyViewed.getState().addKey(makeKey('1'));
		expect(useRecentlyViewed.getState().keys).toHaveLength(1);

		const creator = {
			id: '1',
			title: 'Key 1',
			description: 'A creator',
			price: 0.1,
			priceStroops: 1_000_000,
			creatorShareSupply: 100,
			instructorId: '1',
			category: 'Art',
			level: 'BEGINNER' as const,
		};

		useWatchlist.getState().toggleBookmark('0xabc', creator);

		expect(useWatchlist.getState().isBookmarked('0xabc', '1')).toBe(true);
		expect(
			useRecentlyViewed.getState().keys.some(k => k.id === '1')
		).toBe(false);
	});
});
