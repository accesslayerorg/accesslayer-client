import { useCallback, useEffect, useRef, useState } from 'react';
import {
	transactionHistoryService,
	type GetWalletTransactionsParams,
	type WalletTransaction,
	type WalletTransactionPage,
} from '@/services/transactionHistory.service';
import {
	getTypesForFilter,
	matchesTransactionFilters,
	mergeTransactionPages,
	type ResolvedDateRange,
	type TransactionTypeFilter,
} from '@/utils/transactionHistory.utils';

export type FetchTransactionPage = (
	params: GetWalletTransactionsParams
) => Promise<WalletTransactionPage>;

export interface UseTransactionHistoryOptions {
	address: string | undefined;
	filter: TransactionTypeFilter;
	/** `null` while a custom range is incomplete; nothing is fetched. */
	range: ResolvedDateRange | null;
	/** Injectable for tests; defaults to the API service. */
	fetchPage?: FetchTransactionPage;
}

export type TransactionHistoryStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseTransactionHistoryResult {
	transactions: WalletTransaction[];
	status: TransactionHistoryStatus;
	hasMore: boolean;
	isLoadingMore: boolean;
	loadMoreError: boolean;
	loadMore: () => void;
	retry: () => void;
}

/**
 * Cursor-paginated wallet activity. Changing the address, type filter or
 * date range resets the list and fetches a fresh first page; `loadMore`
 * appends the next page, skipping any rows already shown.
 */
export function useTransactionHistory({
	address,
	filter,
	range,
	fetchPage = params => transactionHistoryService.getTransactions(params),
}: UseTransactionHistoryOptions): UseTransactionHistoryResult {
	const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [status, setStatus] = useState<TransactionHistoryStatus>('idle');
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [loadMoreError, setLoadMoreError] = useState(false);
	const [retryToken, setRetryToken] = useState(0);

	// Bumped whenever the query changes so late responses from a previous
	// filter/range never leak into the current list.
	const generationRef = useRef(0);
	const fetchPageRef = useRef(fetchPage);
	useEffect(() => {
		fetchPageRef.current = fetchPage;
	});

	const from = range?.from;
	const to = range?.to;
	const hasRange = range !== null;

	const buildParams = useCallback(
		(cursor: string | null): GetWalletTransactionsParams => ({
			address: address ?? '',
			types: getTypesForFilter(filter),
			from,
			to,
			cursor,
		}),
		[address, filter, from, to]
	);

	const keepMatching = useCallback(
		(items: WalletTransaction[]) =>
			items.filter(tx =>
				matchesTransactionFilters(tx, filter, { from, to })
			),
		[filter, from, to]
	);

	useEffect(() => {
		const generation = ++generationRef.current;
		setTransactions([]);
		setNextCursor(null);
		setIsLoadingMore(false);
		setLoadMoreError(false);

		if (!address || !hasRange) {
			setStatus('idle');
			return;
		}

		setStatus('loading');
		fetchPageRef
			.current(buildParams(null))
			.then(page => {
				if (generation !== generationRef.current) return;
				setTransactions(
					mergeTransactionPages([], keepMatching(page.items))
				);
				setNextCursor(page.nextCursor);
				setStatus('ready');
			})
			.catch(() => {
				if (generation !== generationRef.current) return;
				setStatus('error');
			});
	}, [address, hasRange, buildParams, keepMatching, retryToken]);

	const loadMore = useCallback(() => {
		if (!nextCursor || isLoadingMore || status !== 'ready') return;
		const generation = generationRef.current;
		setIsLoadingMore(true);
		setLoadMoreError(false);

		fetchPageRef
			.current(buildParams(nextCursor))
			.then(page => {
				if (generation !== generationRef.current) return;
				setTransactions(current =>
					mergeTransactionPages(current, keepMatching(page.items))
				);
				setNextCursor(page.nextCursor);
			})
			.catch(() => {
				if (generation !== generationRef.current) return;
				setLoadMoreError(true);
			})
			.finally(() => {
				if (generation !== generationRef.current) return;
				setIsLoadingMore(false);
			});
	}, [nextCursor, isLoadingMore, status, buildParams, keepMatching]);

	const retry = useCallback(() => setRetryToken(token => token + 1), []);

	return {
		transactions,
		status,
		hasMore: nextCursor !== null,
		isLoadingMore,
		loadMoreError,
		loadMore,
		retry,
	};
}
