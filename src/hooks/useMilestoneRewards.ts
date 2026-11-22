import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	milestoneRewardsService,
	type KeyMilestoneRewards,
} from '@/services/milestoneRewards.service';
import { submitContractCall } from '@/hooks/useKeyBuyback';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

/** Milestones only change daily at most, so cache for 5 minutes (#1141). */
export const MILESTONE_REWARDS_STALE_TIME_MS = 5 * 60 * 1000;

export function useMilestoneRewards(wallet: string | undefined) {
	return useQuery<KeyMilestoneRewards[]>({
		queryKey: queryKeys.milestoneRewards.byWallet(wallet ?? ''),
		queryFn: () => milestoneRewardsService.getMilestoneRewards(wallet!),
		enabled: Boolean(wallet),
		staleTime: MILESTONE_REWARDS_STALE_TIME_MS,
		retry: false,
	});
}

export interface ClaimMilestoneRewardVariables {
	keyId: string;
	milestoneIndex: number;
}

export interface ClaimMilestoneRewardReceipt {
	txHash: string;
	keyId: string;
	milestoneIndex: number;
	receivedAmountStroops: number;
	claimedAt: string;
}

/**
 * Submits the `claim_milestone_reward` contract call for a specific held
 * key's milestone, then updates the cached milestone list optimistically on
 * success so the card flips to "claimed" without an extra round trip (#1141).
 */
export function useClaimMilestoneReward(wallet: string | undefined) {
	const queryClient = useQueryClient();

	return useMutation<
		ClaimMilestoneRewardReceipt,
		Error,
		ClaimMilestoneRewardVariables
	>({
		mutationKey: ['contract', 'claim_milestone_reward', wallet],
		mutationFn: async ({ keyId, milestoneIndex }) => {
			const res = await submitContractCall('claim_milestone_reward', {
				keyId,
				milestoneIndex,
				wallet,
			});

			// The mock payout scales with the milestone tier; a real backend
			// would return the authoritative amount in the transaction receipt.
			const receivedAmountStroops = (milestoneIndex + 1) * 10_000_000;

			return {
				txHash: res.txHash,
				keyId,
				milestoneIndex,
				receivedAmountStroops,
				claimedAt: new Date().toISOString(),
			};
		},
		onSuccess: receipt => {
			if (!wallet) return;

			queryClient.setQueryData<KeyMilestoneRewards[]>(
				queryKeys.milestoneRewards.byWallet(wallet),
				(old = []) =>
					old.map(key =>
						key.keyId !== receipt.keyId
							? key
							: {
									...key,
									milestones: key.milestones.map(milestone =>
										milestone.milestoneIndex !== receipt.milestoneIndex
											? milestone
											: {
													...milestone,
													claimed: true,
													receivedAmountStroops:
														receipt.receivedAmountStroops,
													claimedAt: receipt.claimedAt,
												}
									),
								}
					)
			);

			showToast.success('Milestone reward claimed');
		},
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
	});
}
