import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { transactionStatusService } from '@/services/transactionStatus.service';
import { usePendingTxStore } from '@/hooks/usePendingTxStore';

/**
 * Polls a submitted transaction's ledger status every 3 seconds (#1286).
 *
 * Polling stops as soon as `getTransaction` reports `SUCCESS` or `FAILED`:
 * the terminal status is written back to the pending-tx store and the query
 * is disabled. Unmounting the observer also stops the interval — React Query
 * only refetches while the query is observed.
 *
 * A successful transaction invalidates the wallet holdings queries so the
 * portfolio reflects the trade without a manual refresh.
 */

export const TRANSACTION_POLL_INTERVAL_MS = 3_000;

export function usePollTransactionStatus(hash: string | undefined) {
	const queryClient = useQueryClient();
	const status = usePendingTxStore(state => {
		const tx = hash
			? state.transactions.find(candidate => candidate.hash === hash)
			: undefined;
		return tx?.status;
	});
	const updateTransactionStatus = usePendingTxStore(
		state => state.updateTransactionStatus
	);

	const isTerminal = status === 'success' || status === 'failed';
	const isActive = Boolean(hash) && !isTerminal;

	const query = useQuery({
		queryKey: queryKeys.transaction.status(hash ?? ''),
		queryFn: () => transactionStatusService.getStatus(hash!),
		enabled: isActive,
		refetchInterval: isActive ? TRANSACTION_POLL_INTERVAL_MS : false,
		staleTime: 0,
		retry: false,
	});

	const remoteStatus = query.data;

	useEffect(() => {
		if (!hash || !isActive) return;
		if (remoteStatus !== 'SUCCESS' && remoteStatus !== 'FAILED') return;

		const nextStatus = remoteStatus === 'SUCCESS' ? 'success' : 'failed';
		updateTransactionStatus(hash, nextStatus);

		if (nextStatus === 'success') {
			void queryClient.invalidateQueries({
				predicate: query =>
					query.queryKey[0] === 'wallet' &&
					query.queryKey[2] === 'holdings',
			});
		}
	}, [hash, isActive, remoteStatus, updateTransactionStatus, queryClient]);

	return {
		status: status ?? 'pending',
		isPolling: isActive,
		lastStatus: remoteStatus,
		error: query.error,
	};
}
