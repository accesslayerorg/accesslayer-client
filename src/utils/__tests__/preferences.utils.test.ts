import { describe, it, expect, beforeEach } from 'vitest';
import { getPreference, setPreference } from '../preferences.utils';

describe('preferences.utils', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('returns stored value for a key that exists', () => {
		window.localStorage.setItem('testKey', JSON.stringify({ theme: 'dark' }));
		const result = getPreference('testKey', { theme: 'light' });
		expect(result).toEqual({ theme: 'dark' });
	});

	it('returns default value for a missing key', () => {
		const result = getPreference('missingKey', 'default-value');
		expect(result).toBe('default-value');
	});

	it('returns default value if stored JSON is malformed', () => {
		window.localStorage.setItem('malformedKey', '{ invalid json ');
		const result = getPreference('malformedKey', 'default-value');
		expect(result).toBe('default-value');
	});

	it('set and get round-trip correctly', () => {
		const complexValue = { sort: 'desc', filter: ['active', 'verified'] };
		setPreference('complexKey', complexValue);

		const result = getPreference('complexKey', { sort: 'asc', filter: [] });
		expect(result).toEqual(complexValue);
	});
});
