import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
	usePendingTransactions,
	type PendingTransaction,
} from '@/contexts/PendingTransactionContext';
import { getTransactionStatus } from '@/lib/stellar/horizonClient';

export const POLL_INTERVAL_MS = 3_000;
export const POLL_TIMEOUT_MS = 60_000;

/**
 * Polls Horizon for every transaction currently tracked as 'pending' in
 * PendingTransactionContext, starting immediately on mount/registration
 * (#1082). Each transaction is polled independently of the others, so one
 * slow or stuck lookup never blocks another's confirmation from landing.
 *
 * Mount this once near the app root (it reads from the shared context, so
 * multiple mounts would just poll the same transactions twice).
 */
export function usePendingTransactionPoller(): void {
	const { transactions, updateTransactionState } = usePendingTransactions();
	const queryClient = useQueryClient();
	// One interval timer per in-flight hash, so a transaction added mid-poll
	// starts its own 3s cadence and 60s deadline from its own submittedAt,
	// not from whenever this effect last re-ran.
	const timersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(
		new Map()
	);

	useEffect(() => {
		const timers = timersRef.current;
		const pending = transactions.filter(tx => tx.state === 'pending');
		const trackedHashes = new Set(pending.map(tx => tx.hash));

		// Stop polling anything no longer pending (confirmed/failed/timeout/removed).
		for (const [hash, timer] of timers) {
			if (!trackedHashes.has(hash)) {
				clearInterval(timer);
				timers.delete(hash);
			}
		}

		for (const tx of pending) {
			if (timers.has(tx.hash)) continue;
			timers.set(tx.hash, startPolling(tx, updateTransactionState, queryClient));
		}

		return () => {
			for (const timer of timers.values()) clearInterval(timer);
			timers.clear();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [transactions]);
}

function startPolling(
	tx: PendingTransaction,
	updateTransactionState: ReturnType<
		typeof usePendingTransactions
	>['updateTransactionState'],
	queryClient: ReturnType<typeof useQueryClient>
): ReturnType<typeof setInterval> {
	const deadline = tx.submittedAt + POLL_TIMEOUT_MS;
	let inFlight = false;

	const tick = async () => {
		if (inFlight) return;
		if (Date.now() >= deadline) {
			clearInterval(timer);
			updateTransactionState(tx.hash, 'timeout');
			return;
		}

		inFlight = true;
		try {
			const result = await getTransactionStatus(tx.hash);
			if (result.status === 'confirmed') {
				clearInterval(timer);
				for (const queryKey of tx.invalidateQueryKeys ?? []) {
					void queryClient.invalidateQueries({ queryKey });
				}
				updateTransactionState(tx.hash, 'confirmed');
			} else if (result.status === 'failed') {
				clearInterval(timer);
				updateTransactionState(tx.hash, 'failed', result.errorMessage);
			}
			// 'pending': leave the interval running for the next tick.
		} finally {
			inFlight = false;
		}
	};

	const timer = setInterval(tick, POLL_INTERVAL_MS);
	void tick();
	return timer;
}
