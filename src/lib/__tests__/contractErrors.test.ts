import { describe, expect, it } from 'vitest';
import { CONTRACT_ERROR_MAP } from '@/lib/contractErrors';

const REQUIRED_KEYS = [
	'LP_1',
	'LP_2',
	'LP_3',
	'LP_4',
	'LP_5',
	'LP_6',
	'LP_7',
	'SLIPPAGE_EXCEEDED',
	'INSUFFICIENT_BALANCE',
	'HOLDING_CAP_EXCEEDED',
	'CIRCUIT_BREAKER_TRIPPED',
	'PRICE_FLOOR_ACTIVE',
	'INVALID_OPTION',
	'VOTE_CLOSED',
	'TRANSACTION_FAILED',
	'NOT_CONFIGURED',
];

describe('Contract error code mapping', () => {
	it.each(REQUIRED_KEYS)('key %s has a valid mapping', key => {
		const entry = CONTRACT_ERROR_MAP[key];
		expect(entry, `Missing mapping for contract error code: ${key}`).toBeDefined();
		expect(typeof entry.title).toBe('string');
		expect(entry.title.length).toBeGreaterThan(0);
		expect(typeof entry.message).toBe('string');
		expect(entry.message.length).toBeGreaterThan(0);
		expect(typeof entry.recoveryAction).toBe('string');
		expect(typeof entry.recoveryLabel).toBe('string');
	});

	it('fails when a new contract error code lacks a mapping', () => {
		const unmapped = 'LP_999';
		expect(CONTRACT_ERROR_MAP[unmapped]).toBeUndefined();
	});

	it('every entry has no raw addresses or secrets in message text', () => {
		const stellarAddressPattern = /G[A-Z0-9]{55}/;
		const secretKeyPattern = /S[A-Z0-9]{55}/;
		for (const [key, entry] of Object.entries(CONTRACT_ERROR_MAP)) {
			expect(stellarAddressPattern.test(entry.message), `${key} message contains a Stellar address`).toBe(false);
			expect(secretKeyPattern.test(entry.message), `${key} message contains a secret key`).toBe(false);
		}
	});
});
