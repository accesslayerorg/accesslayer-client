import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export type PendingTransactionState =
	| 'pending'
	| 'confirmed'
	| 'failed'
	| 'timeout';

export interface PendingTransaction {
	hash: string;
	state: PendingTransactionState;
	/** Query keys to invalidate once this transaction confirms (#1082). */
	invalidateQueryKeys?: readonly unknown[][];
	/** Present once state is 'failed'. */
	errorMessage?: string;
	submittedAt: number;
}

interface PendingTransactionContextValue {
	transactions: PendingTransaction[];
	/** Registers a freshly submitted transaction for polling (#1082). */
	addPendingTransaction: (
		hash: string,
		options?: { invalidateQueryKeys?: readonly unknown[][] }
	) => void;
	updateTransactionState: (
		hash: string,
		state: PendingTransactionState,
		errorMessage?: string
	) => void;
	/** Removes a transaction from tracking, e.g. after its toast is dismissed. */
	removeTransaction: (hash: string) => void;
	/** Re-queues a failed transaction's hash as pending again (#1082 retry). */
	retryTransaction: (hash: string) => void;
}

const PendingTransactionContext =
	createContext<PendingTransactionContextValue | null>(null);

export function PendingTransactionProvider({
	children,
}: {
	children: ReactNode;
}) {
	const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
	// Tracks hashes already present, so addPendingTransaction is idempotent if
	// called twice for the same submission (e.g. a retried mutation).
	const knownHashes = useRef(new Set<string>());

	const addPendingTransaction = useCallback(
		(
			hash: string,
			options?: { invalidateQueryKeys?: readonly unknown[][] }
		) => {
			if (knownHashes.current.has(hash)) return;
			knownHashes.current.add(hash);
			setTransactions(prev => [
				...prev,
				{
					hash,
					state: 'pending',
					invalidateQueryKeys: options?.invalidateQueryKeys,
					submittedAt: Date.now(),
				},
			]);
		},
		[]
	);

	const updateTransactionState = useCallback(
		(hash: string, state: PendingTransactionState, errorMessage?: string) => {
			setTransactions(prev =>
				prev.map(tx =>
					tx.hash === hash ? { ...tx, state, errorMessage } : tx
				)
			);
		},
		[]
	);

	const removeTransaction = useCallback((hash: string) => {
		knownHashes.current.delete(hash);
		setTransactions(prev => prev.filter(tx => tx.hash !== hash));
	}, []);

	const retryTransaction = useCallback((hash: string) => {
		setTransactions(prev =>
			prev.map(tx =>
				tx.hash === hash
					? { ...tx, state: 'pending', errorMessage: undefined, submittedAt: Date.now() }
					: tx
			)
		);
	}, []);

	const value = useMemo(
		() => ({
			transactions,
			addPendingTransaction,
			updateTransactionState,
			removeTransaction,
			retryTransaction,
		}),
		[transactions, addPendingTransaction, updateTransactionState, removeTransaction, retryTransaction]
	);

	return (
		<PendingTransactionContext.Provider value={value}>
			{children}
		</PendingTransactionContext.Provider>
	);
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePendingTransactions(): PendingTransactionContextValue {
	const ctx = useContext(PendingTransactionContext);
	if (!ctx) {
		throw new Error(
			'usePendingTransactions must be used within a PendingTransactionProvider'
		);
	}
	return ctx;
}
