import { describe, expect, it } from 'vitest';
import {
	getStellarContractAddressError,
	isValidStellarContractAddress,
	normalizeStellarContractAddress,
} from '../stellarAddress.utils';

// Valid checksum-correct `C`-prefixed contract strkeys (56 chars):
// CAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7DRX
// CD7757P47P5PT6HX6327J47S6HYO73XN5TV6V2PI47TOLZHD4LQ6ACUD
const VALID_A = 'CAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7DRX';
const VALID_B = 'CD7757P47P5PT6HX6327J47S6HYO73XN5TV6V2PI47TOLZHD4LQ6ACUD';

describe('normalizeStellarContractAddress', () => {
	it('trims surrounding whitespace', () => {
		expect(normalizeStellarContractAddress(`  ${VALID_A}  `)).toBe(VALID_A);
	});

	it('upper-cases lowercase base32 input', () => {
		expect(normalizeStellarContractAddress(VALID_A.toLowerCase())).toBe(
			VALID_A
		);
	});
});

describe('isValidStellarContractAddress', () => {
	it('accepts checksum-valid contract addresses', () => {
		expect(isValidStellarContractAddress(VALID_A)).toBe(true);
		expect(isValidStellarContractAddress(VALID_B)).toBe(true);
	});

	it('accepts lowercase contract addresses (base32 is case-insensitive)', () => {
		expect(isValidStellarContractAddress(VALID_A.toLowerCase())).toBe(true);
	});

	it('rejects an address with a tampered checksum', () => {
		const tampered = VALID_A.slice(0, -1) + 'B';
		expect(tampered).not.toBe(VALID_A);
		expect(isValidStellarContractAddress(tampered)).toBe(false);
	});

	it('rejects values that do not start with the C version prefix', () => {
		expect(
			isValidStellarContractAddress(
				'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
			)
		).toBe(false);
	});

	it('rejects too-short addresses', () => {
		expect(isValidStellarContractAddress(VALID_A.slice(0, 20))).toBe(false);
	});

	it('rejects too-long addresses', () => {
		expect(isValidStellarContractAddress(`${VALID_A}A`)).toBe(false);
	});

	it('rejects addresses containing non-base32 characters', () => {
		const withIllegalChar = `C${'A'.repeat(53)}10`;
		expect(withIllegalChar).toHaveLength(56);
		expect(isValidStellarContractAddress(withIllegalChar)).toBe(false);
	});

	it('rejects empty and whitespace-only input', () => {
		expect(isValidStellarContractAddress('')).toBe(false);
		expect(isValidStellarContractAddress('   ')).toBe(false);
	});
});

describe('getStellarContractAddressError', () => {
	it('returns null for a valid contract address', () => {
		expect(getStellarContractAddressError(VALID_A)).toBeNull();
	});

	it('asks for input when the value is empty', () => {
		expect(getStellarContractAddressError('')).toBe(
			'Enter a Stellar contract address'
		);
	});

	it('reports an invalid format error for malformed values', () => {
		const error = getStellarContractAddressError('not-an-address');
		expect(error).toMatch(/valid Stellar contract address/i);
	});
});
