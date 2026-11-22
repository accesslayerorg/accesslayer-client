import { useCallback, useEffect, useState } from 'react';
import {
	useInfiniteQuery,
	useMutation,
	useQueryClient,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import { useWalletHoldings } from '@/hooks/useWallet';
import { fetchProtocolRevenuePage } from '@/services/stakerRevenue.service';
import {
	buildMockTransactionHash,
	computeTotalClaimable,
	loadClaimHistory,
	saveClaimHistory,
	type RevenueClaimRecord,
} from '@/utils/protocolRevenue.utils';

export type { RevenueClaimRecord };

/**
 * Fetches GET /staker/:wallet/protocol-revenue with cursor pagination.
 * Appends distribution records per page and provides `fetchNextPage`.
 */
export function useStakerProtocolRevenue(wallet: string) {
	return useInfiniteQuery({
		queryKey: queryKeys.staker.protocolRevenue(wallet),
		queryFn: ({ pageParam }) =>
			fetchProtocolRevenuePage(
				wallet,
				pageParam as string | null | undefined
			),
		initialPageParam: null as string | null,
		getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
		enabled: !!wallet,
	});
}

/**
 * Claimable revenue positions for a staker (#920).
 * Wraps the shared holdings cache so claimable amounts stay consistent
 * with the portfolio (`HeldKeyPosition.unclaimedDividend` in XLM).
 */
export function useClaimableRevenue(address: string) {
	const holdingsQuery = useWalletHoldings(address);
	const positions = holdingsQuery.data ?? [];
	const claimableByPosition = positions.map(position => ({
		position,
		claimable: Math.max(0, position.unclaimedDividend ?? 0),
	}));
	const totalClaimable = computeTotalClaimable(
		claimableByPosition.map(entry => entry.claimable)
	);

	return { ...holdingsQuery, positions, claimableByPosition, totalClaimable };
}

/**
 * Simulated claim history persisted per wallet in localStorage
 * (`accesslayer:claim_history:${address}`) since no backend endpoint
 * exists yet. Survives page refreshes.
 */
export function useClaimHistory(address: string) {
	const [history, setHistory] = useState<RevenueClaimRecord[]>(() =>
		loadClaimHistory(address)
	);

	useEffect(() => {
		setHistory(loadClaimHistory(address));
	}, [address]);

	const appendHistory = useCallback(
		(records: RevenueClaimRecord[]) => {
			if (records.length === 0) return;
			setHistory(previous => {
				const next = [...records, ...previous].sort(
					(a, b) => b.timestamp - a.timestamp
				);
				saveClaimHistory(address, next);
				return next;
			});
		},
		[address]
	);

	return { history, appendHistory };
}

export interface ClaimRevenueVariables {
	creatorId: string;
	creatorName?: string;
	amount: number;
}

export interface ClaimAllRevenueVariables {
	claims: ClaimRevenueVariables[];
}

export interface ClaimRevenueResult {
	success: true;
	transactionHash: string;
	claimedAt: number;
	claimedAmount: number;
	claimedCount: number;
}

function toClaimRecords(
	variables: ClaimRevenueVariables[] | ClaimAllRevenueVariables,
	transactionHash: string,
	claimedAt: number
): RevenueClaimRecord[] {
	const claims = Array.isArray(variables) ? variables : variables.claims;
	return claims
		.filter(claim => claim.amount > 0)
		.map(claim => ({
			id: `${transactionHash}-${claim.creatorId}`,
			amount: claim.amount,
			timestamp: claimedAt,
			transactionHash,
			creatorId: claim.creatorId,
			creatorName: claim.creatorName,
		}));
}

async function submitBatchedClaimRevenue(
	variables: ClaimRevenueVariables[] | ClaimAllRevenueVariables
): Promise<Omit<ClaimRevenueResult, 'claimedAmount' | 'claimedCount'>> {
	// Production submits a batched `claim_revenue` contract call with every
	// position's `key_id`. No contract wiring exists yet, so simulate latency.
	void variables;
	await new Promise<void>(resolve => window.setTimeout(resolve, 900));
	return {
		success: true as const,
		transactionHash: buildMockTransactionHash(),
		claimedAt: Date.now(),
	};
}

/**
 * Claims a single position's revenue with an optimistic zero-out of its
 * `unclaimedDividend` balance.
 */
export function useClaimRevenueMutation(
	address: string,
	options?: { onAppended?: (records: RevenueClaimRecord[]) => void }
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['claim-revenue', address],
		mutationFn: async (
			variables: ClaimRevenueVariables
		): Promise<ClaimRevenueResult> => {
			const submitted = await submitBatchedClaimRevenue([variables]);
			return {
				...submitted,
				claimedAmount: variables.amount,
				claimedCount: 1,
			};
		},
		onMutate: async (variables: ClaimRevenueVariables) => {
			const queryKey = queryKeys.wallet.holdings(address);
			await queryClient.cancelQueries({ queryKey });
			const previousHoldings =
				queryClient.getQueryData<HeldKeyPosition[]>(queryKey) ?? [];
			queryClient.setQueryData<HeldKeyPosition[]>(queryKey, (old = []) =>
				old.map(holding =>
					holding.creatorId === variables.creatorId
						? { ...holding, unclaimedDividend: 0, pending: true }
						: holding
				)
			);
			return { previousHoldings };
		},
		onError: (error, _variables, context) => {
			const typedContext = context as
				{ previousHoldings?: HeldKeyPosition[] } | undefined;
			if (typedContext?.previousHoldings) {
				queryClient.setQueryData(
					queryKeys.wallet.holdings(address),
					typedContext.previousHoldings
				);
			}
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: (result, variables) => {
			const records = toClaimRecords(
				[variables],
				result.transactionHash,
				result.claimedAt
			);
			options?.onAppended?.(records);
			queryClient.setQueryData<HeldKeyPosition[]>(
				queryKeys.wallet.holdings(address),
				(old = []) =>
					old.map(holding =>
						holding.creatorId === variables.creatorId
							? { ...holding, pending: false }
							: holding
					)
			);
			showToast.success('Revenue claimed');
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.holdings(address),
			});
		},
	});
}

/**
 * Batch-claims revenue across all positions in one contract call with an
 * optimistic UI update (all claimable balances zeroed immediately).
 */
export function useClaimAllRevenueMutation(
	address: string,
	options?: { onAppended?: (records: RevenueClaimRecord[]) => void }
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['claim-all-revenue', address],
		mutationFn: async (
			variables: ClaimAllRevenueVariables
		): Promise<ClaimRevenueResult> => {
			const submitted = await submitBatchedClaimRevenue(variables);
			return {
				...submitted,
				claimedAmount: computeTotalClaimable(
					variables.claims.map(claim => claim.amount)
				),
				claimedCount: variables.claims.length,
			};
		},
		onMutate: async (variables: ClaimAllRevenueVariables) => {
			const queryKey = queryKeys.wallet.holdings(address);
			await queryClient.cancelQueries({ queryKey });
			const previousHoldings =
				queryClient.getQueryData<HeldKeyPosition[]>(queryKey) ?? [];
			const claimedIds = new Set(
				variables.claims.map(claim => claim.creatorId)
			);
			queryClient.setQueryData<HeldKeyPosition[]>(queryKey, (old = []) =>
				old.map(holding =>
					claimedIds.has(holding.creatorId)
						? { ...holding, unclaimedDividend: 0, pending: true }
						: holding
				)
			);
			return { previousHoldings };
		},
		onError: (error, _variables, context) => {
			const typedContext = context as
				{ previousHoldings?: HeldKeyPosition[] } | undefined;
			if (typedContext?.previousHoldings) {
				queryClient.setQueryData(
					queryKeys.wallet.holdings(address),
					typedContext.previousHoldings
				);
			}
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: (result, variables) => {
			const records = toClaimRecords(
				variables,
				result.transactionHash,
				result.claimedAt
			);
			options?.onAppended?.(records);
			queryClient.setQueryData<HeldKeyPosition[]>(
				queryKeys.wallet.holdings(address),
				(old = []) => old.map(holding => ({ ...holding, pending: false }))
			);
			showToast.success(
				`Revenue claimed across ${result.claimedCount} position${result.claimedCount === 1 ? '' : 's'}`
			);
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.holdings(address),
			});
		},
	});
}
