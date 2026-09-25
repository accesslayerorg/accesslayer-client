import { describe, it, expect, beforeEach } from 'vitest';
import { getPreference, setPreference } from '../preferences.utils';

const SORT_KEY = 'creator-list-sort-order';
const DEFAULT_SORT = 'asc';

describe('sort order persistence via preferences.utils', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('persists the selected sort order across simulated remounts', () => {
		setPreference(SORT_KEY, 'desc');

		// Simulate component unmount/remount: re-read from storage with no in-memory state
		const restored = getPreference(SORT_KEY, DEFAULT_SORT);
		expect(restored).toBe('desc');
	});

	it('returns the default sort order when storage is cleared', () => {
		setPreference(SORT_KEY, 'desc');
		window.localStorage.clear();

		const restored = getPreference(SORT_KEY, DEFAULT_SORT);
		expect(restored).toBe(DEFAULT_SORT);
	});

	it('persists across multiple sort order changes', () => {
		const orders = ['desc', 'asc', 'desc'] as const;
		for (const order of orders) {
			setPreference(SORT_KEY, order);
			expect(getPreference(SORT_KEY, DEFAULT_SORT)).toBe(order);
		}
	});

	it('isolates sort order per key — changing one key does not affect another', () => {
		setPreference('sort-a', 'desc');
		setPreference('sort-b', 'asc');

		expect(getPreference('sort-a', DEFAULT_SORT)).toBe('desc');
		expect(getPreference('sort-b', DEFAULT_SORT)).toBe('asc');
	});
});
