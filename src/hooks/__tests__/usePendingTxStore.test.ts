import { beforeEach, describe, expect, it } from 'vitest';
import {
	COMPLETED_TX_TTL_MS,
	selectPendingTransactionCount,
	usePendingTxStore,
} from '@/hooks/usePendingTxStore';

const HASH = 'a'.repeat(64);
const OTHER_HASH = 'b'.repeat(64);

beforeEach(() => {
	usePendingTxStore.setState({ transactions: [] });
});

describe('pending transaction store (#1286)', () => {
	it('adds a submitted transaction as pending', () => {
		usePendingTxStore.getState().addPendingTransaction({
			hash: HASH,
			type: 'buy',
			keyId: 'creator-1',
			submittedAt: 1_000,
		});

		expect(usePendingTxStore.getState().transactions).toEqual([
			{
				hash: HASH,
				type: 'buy',
				keyId: 'creator-1',
				submittedAt: 1_000,
				status: 'pending',
				completedAt: null,
			},
		]);
	});

	it('ignores a hash that is already tracked', () => {
		const store = usePendingTxStore.getState();
		store.addPendingTransaction({ hash: HASH, type: 'buy' });
		store.addPendingTransaction({ hash: HASH, type: 'sell' });

		expect(usePendingTxStore.getState().transactions).toHaveLength(1);
	});

	it('counts only pending transactions', () => {
		const store = usePendingTxStore.getState();
		store.addPendingTransaction({ hash: HASH, type: 'buy' });
		store.addPendingTransaction({ hash: OTHER_HASH, type: 'sell' });
		store.updateTransactionStatus(OTHER_HASH, 'success');

		expect(selectPendingTransactionCount(usePendingTxStore.getState())).toBe(
			1
		);
	});

	it('records a completion timestamp for a terminal status', () => {
		const store = usePendingTxStore.getState();
		store.addPendingTransaction({ hash: HASH, type: 'buy' });
		store.updateTransactionStatus(HASH, 'failed');

		const [transaction] = usePendingTxStore.getState().transactions;
		expect(transaction.status).toBe('failed');
		expect(transaction.completedAt).toEqual(expect.any(Number));
	});

	it('prunes completed transactions after 60 seconds', () => {
		const store = usePendingTxStore.getState();
		const submittedAt = 5_000;
		store.addPendingTransaction({ hash: HASH, type: 'buy', submittedAt });
		store.addPendingTransaction({
			hash: OTHER_HASH,
			type: 'sell',
			submittedAt,
		});
		store.updateTransactionStatus(HASH, 'success');

		const completedAt =
			usePendingTxStore.getState().transactions[0].completedAt!;

		// Still inside the retention window.
		store.pruneCompletedTransactions(completedAt + COMPLETED_TX_TTL_MS - 1);
		expect(usePendingTxStore.getState().transactions).toHaveLength(2);

		// Past the window: the completed row goes, the pending row stays.
		store.pruneCompletedTransactions(completedAt + COMPLETED_TX_TTL_MS);
		expect(
			usePendingTxStore.getState().transactions.map(tx => tx.hash)
		).toEqual([OTHER_HASH]);
	});
});
