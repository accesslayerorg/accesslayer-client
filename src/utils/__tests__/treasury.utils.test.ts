import { describe, expect, it } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import {
	formatStroops,
	parseXlmToStroops,
	validateTreasuryDistribution,
} from '@/utils/treasury.utils';

const RECIPIENT_A = Keypair.random().publicKey();
const RECIPIENT_B = Keypair.random().publicKey();

describe('treasury amount utilities', () => {
	it('converts XLM decimal strings to exact stroops without floating point', () => {
		expect(parseXlmToStroops('12.0000001')).toBe(120_000_001n);
		expect(parseXlmToStroops('0.5')).toBe(5_000_000n);
		expect(parseXlmToStroops('0')).toBe(0n);
		expect(parseXlmToStroops('1.00000001')).toBeNull();
		expect(parseXlmToStroops('01')).toBeNull();
	});

	it('formats stroops as XLM while trimming insignificant zeroes', () => {
		expect(formatStroops('12345678')).toBe('1.2345678 XLM');
		expect(formatStroops('10000000')).toBe('1 XLM');
		expect(formatStroops('0')).toBe('0 XLM');
	});
});

describe('treasury distribution validation', () => {
	it('accepts valid unique recipients whose allocations equal the whole balance', () => {
		expect(validateTreasuryDistribution('15000000', [
			{ address: RECIPIENT_A, amountStroops: '5000000' },
			{ address: RECIPIENT_B, amountStroops: '10000000' },
		])).toBeNull();
	});

	it('rejects invalid addresses, duplicate addresses, zero values, and mismatched totals', () => {
		expect(validateTreasuryDistribution('10000000', [
			{ address: 'not-an-address', amountStroops: '10000000' },
		])).toContain('valid Stellar address');
		expect(validateTreasuryDistribution('10000000', [
			{ address: RECIPIENT_A, amountStroops: '5000000' },
			{ address: RECIPIENT_A, amountStroops: '5000000' },
		])).toContain('unique');
		expect(validateTreasuryDistribution('10000000', [
			{ address: RECIPIENT_A, amountStroops: '9999999' },
		])).toContain('equal');
		expect(validateTreasuryDistribution('0', [
			{ address: RECIPIENT_A, amountStroops: '1' },
		])).toContain('no accumulated fees');
	});
});
