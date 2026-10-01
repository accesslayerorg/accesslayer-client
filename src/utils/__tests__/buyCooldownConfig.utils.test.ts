import { describe, expect, it } from 'vitest';
import {
	LEDGERS_PER_MINUTE,
	ledgersToMinutes,
	minutesToLedgers,
	validateBuyCooldownInput,
} from '@/utils/buyCooldownConfig.utils';

describe('ledgersToMinutes (#889)', () => {
	it('converts ledgers to the nearest whole minute (~5s per ledger)', () => {
		expect(ledgersToMinutes(LEDGERS_PER_MINUTE)).toBe(1);
		expect(ledgersToMinutes(120)).toBe(10);
		expect(ledgersToMinutes(720)).toBe(60);
	});

	it('rounds sub-minute values', () => {
		expect(ledgersToMinutes(6)).toBe(1);
		expect(ledgersToMinutes(3)).toBe(0);
	});

	it('treats missing/zero/negative/invalid values as 0', () => {
		expect(ledgersToMinutes(undefined)).toBe(0);
		expect(ledgersToMinutes(null)).toBe(0);
		expect(ledgersToMinutes(0)).toBe(0);
		expect(ledgersToMinutes(-12)).toBe(0);
		expect(ledgersToMinutes(NaN)).toBe(0);
	});
});

describe('minutesToLedgers (#889)', () => {
	it('converts minutes to ledgers (~1 ledger per 5 seconds)', () => {
		expect(minutesToLedgers(0)).toBe(0);
		expect(minutesToLedgers(1)).toBe(12);
		expect(minutesToLedgers(5)).toBe(60);
		expect(minutesToLedgers(60)).toBe(720);
	});

	it('rounds fractional minutes to the nearest ledger count', () => {
		expect(minutesToLedgers(2.5)).toBe(30);
	});

	it('treats negative/invalid values as 0', () => {
		expect(minutesToLedgers(-5)).toBe(0);
		expect(minutesToLedgers(NaN)).toBe(0);
		expect(minutesToLedgers(Infinity)).toBe(0);
	});
});

describe('validateBuyCooldownInput (#889)', () => {
	it('accepts a whole number within 0–60', () => {
		expect(validateBuyCooldownInput('0')).toEqual({ error: null, isValid: true });
		expect(validateBuyCooldownInput('12')).toEqual({ error: null, isValid: true });
		expect(validateBuyCooldownInput('60')).toEqual({ error: null, isValid: true });
		expect(validateBuyCooldownInput(' 5 ')).toEqual({ error: null, isValid: true });
	});

	it('rejects an empty value', () => {
		expect(validateBuyCooldownInput('')).toMatchObject({ isValid: false });
		expect(validateBuyCooldownInput('   ')).toMatchObject({ isValid: false });
	});

	it('rejects a non-numeric value', () => {
		expect(validateBuyCooldownInput('abc')).toMatchObject({ isValid: false });
	});

	it('rejects a fractional value', () => {
		expect(validateBuyCooldownInput('2.5')).toMatchObject({ isValid: false });
	});

	it('rejects values below 0 and above 60', () => {
		expect(validateBuyCooldownInput('-1')).toMatchObject({ isValid: false });
		expect(validateBuyCooldownInput('61')).toMatchObject({ isValid: false });
	});
});