import { afterEach, describe, expect, it, vi } from 'vitest';

const transactionMock = vi.fn();

vi.mock('@stellar/stellar-sdk', async () => {
	const actual = await vi.importActual<typeof import('@stellar/stellar-sdk')>(
		'@stellar/stellar-sdk'
	);
	class MockServer {
		transactions() {
			return {
				transaction: (hash: string) => ({ call: () => transactionMock(hash) }),
			};
		}
	}
	return {
		...actual,
		Horizon: { Server: MockServer },
	};
});

import { getTransactionStatus } from '../horizonClient';

describe('getTransactionStatus (#1082)', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('returns confirmed for a successful transaction', async () => {
		transactionMock.mockResolvedValueOnce({ successful: true });

		const result = await getTransactionStatus('abc123');

		expect(result).toEqual({ status: 'confirmed' });
	});

	it('returns failed with an error message for an unsuccessful transaction', async () => {
		transactionMock.mockResolvedValueOnce({
			successful: false,
			result_xdr: undefined,
		});

		const result = await getTransactionStatus('abc123');

		expect(result.status).toBe('failed');
		expect((result as { errorMessage: string }).errorMessage).toBeTruthy();
	});

	it('returns pending for a 404 (not yet found on Horizon)', async () => {
		transactionMock.mockRejectedValueOnce({ response: { status: 404 } });

		const result = await getTransactionStatus('abc123');

		expect(result).toEqual({ status: 'pending' });
	});

	it('returns failed for a non-404 error (network failure, malformed hash)', async () => {
		transactionMock.mockRejectedValueOnce(new Error('Network error'));

		const result = await getTransactionStatus('abc123');

		expect(result.status).toBe('failed');
		expect((result as { errorMessage: string }).errorMessage).toBe(
			'Network error'
		);
	});
});
