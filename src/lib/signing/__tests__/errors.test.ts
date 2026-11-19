import { describe, expect, it } from 'vitest';
import { classifySigningError } from '../errors';

describe('classifySigningError', () => {
	it.each([
		[{ message: 'User rejected the request' }, 'UserRejected'],
		[{ message: 'wallet is on the wrong network' }, 'NetworkMismatch'],
		[{ statusCode: 0x5515, message: 'Device locked' }, 'LedgerLocked'],
		[
			{ statusCode: 0x6e00, message: 'App does not seem to be open' },
			'LedgerAppNotOpen',
		],
		[{ name: 'TransportError', message: 'Ledger timeout' }, 'LedgerTimeout'],
		[
			{
				name: 'StellarDataTooLargeError',
				message: 'Data size exceeds maximum',
			},
			'TransactionTooLarge',
		],
		[{ message: 'Freighter is not installed' }, 'SignerUnavailable'],
	] as const)('maps %o to %s', (rawError, expectedType) => {
		const error = classifySigningError(rawError);
		expect(error.type).toBe(expectedType);
		expect(error.hint.length).toBeGreaterThan(10);
	});

	it('marks only Ledger timeouts as retryable', () => {
		expect(classifySigningError(new Error('timed out')).retryable).toBe(true);
		expect(classifySigningError(new Error('user rejected')).retryable).toBe(
			false
		);
	});
});
