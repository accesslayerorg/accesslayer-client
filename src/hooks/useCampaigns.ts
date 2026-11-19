import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { Signer } from '@/lib/signing/types';
import { campaignContractService } from '@/services/campaignContract.service';
import { campaignsService } from '@/services/campaigns.service';
import type { Campaign } from '@/utils/campaign.utils';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import showToast from '@/utils/toast.util';

// Campaign progress only moves on trades, so a minute keeps it fresh without
// competing with the discovery page's own 60s refresh.
const CAMPAIGNS_POLL_INTERVAL_MS = 60_000;

/** Active seasonal campaigns, scoped to the connected wallet's progress (#1226). */
export function useActiveCampaigns(wallet: string | undefined) {
	return useQuery({
		queryKey: queryKeys.creators.discovery.campaigns(wallet),
		queryFn: () => campaignsService.getActiveCampaigns(wallet),
		refetchInterval: CAMPAIGNS_POLL_INTERVAL_MS,
	});
}

/** Every seasonal campaign — upcoming, active and ended — for the campaigns page (#1204). */
export function useCampaigns(wallet: string | undefined) {
	return useQuery({
		queryKey: queryKeys.campaigns.list(wallet),
		queryFn: () => campaignsService.getCampaigns(wallet),
		refetchInterval: CAMPAIGNS_POLL_INTERVAL_MS,
	});
}

/** Claims an ended campaign's reward via the on-chain `claim_campaign_reward` call (#1204). */
export function useClaimCampaignRewardMutation(
	wallet: string,
	signer: Signer | null
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'claim_campaign_reward', wallet],
		mutationFn: (campaignId: string) =>
			campaignContractService.claimCampaignReward({
				campaignId,
				wallet,
				signer,
			}),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: (_result, campaignId) => {
			// Show the Claimed badge straight away; the refetch below confirms it.
			queryClient.setQueryData<Campaign[]>(
				queryKeys.campaigns.list(wallet),
				campaigns =>
					campaigns?.map(campaign =>
						campaign.id === campaignId ? { ...campaign, claimed: true } : campaign
					)
			);
			showToast.success('Campaign reward claimed');
		},
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.campaigns.all(),
			});
		},
	});
}
