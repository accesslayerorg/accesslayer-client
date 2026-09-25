import { describe, it, expect } from 'vitest';
import { shortenAddress } from '../format';

describe('shortenAddress', () => {
	it('shortens a standard Stellar address to first 4 + ... + last 4', () => {
		const address = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234';
		expect(shortenAddress(address)).toBe('GABC...1234');
	});

	it('returns the full address unchanged when it is shorter than 10 characters', () => {
		const address = 'GABCDEFG';
		expect(shortenAddress(address)).toBe('GABCDEFG');
	});

	it('returns the full address unchanged when it is exactly 9 characters', () => {
		const address = 'GABCDEFGH';
		expect(shortenAddress(address)).toBe('GABCDEFGH');
	});

	it('shortens an address that is exactly 10 characters', () => {
		const address = 'GABCDEFGHI';
		expect(shortenAddress(address)).toBe('GABC...FGHI');
	});

	it('returns an empty string when given an empty string', () => {
		expect(shortenAddress('')).toBe('');
	});
});
