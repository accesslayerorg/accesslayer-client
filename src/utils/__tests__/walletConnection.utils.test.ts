import { describe, it, expect } from 'vitest';
import { isOwnWallet } from '../walletConnection.utils';

describe('walletConnection.utils', () => {
	describe('isOwnWallet', () => {
		it('returns true for matching addresses', () => {
			const address = '0x1234567890abcdef1234567890abcdef12345678';
			const connectedAddress = '0x1234567890abcdef1234567890abcdef12345678';
			expect(isOwnWallet(address, connectedAddress)).toBe(true);
		});

		it('returns false for non-matching addresses', () => {
			const address = '0x1234567890abcdef1234567890abcdef12345678';
			const connectedAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
			expect(isOwnWallet(address, connectedAddress)).toBe(false);
		});

		it('returns false when connected address is null', () => {
			const address = '0x1234567890abcdef1234567890abcdef12345678';
			expect(isOwnWallet(address, null)).toBe(false);
		});

		it('performs case-insensitive comparison', () => {
			const address = '0x1234567890ABCDEF1234567890ABCDEF12345678';
			const connectedAddress = '0x1234567890abcdef1234567890abcdef12345678';
			expect(isOwnWallet(address, connectedAddress)).toBe(true);
		});

		it('handles mixed casing correctly', () => {
			const address = '0x1234567890AbCdEf1234567890AbCdEf12345678';
			const connectedAddress = '0x1234567890aBcDeF1234567890aBcDeF12345678';
			expect(isOwnWallet(address, connectedAddress)).toBe(true);
		});

		it('returns false for different addresses with different casing', () => {
			const address = '0x1234567890ABCDEF1234567890ABCDEF12345678';
			const connectedAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
			expect(isOwnWallet(address, connectedAddress)).toBe(false);
		});
	});
});
