import { create } from 'zustand';
import {
	createJSONStorage,
	persist,
	type StateStorage,
} from 'zustand/middleware';

/**
 * In-flight transaction tracker (#1286).
 *
 * Trades are signed and submitted, then wait for ledger inclusion while the
 * user may navigate away from the swap screen. This store keeps those
 * submissions in one place so the nav badge and the pending-transactions
 * drawer can show them from anywhere in the app.
 *
 * The list is persisted in `sessionStorage` (not `localStorage`): it only
 * needs to survive a page refresh within the same tab, and a transaction
 * tracked by a stale browser session is no longer useful.
 */

export const PENDING_TX_STORAGE_KEY = 'accesslayer.pendingTransactions';

/**
 * How long a completed row stays visible before it is pruned. Keeping it
 * around briefly lets the user see the outcome after they return to the tab.
 */
export const COMPLETED_TX_TTL_MS = 60_000;

export type PendingTransactionType =
	'buy' | 'sell' | 'add_liquidity' | 'claim_rewards' | 'remove_liquidity';

export type PendingTransactionStatus = 'pending' | 'success' | 'failed';

export interface PendingTransaction {
	/** Full Stellar transaction hash used for status polling and linking. */
	hash: string;
	type: PendingTransactionType;
	/** Creator key the transaction belongs to, when known. */
	keyId: string | null;
	/** Unix timestamp (ms) of when the transaction was submitted. */
	submittedAt: number;
	status: PendingTransactionStatus;
	/** Unix timestamp (ms) of the terminal status, `null` while pending. */
	completedAt: number | null;
}

export interface AddPendingTransactionInput {
	hash: string;
	type: PendingTransactionType;
	keyId?: string | null;
	submittedAt?: number;
}

interface PendingTxState {
	transactions: PendingTransaction[];
	/** Adds a submitted transaction, ignoring a hash already being tracked. */
	addPendingTransaction: (input: AddPendingTransactionInput) => void;
	/** Records the terminal status reported by the network. */
	updateTransactionStatus: (
		hash: string,
		status: PendingTransactionStatus
	) => void;
	/** Drops a transaction from the tracker. */
	removePendingTransaction: (hash: string) => void;
	/** Clears all tracked transactions, e.g. after a wallet switch in another tab. */
	clearAll: () => void;
	/** Removes completed transactions older than {@link COMPLETED_TX_TTL_MS}. */
	pruneCompletedTransactions: (now?: number) => void;
}

/**
 * Non-browser fallback (node test environments, SSR) so importing the store
 * never dereferences `sessionStorage` when it is unavailable.
 */
const memoryOnlyStorage: StateStorage = {
	getItem: () => null,
	setItem: () => undefined,
	removeItem: () => undefined,
};

function resolveStorage(): StateStorage {
	try {
		if (typeof window === 'undefined' || !window.sessionStorage) {
			return memoryOnlyStorage;
		}
		return window.sessionStorage;
	} catch {
		// jsdom (and some privacy modes) throw when storage is unavailable.
		return memoryOnlyStorage;
	}
}

/** Storage access that never throws, so a blocked sessionStorage cannot
 * make a trade submission fail. */
const safeStorage: StateStorage = {
	getItem: name => {
		try {
			return resolveStorage().getItem(name);
		} catch {
			return null;
		}
	},
	setItem: (name, value) => {
		try {
			resolveStorage().setItem(name, value);
		} catch {
			/* persistence is best-effort */
		}
	},
	removeItem: name => {
		try {
			resolveStorage().removeItem(name);
		} catch {
			/* persistence is best-effort */
		}
	},
};

export const usePendingTxStore = create<PendingTxState>()(
	persist(
		set => ({
			transactions: [],

			addPendingTransaction: ({
				hash,
				type,
				keyId = null,
				submittedAt = Date.now(),
			}) =>
				set(state => {
					if (!hash || state.transactions.some(tx => tx.hash === hash)) {
						return state;
					}

					return {
						transactions: [
							...state.transactions,
							{
								hash,
								type,
								keyId,
								submittedAt,
								status: 'pending',
								completedAt: null,
							},
						],
					};
				}),

			updateTransactionStatus: (hash, status) =>
				set(state => ({
					transactions: state.transactions.map(tx => {
						if (tx.hash !== hash || tx.status === status) return tx;

						return {
							...tx,
							status,
							completedAt: status === 'pending' ? null : Date.now(),
						};
					}),
				})),

			removePendingTransaction: hash =>
				set(state => ({
					transactions: state.transactions.filter(tx => tx.hash !== hash),
				})),

			clearAll: () => set({ transactions: [] }),

			pruneCompletedTransactions: (now = Date.now()) =>
				set(state => {
					const remaining = state.transactions.filter(
						tx =>
							tx.status === 'pending' ||
							tx.completedAt == null ||
							now - tx.completedAt < COMPLETED_TX_TTL_MS
					);

					return remaining.length === state.transactions.length
						? state
						: { transactions: remaining };
				}),
		}),
		{
			name: PENDING_TX_STORAGE_KEY,
			storage: createJSONStorage(() => safeStorage),
			partialize: state => ({ transactions: state.transactions }),
		}
	)
);

/** Number of transactions still waiting for a terminal ledger status. */
export function selectPendingTransactionCount(state: PendingTxState): number {
	return state.transactions.filter(tx => tx.status === 'pending').length;
}
