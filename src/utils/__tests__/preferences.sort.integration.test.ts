import { describe, it, expect, beforeEach } from 'vitest';
import { getPreference, setPreference } from '../preferences.utils';

const SORT_KEY = 'creator-list:sort-order';
type SortOrder = 'asc' | 'desc';
const DEFAULT_SORT: SortOrder = 'asc';

/**
 * Simulates an unmount + remount cycle by clearing and re-reading from localStorage,
 * mirroring what happens when a component that calls getPreference re-renders fresh.
 */
function remount(key: string, defaultValue: SortOrder): SortOrder {
	return getPreference<SortOrder>(key, defaultValue);
}

describe('preferences — sort order persistence across re-renders', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('reads back the saved sort preference after remount', () => {
		setPreference<SortOrder>(SORT_KEY, 'desc');

		const restored = remount(SORT_KEY, DEFAULT_SORT);

		expect(restored).toBe('desc');
	});

	it('applies the default sort when no preference is stored', () => {
		const restored = remount(SORT_KEY, DEFAULT_SORT);

		expect(restored).toBe(DEFAULT_SORT);
	});

	it('overwriting a preference is reflected on the next remount', () => {
		setPreference<SortOrder>(SORT_KEY, 'desc');
		setPreference<SortOrder>(SORT_KEY, 'asc');

		const restored = remount(SORT_KEY, DEFAULT_SORT);

		expect(restored).toBe('asc');
	});

	it('clearing storage resets to the default sort on remount', () => {
		setPreference<SortOrder>(SORT_KEY, 'desc');

		window.localStorage.clear();

		const restored = remount(SORT_KEY, DEFAULT_SORT);

		expect(restored).toBe(DEFAULT_SORT);
	});

	it('persists sort preference alongside unrelated keys without interference', () => {
		setPreference('other-key', { theme: 'dark' });
		setPreference<SortOrder>(SORT_KEY, 'desc');
		setPreference('another-key', 42);

		const restored = remount(SORT_KEY, DEFAULT_SORT);

		expect(restored).toBe('desc');
	});
});
