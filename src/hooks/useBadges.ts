import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { badgeContractService } from '@/services/badgeContract.service';
import type {
	SoulboundBadge,
	AwardBadgeParams,
	RevokeBadgeParams,
} from '@/types/badge.types';

export function useBadges(address?: string | null) {
	const queryClient = useQueryClient();
	const normalizedAddress = address?.trim() || '';

	const query = useQuery<SoulboundBadge[]>({
		queryKey: queryKeys.wallet.soulboundBadges(normalizedAddress),
		queryFn: () => badgeContractService.badges_of(normalizedAddress),
		enabled: Boolean(normalizedAddress),
	});

	const awardMutation = useMutation({
		mutationFn: async ({
			issuer,
			params,
		}: {
			issuer: string;
			params: AwardBadgeParams;
		}) => {
			return badgeContractService.award_badge(issuer, params);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.soulboundBadges(variables.params.recipient.trim()),
			});
		},
	});

	const revokeMutation = useMutation({
		mutationFn: async ({
			issuer,
			params,
		}: {
			issuer: string;
			params: RevokeBadgeParams;
		}) => {
			return badgeContractService.revoke_badge(issuer, params);
		},
		onSuccess: () => {
			if (normalizedAddress) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.wallet.soulboundBadges(normalizedAddress),
				});
			}
		},
	});

	const renounceMutation = useMutation({
		mutationFn: async ({
			owner,
			badgeId,
		}: {
			owner: string;
			badgeId: string;
		}) => {
			return badgeContractService.renounce_badge(owner, badgeId);
		},
		onSuccess: () => {
			if (normalizedAddress) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.wallet.soulboundBadges(normalizedAddress),
				});
			}
		},
	});

	return {
		badges: query.data ?? [],
		isLoading: query.isLoading,
		isError: query.isError,
		error: query.error,
		refetch: query.refetch,
		awardBadge: (issuer: string, params: AwardBadgeParams) =>
			awardMutation.mutateAsync({ issuer, params }),
		revokeBadge: (issuer: string, params: RevokeBadgeParams) =>
			revokeMutation.mutateAsync({ issuer, params }),
		renounceBadge: (owner: string, badgeId: string) =>
			renounceMutation.mutateAsync({ owner, badgeId }),
		isAwarding: awardMutation.isPending,
		isRevoking: revokeMutation.isPending,
		isRenouncing: renounceMutation.isPending,
	};
}
