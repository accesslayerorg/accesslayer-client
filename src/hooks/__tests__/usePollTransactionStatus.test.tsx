import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePollTransactionStatus } from '@/hooks/usePollTransactionStatus';
import { usePendingTxStore } from '@/hooks/usePendingTxStore';
import { transactionStatusService } from '@/services/transactionStatus.service';

const HASH = 'c'.repeat(64);

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false },
		},
	});

	return {
		queryClient,
		Wrapper: function Wrapper({ children }: { children: React.ReactNode }) {
			return React.createElement(
				QueryClientProvider,
				{ client: queryClient },
				children
			);
		},
	};
}

beforeEach(() => {
	usePendingTxStore.setState({ transactions: [] });
	vi.restoreAllMocks();
});

describe('usePollTransactionStatus (#1286)', () => {
	it('writes success back to the store and invalidates holdings', async () => {
		usePendingTxStore.getState().addPendingTransaction({
			hash: HASH,
			type: 'buy',
			keyId: 'creator-1',
		});

		const getStatus = vi
			.spyOn(transactionStatusService, 'getStatus')
			.mockResolvedValue('SUCCESS');
		const { queryClient, Wrapper } = createWrapper();
		const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

		renderHook(() => usePollTransactionStatus(HASH), { wrapper: Wrapper });

		await waitFor(() =>
			expect(usePendingTxStore.getState().transactions[0].status).toBe(
				'success'
			)
		);

		expect(getStatus).toHaveBeenCalledWith(HASH);
		expect(invalidateSpy).toHaveBeenCalled();
	});

	it('writes a failed status back to the store', async () => {
		usePendingTxStore.getState().addPendingTransaction({
			hash: HASH,
			type: 'sell',
		});

		vi.spyOn(transactionStatusService, 'getStatus').mockResolvedValue(
			'FAILED'
		);
		const { Wrapper } = createWrapper();

		renderHook(() => usePollTransactionStatus(HASH), { wrapper: Wrapper });

		await waitFor(() =>
			expect(usePendingTxStore.getState().transactions[0].status).toBe(
				'failed'
			)
		);
	});

	it('does not poll a transaction that already completed', async () => {
		usePendingTxStore.getState().addPendingTransaction({
			hash: HASH,
			type: 'buy',
		});
		usePendingTxStore.getState().updateTransactionStatus(HASH, 'success');

		const getStatus = vi.spyOn(transactionStatusService, 'getStatus');
		const { Wrapper } = createWrapper();

		renderHook(() => usePollTransactionStatus(HASH), { wrapper: Wrapper });

		await new Promise(resolve => window.setTimeout(resolve, 30));

		expect(getStatus).not.toHaveBeenCalled();
	});
});
