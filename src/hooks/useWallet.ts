import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';
import { resolveBondingCurveParams } from '@/utils/portfolioValue.utils';
import { computeBuyCost } from '@/utils/bondingCurve.utils';
import { useKeyCostBasis } from '@/hooks/useKeyCostBasis';
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
	/**
	 * Slippage-tolerance bound (#872) forwarded to the on-chain contract call.
	 * Buys pass `maxPriceStroops` (reject if price rises above this); sells
	 * pass `minPriceStroops` (reject if price falls below this). Only the
	 * bound relevant to the trade direction is expected to be set.
	 */
	maxPriceStroops?: number | null;
	minPriceStroops?: number | null;
	/**
	 * Bonding-curve supply at the time of the trade. When the key's curve
	 * parameters are known this lets the cost basis of a buy be recorded as the
	 * true area under the curve (#935) rather than a flat price x quantity
	 * approximation, which overstates the basis for larger buys.
	 */
	currentSupply?: number | null;
	/** Per-key curve overrides, when the creator has a custom curve. */
	curveBasePriceStroops?: number | null;
	curveGrowthFactor?: number | null;
}

/**
 * Resolves what a buy actually cost, in stroops, for cost-basis tracking.
 *
 * Prefers the exact bonding-curve integral (what the curve charges across the
 * whole buy range) and falls back to spot price x quantity when the curve
 * cannot be evaluated from the supplied variables.
 */
export function resolveBuyCostStroops(
	trade: TradeVariables
): number | null {
	const quantity = Math.abs(trade.amount);

	if (!Number.isFinite(quantity) || quantity <= 0) {
		return null;
	}

	const curveFields = {
		currentSupply: trade.currentSupply,
		curveBasePriceStroops: trade.curveBasePriceStroops,
		curveGrowthFactor: trade.curveGrowthFactor,
	};
	const supply = curveFields.currentSupply;
	const hasCurve =
		supply != null &&
		Number.isFinite(supply) &&
		supply >= 0 &&
		curveFields.curveBasePriceStroops != null &&
		curveFields.curveBasePriceStroops > 0 &&
		curveFields.curveGrowthFactor != null &&
		curveFields.curveGrowthFactor > 0;

	if (hasCurve && supply != null) {
		return computeBuyCost(
			supply,
			quantity,
			resolveBondingCurveParams(curveFields)
		);
	}

	const priceStroops = trade.priceStroops;

	if (priceStroops == null || !Number.isFinite(priceStroops)) {
		return null;
	}

	return priceStroops * quantity;
}

/**
 * Computes the blended average purchase price for a position after a buy,
 * re-weighting the existing basis with the newly purchased keys (#935).
 */
function applyBuyToAveragePurchasePrice(
	existingAveragePurchasePriceStroops: number | null | undefined,
	existingQuantity: number,
	quantity: number,
	costStroops: number
): number | null {
	if (!Number.isFinite(quantity) || quantity <= 0) {
		return existingAveragePurchasePriceStroops ?? null;
	}

	const hasExistingBasis =
		existingAveragePurchasePriceStroops != null &&
		Number.isFinite(existingAveragePurchasePriceStroops) &&
		existingAveragePurchasePriceStroops > 0 &&
		Number.isFinite(existingQuantity) &&
		existingQuantity > 0;

	if (!hasExistingBasis || existingAveragePurchasePriceStroops == null) {
		return costStroops / quantity;
	}

	return (
		(existingAveragePurchasePriceStroops * existingQuantity + costStroops) /
		(quantity + existingQuantity)
	);
}

/**
 * Folds a confirmed trade into the wallet's persisted cost basis (#935).
 *
 * A buy adds its cost to the position's basis, re-weighting the average
 * purchase price; a sell releases the sold keys' share of the basis while
 * leaving the average entry price of the remaining keys untouched.
 */
export function recordTradeCostBasis(
	address: string,
	trade: TradeVariables
): void {
	const quantity = Math.abs(trade.amount);

	if (!Number.isFinite(quantity) || quantity <= 0) {
		return;
	}

	if (trade.amount > 0) {
		const costStroops = resolveBuyCostStroops(trade);

		if (costStroops == null || costStroops <= 0) {
			return;
		}

		useKeyCostBasis.getState().recordBuy(address, trade.creatorId, {
			quantity,
			costStroops,
		});

		return;
	}

	useKeyCostBasis.getState().recordSell(address, trade.creatorId, { quantity });
}

export function useTradeMutation(address: string) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationKey: ['trade', address],
		mutationFn: async (variables: TradeVariables) => {
			// In production this would call the on-chain contract, passing
			// `maxPriceStroops`/`minPriceStroops` as the contract's
			// `max_price`/`min_price` slippage-protection arguments so the
			// chain reverts the trade if the executed price moves against the
			// user beyond their selected tolerance (#872). The `ref` field is
			// accepted and can be used by instrumentation or contract calls.
			void variables;
			await new Promise<void>(resolve => window.setTimeout(resolve, 900));
			return { success: true as const };
		},
		onMutate: async ({
			creatorId,
			amount,
			priceStroops,
			price,
			currentSupply,
			curveBasePriceStroops,
			curveGrowthFactor,
		}: TradeVariables) => {
			const queryKey = queryKeys.wallet.holdings(address);

			await queryClient.cancelQueries({ queryKey });

			const previousHoldings =
				queryClient.getQueryData<HeldKeyPosition[]>(queryKey) ?? [];

			queryClient.setQueryData<HeldKeyPosition[]>(queryKey, (old = []) => {
				const existing = old.find(h => h.creatorId === creatorId);
				const isBuy = amount > 0;
				const buyCostStroops = isBuy
					? resolveBuyCostStroops({
							creatorId,
							amount,
							priceStroops,
							price,
							currentSupply,
							curveBasePriceStroops,
							curveGrowthFactor,
						})
					: null;

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
									// #935 — re-weight the average purchase price on the
									// way out so the row's P&L reflects this buy before
									// the mutation settles.
									averagePurchasePriceStroops:
										isBuy && buyCostStroops != null
											? applyBuyToAveragePurchasePrice(
													h.averagePurchasePriceStroops,
													h.quantity ?? 0,
													amount,
													buyCostStroops
												)
											: h.averagePurchasePriceStroops,
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
						// #935 — brand-new positions start their cost basis at the
						// price this buy actually paid.
						averagePurchasePriceStroops:
							isBuy && buyCostStroops != null
								? applyBuyToAveragePurchasePrice(null, 0, amount, buyCostStroops)
								: null,
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

			// #935 — persist the cost basis of a confirmed trade so the
			// portfolio's unrealised P&L is measured against what the wallet
			// actually paid. Recording only on success keeps a failed or
			// reverted trade out of the average purchase price.
			recordTradeCostBasis(address, variables);
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

export type SelfFreezeAction = 'freeze' | 'unfreeze';

export interface SelfFreezeVariables {
	creatorId: string;
	amount: number;
	action: SelfFreezeAction;
}

async function submitWalletContractCall(
	functionName: 'self_freeze' | 'self_unfreeze',
	args: { creatorId: string; quantity: number }
) {
	void functionName;
	void args;
	await new Promise<void>(resolve => window.setTimeout(resolve, 900));
	return { success: true as const };
}

export function useSelfFreezeMutation(address: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'self_freeze', address],
		mutationFn: async ({ creatorId, amount, action }: SelfFreezeVariables) => {
			const contractFunction = action === 'freeze' ? 'self_freeze' : 'self_unfreeze';
			return submitWalletContractCall(contractFunction, {
				creatorId,
				quantity: amount,
			});
		},
		onMutate: async ({ creatorId, amount, action }) => {
			const queryKey = queryKeys.wallet.holdings(address);
			await queryClient.cancelQueries({ queryKey });
			const previousHoldings =
				queryClient.getQueryData<HeldKeyPosition[]>(queryKey) ?? [];

			queryClient.setQueryData<HeldKeyPosition[]>(queryKey, holdings =>
				(holdings ?? []).map(holding => {
					if (holding.creatorId !== creatorId) return holding;
					const frozen = holding.frozenQuantity ?? 0;
					const liquid = holding.liquidQuantity ?? holding.quantity ?? 0;
					const delta = action === 'freeze' ? amount : -amount;
					return {
						...holding,
						frozenQuantity: frozen + delta,
						liquidQuantity: liquid - delta,
						pending: true,
					};
				})
			);

			return { previousHoldings };
		},
		onError: (error, _variables, context) => {
			if (context?.previousHoldings) {
				queryClient.setQueryData(
					queryKeys.wallet.holdings(address),
					context.previousHoldings
				);
			}
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: (_data, variables) => {
			queryClient.setQueryData<HeldKeyPosition[]>(
				queryKeys.wallet.holdings(address),
				(holdings = []) =>
					holdings.map(holding =>
						holding.creatorId === variables.creatorId
							? { ...holding, pending: false }
							: holding
					)
			);
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.holdings(address),
			});
		},
	});
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

export interface ClaimStakeVariables {
	/** The staked key being claimed, passed to the contract as `key_id`. */
	keyId: string | number;
}

/**
 * Claims a key's staked balance once its lock period has expired.
 *
 * #815 — used by `StakingPanel`'s Claim button. The on-chain wiring isn't in
 * the client yet, so this simulates signing latency and resolves; in
 * production it submits the `claim_stake` contract function with the
 * holder's `key_id` (`variables.keyId`).
 */
export function useClaimStakeMutation(address: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['claim-stake', address],
		mutationFn: async (variables: ClaimStakeVariables) => {
			void variables;
			await new Promise<void>(resolve => window.setTimeout(resolve, 900));
			return { success: true as const };
		},
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.holdings(address),
			});
			showToast.success('Stake claimed');
		},
	});
}

export interface RedeemDeprecatedKeyVariables {
	/** The deprecated creator key being redeemed. */
	creatorId: string;
	/** Quantity of keys being redeemed (the full held quantity). */
	quantity: number;
}

/**
 * Redeems a held position in a deprecated key for its current value (#871).
 * Removes the position from the holder's wallet on success.
 */
export function useRedeemDeprecatedKeyMutation(address: string) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationKey: ['redeem-deprecated-key', address],
		mutationFn: async (variables: RedeemDeprecatedKeyVariables) => {
			// In production this would call the on-chain `redeem` contract
			// function for a deprecated key. Here we simulate latency.
			void variables;
			await new Promise<void>(resolve => window.setTimeout(resolve, 900));
			return { success: true as const };
		},
		onMutate: async ({ creatorId }: RedeemDeprecatedKeyVariables) => {
			const queryKey = queryKeys.wallet.holdings(address);

			await queryClient.cancelQueries({ queryKey });

			const previousHoldings =
				queryClient.getQueryData<HeldKeyPosition[]>(queryKey) ?? [];

			queryClient.setQueryData<HeldKeyPosition[]>(queryKey, (old = []) =>
				old.map(h =>
					h.creatorId === creatorId ? { ...h, pending: true } : h
				)
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
					action: 'redeem_deprecated_key',
					reason: 'snapshot_missing',
					failed_at: new Date().toISOString(),
				});
			}

			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: (_data, variables) => {
			// Redemption removes the position entirely.
			queryClient.setQueryData<HeldKeyPosition[]>(
				queryKeys.wallet.holdings(address),
				(old = []) =>
					old.filter(h => h.creatorId !== variables.creatorId)
			);
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.holdings(address),
			});
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
