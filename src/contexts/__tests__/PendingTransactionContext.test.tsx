import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
	PendingTransactionProvider,
	usePendingTransactions,
} from '../PendingTransactionContext';

function wrapper({ children }: { children: React.ReactNode }) {
	return <PendingTransactionProvider>{children}</PendingTransactionProvider>;
}

describe('PendingTransactionContext (#1082)', () => {
	it('starts with no tracked transactions', () => {
		const { result } = renderHook(() => usePendingTransactions(), { wrapper });
		expect(result.current.transactions).toEqual([]);
	});

	it('adds a pending transaction', () => {
		const { result } = renderHook(() => usePendingTransactions(), { wrapper });

		act(() => {
			result.current.addPendingTransaction('tx-1');
		});

		expect(result.current.transactions).toHaveLength(1);
		expect(result.current.transactions[0]).toMatchObject({
			hash: 'tx-1',
			state: 'pending',
		});
	});

	it('tracks multiple simultaneous transactions independently', () => {
		const { result } = renderHook(() => usePendingTransactions(), { wrapper });

		act(() => {
			result.current.addPendingTransaction('tx-1');
			result.current.addPendingTransaction('tx-2');
		});

		expect(result.current.transactions.map(tx => tx.hash)).toEqual([
			'tx-1',
			'tx-2',
		]);

		act(() => {
			result.current.updateTransactionState('tx-1', 'confirmed');
		});

		expect(
			result.current.transactions.find(tx => tx.hash === 'tx-1')?.state
		).toBe('confirmed');
		expect(
			result.current.transactions.find(tx => tx.hash === 'tx-2')?.state
		).toBe('pending');
	});

	it('does not add the same hash twice', () => {
		const { result } = renderHook(() => usePendingTransactions(), { wrapper });

		act(() => {
			result.current.addPendingTransaction('tx-1');
			result.current.addPendingTransaction('tx-1');
		});

		expect(result.current.transactions).toHaveLength(1);
	});

	it('updates a transaction to failed with an error message', () => {
		const { result } = renderHook(() => usePendingTransactions(), { wrapper });

		act(() => {
			result.current.addPendingTransaction('tx-1');
			result.current.updateTransactionState('tx-1', 'failed', 'op_underfunded');
		});

		expect(result.current.transactions[0]).toMatchObject({
			state: 'failed',
			errorMessage: 'op_underfunded',
		});
	});

	it('removes a transaction from tracking', () => {
		const { result } = renderHook(() => usePendingTransactions(), { wrapper });

		act(() => {
			result.current.addPendingTransaction('tx-1');
			result.current.removeTransaction('tx-1');
		});

		expect(result.current.transactions).toEqual([]);
	});

	it('allows re-adding a hash after it has been removed', () => {
		const { result } = renderHook(() => usePendingTransactions(), { wrapper });

		act(() => {
			result.current.addPendingTransaction('tx-1');
			result.current.removeTransaction('tx-1');
			result.current.addPendingTransaction('tx-1');
		});

		expect(result.current.transactions).toHaveLength(1);
	});

	it('resets a failed transaction back to pending on retry', () => {
		const { result } = renderHook(() => usePendingTransactions(), { wrapper });

		act(() => {
			result.current.addPendingTransaction('tx-1');
			result.current.updateTransactionState('tx-1', 'failed', 'boom');
		});

		act(() => {
			result.current.retryTransaction('tx-1');
		});

		expect(result.current.transactions[0]).toMatchObject({
			state: 'pending',
			errorMessage: undefined,
		});
	});

	it('throws when used outside a provider', () => {
		const { result } = renderHook(() => {
			try {
				return usePendingTransactions();
			} catch (e) {
				return e;
			}
		});
		expect(result.current).toBeInstanceOf(Error);
	});
});
