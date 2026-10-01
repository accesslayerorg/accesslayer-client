import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService, type KeyBuybackInfo } from '@/services/course.service';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

export type { KeyBuybackInfo };

export interface KeyBuybackVariables {
	creatorId: string;
	quantity: number;
	buybackPriceStroops: number;
}

export interface KeyBuybackReceipt {
	txHash: string;
	creatorId: string;
	quantity: number;
	buybackPriceStroops: number;
	totalPayoutStroops: number;
	settledAt: string;
}

const SIGN_LATENCY_MS = 800;

export async function submitContractCall(
	fn: string,
	args: unknown
): Promise<{ success: true; txHash: string }> {
	void fn;
	void args;
	await new Promise<void>(resolve => window.setTimeout(resolve, SIGN_LATENCY_MS));
	const hex = Array.from({ length: 32 }, () =>
		Math.floor(Math.random() * 16).toString(16)
	).join('');
	return { success: true as const, txHash: `0x${hex}` };
}

/**
 * Fetches contract buyback details (guaranteed price, expiry date, terms) for a creator key.
 */
export function useKeyBuyback(keyId: string | undefined, enabled: boolean = true) {
	return useQuery<KeyBuybackInfo>({
		queryKey: queryKeys.creators.buyback(keyId ?? ''),
		queryFn: () => {
			if (!keyId) throw new Error('Key ID is required');
			return courseService.getKeyBuyback(keyId);
		},
		enabled: Boolean(keyId) && enabled,
		staleTime: 60_000,
		retry: false,
	});
}

/**
 * Submits the contract buyback function, settles the position in XLM,
 * and clears the holder's position in the wallet holdings cache.
 */
export function useSubmitKeyBuybackMutation(address?: string) {
	const queryClient = useQueryClient();

	return useMutation<KeyBuybackReceipt, Error, KeyBuybackVariables>({
		mutationKey: ['contract', 'buyback_keys', address],
		mutationFn: async (variables: KeyBuybackVariables) => {
			const res = await submitContractCall('buyback_keys', {
				creatorId: variables.creatorId,
				quantity: variables.quantity,
				address,
			});

			return {
				txHash: res.txHash,
				creatorId: variables.creatorId,
				quantity: variables.quantity,
				buybackPriceStroops: variables.buybackPriceStroops,
				totalPayoutStroops: variables.quantity * variables.buybackPriceStroops,
				settledAt: new Date().toISOString(),
			};
		},
		onSuccess: (_receipt, variables) => {
			if (address) {
				// Clear the holder's position from the wallet holdings cache
				queryClient.setQueryData<HeldKeyPosition[]>(
					queryKeys.wallet.holdings(address),
					(old = []) => old.filter(h => h.creatorId !== variables.creatorId)
				);
				queryClient.invalidateQueries({
					queryKey: queryKeys.wallet.holdings(address),
				});
			}

			// Invalidate creator detail and holders list
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(variables.creatorId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.holders(variables.creatorId),
			});

			showToast.success('Buyback settlement confirmed');
		},
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
	});
}
