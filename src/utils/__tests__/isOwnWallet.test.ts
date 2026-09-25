import { describe, it, expect } from 'vitest';
import { isOwnWallet } from '../isOwnWallet';

describe('isOwnWallet', () => {
	it('returns true when addresses match exactly', () => {
		expect(isOwnWallet('0xABC', '0xABC')).toBe(true);
	});

	it('returns true when addresses match case-insensitively', () => {
		expect(isOwnWallet('0xABC', '0xabc')).toBe(true);
		expect(isOwnWallet('0xabc', '0xABC')).toBe(true);
	});

	it('returns false when addresses differ', () => {
		expect(isOwnWallet('0xABC', '0xDEF')).toBe(false);
	});

	it('returns false when connected address is null', () => {
		expect(isOwnWallet(null, '0xABC')).toBe(false);
	});

	it('returns false when creator address is null', () => {
		expect(isOwnWallet('0xABC', null)).toBe(false);
	});

	it('returns false when both addresses are null', () => {
		expect(isOwnWallet(null, null)).toBe(false);
	});

	it('returns false when connected address is undefined', () => {
		expect(isOwnWallet(undefined, '0xABC')).toBe(false);
	});

	it('returns false when creator address is undefined', () => {
		expect(isOwnWallet('0xABC', undefined)).toBe(false);
	});

	it('returns false when both addresses are undefined', () => {
		expect(isOwnWallet(undefined, undefined)).toBe(false);
	});

	it('returns false for empty strings', () => {
		expect(isOwnWallet('', '0xABC')).toBe(false);
		expect(isOwnWallet('0xABC', '')).toBe(false);
		expect(isOwnWallet('', '')).toBe(false);
	});
});
