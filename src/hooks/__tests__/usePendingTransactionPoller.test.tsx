/**
 * Unit tests for the Horizon transaction status poller (#1082).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
	PendingTransactionProvider,
	usePendingTransactions,
} from '@/contexts/PendingTransactionContext';
import { usePendingTransactionPoller } from '../usePendingTransactionPoller';

// Hardcoded per #1082's acceptance criteria ("polled every 3 seconds for up
// to 60 seconds"), deliberately NOT imported from the module under test: if
// someone changes POLL_INTERVAL_MS/POLL_TIMEOUT_MS, these tests must still
// assert the literal contract the issue specifies, not whatever the
// constants currently say.
const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 60_000;
import { getTransactionStatus } from '@/lib/stellar/horizonClient';

vi.mock('@/lib/stellar/horizonClient', () => ({
	getTransactionStatus: vi.fn(),
}));

const mockedGetTransactionStatus = vi.mocked(getTransactionStatus);

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
	function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>
				<PendingTransactionProvider>{children}</PendingTransactionProvider>
			</QueryClientProvider>
		);
	}
	return { Wrapper, invalidateSpy };
}

function renderPoller() {
	const { Wrapper, invalidateSpy } = createWrapper();
	const { result } = renderHook(
		() => {
			usePendingTransactionPoller();
			return usePendingTransactions();
		},
		{ wrapper: Wrapper }
	);
	return { result, invalidateSpy };
}

describe('usePendingTransactionPoller (#1082)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		mockedGetTransactionStatus.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('starts polling immediately after a transaction is registered', async () => {
		mockedGetTransactionStatus.mockResolvedValue({ status: 'pending' });
		const { result } = renderPoller();

		act(() => {
			result.current.addPendingTransaction('tx-1');
		});
		await act(async () => {
			await Promise.resolve();
		});

		expect(mockedGetTransactionStatus).toHaveBeenCalledWith('tx-1');
	});

	it('moves to confirmed and invalidates the given query keys', async () => {
		mockedGetTransactionStatus.mockResolvedValue({ status: 'confirmed' });
		const { result, invalidateSpy } = renderPoller();

		act(() => {
			result.current.addPendingTransaction('tx-1', {
				invalidateQueryKeys: [['wallet', 'holdings'], ['creators']],
			});
		});
		await act(async () => {
			await Promise.resolve();
		});

		expect(
			result.current.transactions.find(tx => tx.hash === 'tx-1')?.state
		).toBe('confirmed');
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ['wallet', 'holdings'],
		});
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['creators'] });
	});

	it('moves to failed with the error from a failed transaction', async () => {
		mockedGetTransactionStatus.mockResolvedValue({
			status: 'failed',
			errorMessage: 'op_underfunded',
		});
		const { result } = renderPoller();

		act(() => {
			result.current.addPendingTransaction('tx-1');
		});
		await act(async () => {
			await Promise.resolve();
		});

		const tx = result.current.transactions.find(t => t.hash === 'tx-1');
		expect(tx?.state).toBe('failed');
		expect(tx?.errorMessage).toBe('op_underfunded');
	});

	it('keeps polling at the configured interval while still pending', async () => {
		mockedGetTransactionStatus.mockResolvedValue({ status: 'pending' });
		const { result } = renderPoller();

		act(() => {
			result.current.addPendingTransaction('tx-1');
		});
		await act(async () => {
			await Promise.resolve();
		});
		expect(mockedGetTransactionStatus).toHaveBeenCalledTimes(1);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
		});
		expect(mockedGetTransactionStatus).toHaveBeenCalledTimes(2);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
		});
		expect(mockedGetTransactionStatus).toHaveBeenCalledTimes(3);
	});

	it('moves to timeout after 60 seconds of remaining pending', async () => {
		mockedGetTransactionStatus.mockResolvedValue({ status: 'pending' });
		const { result } = renderPoller();

		act(() => {
			result.current.addPendingTransaction('tx-1');
		});
		await act(async () => {
			await Promise.resolve();
		});

		await act(async () => {
			await vi.advanceTimersByTimeAsync(POLL_TIMEOUT_MS);
		});

		expect(
			result.current.transactions.find(tx => tx.hash === 'tx-1')?.state
		).toBe('timeout');
	});

	it('stops polling a transaction once it confirms', async () => {
		mockedGetTransactionStatus.mockResolvedValue({ status: 'confirmed' });
		const { result } = renderPoller();

		act(() => {
			result.current.addPendingTransaction('tx-1');
		});
		await act(async () => {
			await Promise.resolve();
		});
		const callsAtConfirm = mockedGetTransactionStatus.mock.calls.length;

		await act(async () => {
			await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
		});

		expect(mockedGetTransactionStatus).toHaveBeenCalledTimes(callsAtConfirm);
	});

	it('tracks multiple simultaneous transactions independently', async () => {
		mockedGetTransactionStatus.mockImplementation(async hash => {
			if (hash === 'tx-confirmed') return { status: 'confirmed' };
			return { status: 'pending' };
		});
		const { result } = renderPoller();

		act(() => {
			result.current.addPendingTransaction('tx-confirmed');
			result.current.addPendingTransaction('tx-pending');
		});
		await act(async () => {
			await Promise.resolve();
		});

		expect(
			result.current.transactions.find(tx => tx.hash === 'tx-confirmed')
				?.state
		).toBe('confirmed');
		expect(
			result.current.transactions.find(tx => tx.hash === 'tx-pending')?.state
		).toBe('pending');
	});
});
