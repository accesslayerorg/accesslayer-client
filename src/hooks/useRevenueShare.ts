import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useKeyHolders } from '@/hooks/useKeyHolders';
import {
	claimRevenueShare,
	fetchRevenueShareDistributions,
} from '@/services/revenueShare.service';
import type {
	RevenueShareClaim,
	RevenueShareDistribution,
} from '@/types/revenueShare';
import {
	applyRevenueShareClaims,
	computeHolderProRataShare,
	loadRevenueShareClaims,
	mergeRevenueDistributions,
	mergeRevenueShareClaim,
	saveRevenueShareClaims,
} from '@/utils/revenueShare.utils';
import { loadCreatorDistributionHistory } from '@/utils/creatorRevenue.utils';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

export interface UseRevenueShareDistributionsResult {
	/** Distributions the holder can claim from, newest first. */
	distributions: RevenueShareDistribution[];
	isLoading: boolean;
	isError: boolean;
	/** Refetches the distributions from the server. */
	refetch: () => void;
}

/**
 * Resolves the share a holder receives for a distribution.
 *
 * The server's value wins; when it does not report one, the share is
 * estimated from the holder's key count using the same pro-rata model the
 * creator-side distribution preview uses.
 */
function useHolderShareResolver(keyId: string, wallet?: string) {
	const { holders } = useKeyHolders(keyId);

	return useCallback(
		(distribution: RevenueShareDistribution) =>
			distribution.userShare > 0
				? distribution.userShare
				: computeHolderProRataShare(
						holders,
						wallet,
						distribution.amount
					),
		[holders, wallet]
	);
}

/**
 * Loads the revenue distributions a holder can claim from (#1223).
 *
 * The server is the source of truth for the distributed totals and the claim
 * state. When it does not report the holder's own share, it is estimated from
 * the holder's key count using the same pro-rata model the creator-side
 * distribution preview uses. Distributions the creator recorded locally are
 * listed as well, and claims made in this browser are layered on top so a
 * settled claim still shows as claimed after a reload.
 */
export function useRevenueShareDistributions(
	keyId: string,
	wallet?: string
): UseRevenueShareDistributionsResult {
	const resolveShare = useHolderShareResolver(keyId, wallet);

	const { data, isLoading, isError, refetch } = useQuery({
		queryKey: queryKeys.revenueShare.distributions(keyId, wallet ?? ''),
		queryFn: async () => {
			const remote = await fetchRevenueShareDistributions(keyId, wallet);
			// Distributions the creator recorded locally are listed too, so the
			// tab works before the read endpoint is deployed.
			const local = loadCreatorDistributionHistory(keyId);
			const distributions = mergeRevenueDistributions(remote, local);
			const claims = loadRevenueShareClaims(keyId, wallet);
			return applyRevenueShareClaims(distributions, claims);
		},
		enabled: Boolean(keyId),
		staleTime: 15_000,
	});

	const distributions = useMemo(
		() =>
			(data ?? []).map(distribution => ({
				...distribution,
				userShare: resolveShare(distribution),
			})),
		[data, resolveShare]
	);

	return {
		distributions,
		isLoading,
		isError,
		refetch: () => {
			void refetch();
		},
	};
}

/**
 * Claims one distribution's pro-rata share via the `claim_revenue_share`
 * contract call.
 *
 * On success the distribution is marked as claimed in the cache (with the
 * amount received and the claim date) and the claim is persisted locally so
 * the claimed state survives a reload.
 */
export function useClaimRevenueShareMutation(
	keyId: string,
	wallet?: string
) {
	const queryClient = useQueryClient();
	const resolveShare = useHolderShareResolver(keyId, wallet);

	return useMutation({
		mutationKey: ['contract', 'claim_revenue_share', keyId, wallet ?? ''],
		mutationFn: (distributionId: string) =>
			claimRevenueShare(keyId, distributionId, wallet),
		onSuccess: (_result, distributionId) => {
			const key = queryKeys.revenueShare.distributions(keyId, wallet ?? '');
			const cached =
				queryClient.getQueryData<RevenueShareDistribution[]>(key) ?? [];
			const distribution = cached.find(
				entry => entry.id === distributionId
			);
			const receivedAmount = distribution ? resolveShare(distribution) : 0;
			const claimedAt = Date.now();

			queryClient.setQueryData<RevenueShareDistribution[]>(key, old =>
				old
					? old.map(entry =>
							entry.id === distributionId
								? { ...entry, claimed: true, receivedAmount, claimedAt }
								: entry
						)
					: old
			);

			const claims = loadRevenueShareClaims(keyId, wallet);
			saveRevenueShareClaims(
				keyId,
				wallet,
				mergeRevenueShareClaim(claims, {
					distributionId,
					receivedAmount,
					claimedAt,
				})
			);

			showToast.success(`Claimed ${formatXlmPrice(receivedAmount)}`);
		},
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
	});
}

/**
 * Claims every unclaimed distribution for a key.
 *
 * The claims are submitted one after another so each `claim_revenue_share`
 * call settles before the next one is sent, and a failure stops the run
 * instead of firing a burst of calls.
 */
export function useClaimAllRevenueShareMutation(
	keyId: string,
	wallet?: string
) {
	const queryClient = useQueryClient();
	const resolveShare = useHolderShareResolver(keyId, wallet);

	return useMutation({
		mutationKey: ['contract', 'claim_revenue_share_all', keyId, wallet ?? ''],
		mutationFn: async (
			distributionIds: string[]
		): Promise<RevenueShareClaim[]> => {
			const key = queryKeys.revenueShare.distributions(keyId, wallet ?? '');
			const cached =
				queryClient.getQueryData<RevenueShareDistribution[]>(key) ?? [];
			const shareOf = (distributionId: string) => {
				const distribution = cached.find(
					entry => entry.id === distributionId
				);
				return distribution ? resolveShare(distribution) : 0;
			};

			const claims: RevenueShareClaim[] = [];
			for (const distributionId of distributionIds) {
				await claimRevenueShare(keyId, distributionId, wallet);
				claims.push({
					distributionId,
					receivedAmount: shareOf(distributionId),
					claimedAt: Date.now(),
				});
			}
			return claims;
		},
		onSuccess: (claims: RevenueShareClaim[]) => {
			const key = queryKeys.revenueShare.distributions(keyId, wallet ?? '');
			const claimedAtById = new Map(
				claims.map(claim => [claim.distributionId, claim])
			);

			queryClient.setQueryData<RevenueShareDistribution[]>(key, old =>
				old
					? old.map(entry => {
							const claim = claimedAtById.get(entry.id);
							if (!claim) return entry;
							return {
								...entry,
								claimed: true,
								receivedAmount: claim.receivedAmount,
								claimedAt: claim.claimedAt,
							};
						})
					: old
			);

			const existing = loadRevenueShareClaims(keyId, wallet);
			saveRevenueShareClaims(
				keyId,
				wallet,
				claims.reduce(
					(acc, claim) => mergeRevenueShareClaim(acc, claim),
					existing
				)
			);

			const total = claims.reduce(
				(sum, claim) => sum + claim.receivedAmount,
				0
			);
			showToast.success(
				`Claimed ${claims.length} distribution${
					claims.length === 1 ? '' : 's'
				} · ${formatXlmPrice(total)}`
			);
		},
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
	});
}
