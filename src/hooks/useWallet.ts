import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import { fetchWalletActivityPage } from '@/services/walletActivity.service';
import { fetchTradeHistoryPage } from '@/services/tradeHistory.service';

export function useWalletHoldings(address: string) {
	return useQuery<HeldKeyPosition[]>({
		queryKey: queryKeys.wallet.holdings(address),
		queryFn: async () => [],
		enabled: !!address,
	});
}

/**
 * Paginated wallet activity feed.
 *
 * #677 — uses `useInfiniteQuery` so the feed can incrementally load
 * older trades via `fetchNextPage()` triggered by an `IntersectionObserver`
 * sentinel mounted at the bottom of the list. The query key is the same
 * `queryKeys.wallet.activity(address)` constant used by the original
 * `useQuery` implementation so existing cache-key tests continue to pass.
 */
export function useWalletActivity(address: string) {
	return useInfiniteQuery({
		queryKey: queryKeys.wallet.activity(address),
		queryFn: ({ pageParam }) =>
			fetchWalletActivityPage(address, pageParam ?? 1),
		initialPageParam: 1,
		getNextPageParam: lastPage => lastPage.nextPage,
		enabled: !!address,
	});
}

/**
 * Cursor-paginated trade history for a wallet.
 *
 * #784 — fetches GET /users/:wallet/trades with `cursor` pagination.
 * Each page is appended to `data.pages`; the "Load More" button
 * calls `fetchNextPage()` when `hasNextPage` is true.
 */
export function useTradeHistory(address: string) {
	return useInfiniteQuery({
		queryKey: queryKeys.wallet.tradeHistory(address),
		queryFn: ({ pageParam }) =>
			fetchTradeHistoryPage(address, pageParam as string | null | undefined),
		initialPageParam: null as string | null,
		getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
		enabled: !!address,
	});
}

export interface TradeVariables {
	creatorId: string;
	amount: number;
	priceStroops: number | null | undefined;
	price: number | null | undefined;
	/** Optional referral wallet address forwarded from a referral link */
	ref?: string | null;
}

export function useTradeMutation(address: string) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationKey: ['trade', address],
		mutationFn: async (variables: TradeVariables) => {
			// In production this would call the on-chain contract; here we
			// simulate latency. The `ref` field is accepted and can be used
			// by instrumentation or contract calls.
			void variables;
			await new Promise<void>(resolve => window.setTimeout(resolve, 900));
			return { success: true as const };
		},
		onMutate: async ({
			creatorId,
			amount,
			priceStroops,
			price,
		}: TradeVariables) => {
			const queryKey = queryKeys.wallet.holdings(address);

			await queryClient.cancelQueries({ queryKey });

			const previousHoldings =
				queryClient.getQueryData<HeldKeyPosition[]>(queryKey) ?? [];

			queryClient.setQueryData<HeldKeyPosition[]>(queryKey, (old = []) => {
				const existing = old.find(h => h.creatorId === creatorId);
				if (existing) {
					const nextQuantity = (existing.quantity ?? 0) + amount;

					if (nextQuantity <= 0) {
						return old.filter(h => h.creatorId !== creatorId);
					}

					return old.map(h =>
						h.creatorId === creatorId
							? {
									...h,
									quantity: nextQuantity,
									pending: true,
								}
							: h
					);
				}
				return [
					...old,
					{
						creatorId,
						quantity: amount,
						priceStroops: priceStroops ?? null,
						price: price ?? null,
						pending: true,
					},
				];
			});

			// Optimistic holder count increment (#780)
			const holderCountKey = ['creator', creatorId, 'holderCount'];
			await queryClient.cancelQueries({ queryKey: holderCountKey });
			const previousHolderCount =
				queryClient.getQueryData<number>(holderCountKey) ?? 0;
			queryClient.setQueryData<number>(
				holderCountKey,
				(oldCount = 0) => oldCount + 1
			);

			return { previousHoldings, previousHolderCount };
		},
		onError: (error, variables, context) => {
			const holdingsKey = queryKeys.wallet.holdings(address);

			if (context?.previousHoldings) {
				queryClient.setQueryData(holdingsKey, context.previousHoldings);
			} else if (process.env.NODE_ENV !== 'test') {
				// No snapshot was captured in onMutate (e.g. it threw before
				// returning), so the rollback above cannot run and the cache
				// may be left holding the optimistic (unconfirmed) update.
				console.warn('[optimistic-rollback]', {
					cache_key: JSON.stringify(holdingsKey),
					action:
						(variables as TradeVariables).amount > 0 ? 'buy' : 'sell',
					creator_id: (variables as TradeVariables).creatorId,
					reason: 'snapshot_missing',
					failed_at: new Date().toISOString(),
				});
			}

			showToast.error(getSignatureErrorMessage(error));

			// Emit structured log for failed transaction
			if (process.env.NODE_ENV !== 'test') {
				const truncatedAddress = address
					? `${address.slice(0, 4)}...${address.slice(-4)}`
					: 'unknown';

				const errorCode =
					error instanceof Error
						? error.name || error.message
						: String(error);

				console.debug('[transaction-failed]', {
					error_code: errorCode,
					creator_id: (variables as TradeVariables).creatorId,
					action:
						(variables as TradeVariables).amount > 0 ? 'buy' : 'sell',
					quantity: Math.abs((variables as TradeVariables).amount),
					wallet_address: truncatedAddress,
					failed_at: new Date().toISOString(),
				});
			}
		},
		onSuccess: (_data, variables) => {
			queryClient.setQueryData<HeldKeyPosition[]>(
				queryKeys.wallet.holdings(address),
				(old = []) =>
					old.map(h =>
						h.creatorId === variables.creatorId
							? { ...h, pending: false }
							: h
					)
			);
		},
		onSettled: (_data, _error, variables) => {
			// #691 — a completed buy/sell changes supply/price data backing the
			// marketplace list, so its cache must not wait out the 60s
			// staleTime; invalidate immediately regardless of the trade outcome.
			const invalidatedKeys = [
				queryKeys.wallet.holdings(address),
				queryKeys.creators.all,
			];
			queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.holdings(address),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.all,
			});

			if (process.env.NODE_ENV !== 'test') {
				console.debug('[cache-invalidation]', {
					invalidated_keys: invalidatedKeys.map(k => JSON.stringify(k)),
					trigger:
						(variables as TradeVariables).amount > 0 ? 'buy' : 'sell',
					creator_id: (variables as TradeVariables).creatorId,
					invalidated_at: new Date().toISOString(),
				});
			}
		},
	});

	return mutation;
}

export interface BatchOrder {
	address: string;
	quantity: number;
	ref?: string | null;
}

export interface ReinvestDividendVariables {
	/** The creator key whose dividends are being reinvested. */
	keyId: string;
	/** Unclaimed dividend amount in XLM being compounded. */
	amount: number;
	/** Number of whole keys the reinvestment buys (used for optimistic update). */
	keys: number;
}

export function useReinvestDividendMutation(address: string) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationKey: ['reinvest-dividend', address],
		mutationFn: async (variables: ReinvestDividendVariables) => {
			// In production this submits the on-chain `reinvest_dividend`
			// contract function with the holder's `key_id` (`variables.keyId`).
			// Here we simulate latency and accept the payload.
			void variables;
			await new Promise<void>(resolve => window.setTimeout(resolve, 900));
			return { success: true as const };
		},
		onMutate: async ({
			keyId,
			keys,
			amount,
		}: ReinvestDividendVariables) => {
			const queryKey = queryKeys.wallet.holdings(address);

			await queryClient.cancelQueries({ queryKey });

			const previousHoldings =
				queryClient.getQueryData<HeldKeyPosition[]>(queryKey) ?? [];

			queryClient.setQueryData<HeldKeyPosition[]>(queryKey, (old = []) =>
				old.map(h => {
					if (h.creatorId !== keyId) return h;
					return {
						...h,
						quantity: (h.quantity ?? 0) + keys,
						pending: true,
						// Optimistically clear the compounded dividend.
						unclaimedDividend: Math.max(
							0,
							(h.unclaimedDividend ?? 0) - amount
						),
					};
				})
			);

			return { previousHoldings };
		},
		onError: (error, _variables, context) => {
			const holdingsKey = queryKeys.wallet.holdings(address);

			if (context?.previousHoldings) {
				queryClient.setQueryData(holdingsKey, context.previousHoldings);
			} else if (process.env.NODE_ENV !== 'test') {
				console.warn('[optimistic-rollback]', {
					cache_key: JSON.stringify(holdingsKey),
					action: 'reinvest_dividend',
					reason: 'snapshot_missing',
					failed_at: new Date().toISOString(),
				});
			}

			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: (_data, variables) => {
			// Clear the pending flag once the reinvestment settles.
			queryClient.setQueryData<HeldKeyPosition[]>(
				queryKeys.wallet.holdings(address),
				(old = []) =>
					old.map(h =>
						h.creatorId === variables.keyId
							? { ...h, pending: false }
							: h
					)
			);
		},
		onSettled: (_data, _error, variables) => {
			// Reinvesting converts dividends back into keys, which changes the
			// held quantity and ultimately supply/price on the marketplace.
			queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.holdings(address),
			});

			if (process.env.NODE_ENV !== 'test') {
				console.debug('[cache-invalidation]', {
					invalidated_keys: [JSON.stringify(
						queryKeys.wallet.holdings(address)
					)],
					trigger: 'reinvest_dividend',
					creator_id: variables.keyId,
					invalidated_at: new Date().toISOString(),
				});
			}
		},
	});

	return mutation;
}

export function useBatchBuyMutation(address?: string) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationKey: ['batch-buy', address],
		mutationFn: async ({ orders }: { orders: BatchOrder[] }) => {
			// In a real app this would call the on-chain `batch_buy` contract
			// function. Here we simulate latency and accept the orders payload.
			void orders;
			await new Promise<void>(resolve => window.setTimeout(resolve, 1200));
			return { success: true as const };
		},
	    onMutate: async () => {
			// Optionally optimistic updates to holdings could be applied here.
			return {};
		},
		onError: (error) => {
			if (process.env.NODE_ENV !== 'test') {
				console.debug('[batch-buy-failed]', { error });
			}
			showToast.error('Batch buy failed');
		},
		onSuccess: () => {
			// Invalidate caches that depend on market data.
			queryClient.invalidateQueries({ queryKey: ['creators'] });
			queryClient.invalidateQueries({ queryKey: ['wallet', 'holdings'] });
		},
	});

	return mutation;
}
