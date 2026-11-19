import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { tipService } from '@/services/tip.service';
import { creatorKeysContractService } from '@/services/creatorKeysContract.service';
import { submitCreatorContractCall } from '@/hooks/useCreatorContractActions';
import { showTipSentToast } from '@/utils/tipToast';
import { calculateTipBreakdown } from '@/utils/tip.utils';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import showToast from '@/utils/toast.util';
import type { Tip } from '@/types/tip.types';

export interface SendTipArgs {
	amount: number;
	message?: string;
}

export interface UseSendTipOptions {
	creatorName?: string;
	tipper?: string;
}

/**
 * Hook to retrieve the recent tips for a given creator key.
 */
export function useRecentTips(creatorId: string) {
	return useQuery({
		queryKey: queryKeys.creators.tips(creatorId),
		queryFn: () => tipService.getRecentTips(creatorId),
		enabled: Boolean(creatorId),
		staleTime: 15_000,
	});
}

/**
 * Mutation hook to send a direct tip to a creator.
 *
 * Pins the optional message to IPFS to produce an IPFS message hash,
 * invokes the `send_tip` contract call, updates the recent tips cache,
 * and fires the TipSent confirmation toast.
 */
export function useSendTipMutation(creatorId: string, options?: UseSendTipOptions) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'send_tip', creatorId],
		mutationFn: async ({ amount, message }: SendTipArgs) => {
			const trimmedMessage = message?.trim();
			// 1. Upload message to IPFS if provided
			const messageHash = trimmedMessage
				? await tipService.uploadTipMessage(trimmedMessage)
				: '';

			// 2. Submit contract call
			const contractRes = await creatorKeysContractService.send_tip({
				creatorId,
				amount,
				messageHash: messageHash || undefined,
			});

			await submitCreatorContractCall('send_tip', {
				creatorId,
				amount,
				messageHash: messageHash || undefined,
			});

			// 3. Compute breakdown
			const { fee, netAmount } = calculateTipBreakdown(amount);

			const newTip: Tip = {
				id: `tip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
				creatorId,
				tipper: options?.tipper || 'Anonymous',
				amount,
				fee,
				netAmount,
				message: trimmedMessage || undefined,
				messageHash: messageHash || undefined,
				timestamp: Date.now(),
				txHash: contractRes?.hash || `tx_${Date.now()}`,
			};

			// 4. Record into in-memory store
			tipService.recordTip(newTip);

			return newTip;
		},
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: (newTip: Tip) => {
			// Invalidate tips query so the feed reflects the new tip immediately
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.tips(creatorId),
			});

			// Fire TipSent toast confirmation (#acceptance criteria)
			showTipSentToast({
				tipper: newTip.tipper,
				creatorName: options?.creatorName || 'Creator',
				amount: newTip.amount,
				netAmount: newTip.netAmount,
				fee: newTip.fee,
				message: newTip.message,
				txHash: newTip.txHash,
			});
		},
	});
}
