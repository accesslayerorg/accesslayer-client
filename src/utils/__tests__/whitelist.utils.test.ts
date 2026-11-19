import { describe, expect, it } from 'vitest';
import {
	isValidStellarAddress,
	parseBatchWhitelist,
	formatWhitelistDate,
	truncateAddress,
} from '../whitelist.utils';

const VALID_ADDR_1 = 'GBZXN7PIRZGNMHGA72W2DISDGFICRHDEG644GQNDYAWXCVFD3FYMVWAC';
const VALID_ADDR_2 = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ';
const VALID_ADDR_3 = 'GCKFBEIYV2U22IO2GUOWGQPTZXCOTIZPGWFFSUK2BUMDHQIBNXFHZU4P';

describe('isValidStellarAddress', () => {
	it('accepts valid 56-character base32 Stellar public keys starting with G', () => {
		expect(isValidStellarAddress(VALID_ADDR_1)).toBe(true);
		expect(isValidStellarAddress(VALID_ADDR_2)).toBe(true);
		expect(isValidStellarAddress(VALID_ADDR_3)).toBe(true);
	});

	it('rejects addresses with invalid length', () => {
		expect(isValidStellarAddress('GBZXN7PIRZGNMHGA72W2DISDGFICRHDEG644GQNDYAWXCVFD3FYMVWA')).toBe(false); // 55 chars
		expect(isValidStellarAddress(VALID_ADDR_1 + 'A')).toBe(false); // 57 chars
		expect(isValidStellarAddress('')).toBe(false);
	});

	it('rejects non-Stellar addresses', () => {
		expect(isValidStellarAddress('0x71C8418320499D23b0B27B54714659b85c1F7c2b')).toBe(false);
		expect(isValidStellarAddress('SBZXN7PIRZGNMHGA72W2DISDGFICRHDEG644GQNDYAWXCVFD3FYMVWAC')).toBe(false); // Starts with S
		expect(isValidStellarAddress('1BZXN7PIRZGNMHGA72W2DISDGFICRHDEG644GQNDYAWXCVFD3FYMVWAC')).toBe(false);
	});

	it('rejects invalid base32 characters (0, 1, 8, 9)', () => {
		// Replace valid character with '8'
		const invalidAddr = 'G' + '8'.repeat(55);
		expect(isValidStellarAddress(invalidAddr)).toBe(false);
	});
});

describe('parseBatchWhitelist', () => {
	it('parses newline-separated addresses correctly', () => {
		const input = `${VALID_ADDR_1}\n${VALID_ADDR_2}\n${VALID_ADDR_3}`;
		const result = parseBatchWhitelist(input);

		expect(result.valid).toEqual([VALID_ADDR_1, VALID_ADDR_2, VALID_ADDR_3]);
		expect(result.invalid).toEqual([]);
		expect(result.duplicates).toEqual([]);
	});

	it('handles carriage returns and extra whitespace / empty lines', () => {
		const input = `  ${VALID_ADDR_1}  \r\n\r\n   \n${VALID_ADDR_2}\n   `;
		const result = parseBatchWhitelist(input);

		expect(result.valid).toEqual([VALID_ADDR_1, VALID_ADDR_2]);
		expect(result.invalid).toEqual([]);
		expect(result.duplicates).toEqual([]);
	});

	it('separates invalid addresses from valid ones', () => {
		const input = `${VALID_ADDR_1}\n0xInvalidAddress\n${VALID_ADDR_2}\nNotAnAddress`;
		const result = parseBatchWhitelist(input);

		expect(result.valid).toEqual([VALID_ADDR_1, VALID_ADDR_2]);
		expect(result.invalid).toEqual(['0xInvalidAddress', 'NotAnAddress']);
	});

	it('identifies duplicates and preserves only the first occurrence', () => {
		const input = `${VALID_ADDR_1}\n${VALID_ADDR_2}\n${VALID_ADDR_1}`;
		const result = parseBatchWhitelist(input);

		expect(result.valid).toEqual([VALID_ADDR_1, VALID_ADDR_2]);
		expect(result.duplicates).toEqual([VALID_ADDR_1]);
	});

	it('returns empty arrays when given empty input', () => {
		expect(parseBatchWhitelist('')).toEqual({ valid: [], invalid: [], duplicates: [] });
		expect(parseBatchWhitelist('   \n\n  ')).toEqual({ valid: [], invalid: [], duplicates: [] });
	});
});

describe('formatWhitelistDate', () => {
	it('formats ISO string to a human-readable date', () => {
		const formatted = formatWhitelistDate('2026-09-27T12:00:00.000Z');
		expect(formatted).toContain('2026');
		expect(formatted).toMatch(/Sep|September/);
	});

	it('returns fallback for invalid string or empty value', () => {
		expect(formatWhitelistDate('')).toBe('—');
		expect(formatWhitelistDate('invalid-date')).toBe('invalid-date');
	});
});

describe('truncateAddress', () => {
	it('truncates long Stellar address', () => {
		expect(truncateAddress(VALID_ADDR_1)).toBe('GBZXN7…YMVWAC');
	});

	it('does not truncate short strings', () => {
		expect(truncateAddress('short')).toBe('short');
	});
});
