import { describe, expect, it } from 'vitest';
import { shortenAddress } from './format';

describe('shortenAddress', () => {
	it('truncates a standard 56-character Stellar address to first 4 + last 4 with ellipsis', () => {
		const address = 'GABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuv';
		expect(shortenAddress(address)).toBe('GABC...stuv');
	});

	it('returns an address shorter than 8 characters as-is without truncation', () => {
		expect(shortenAddress('GABC')).toBe('GABC');
		expect(shortenAddress('1234567')).toBe('1234567');
	});

	it('returns an empty string for empty string input', () => {
		expect(shortenAddress('')).toBe('');
	});

	it('uses three dots (...) as separator', () => {
		const address = 'GABCDEFGHIJKLMNO';
		expect(shortenAddress(address)).toContain('...');
	});
});