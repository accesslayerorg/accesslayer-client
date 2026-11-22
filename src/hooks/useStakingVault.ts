import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	fetchVaultStakes,
	submitStakeKeys,
	submitUnstakeKeys,
	type StakeVaultVariables,
	type UnstakeVaultVariables,
} from '@/services/stakingVault.service';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Active vault stakes for a wallet on a specific creator key (#1017).
 *
 * Polls GET /keys/:keyId/vault-stakes/:wallet so the staking vault panel
 * can render lock status, countdown, accrued rewards, and the unstake CTA
 * for every position the wallet currently holds in the vault.
 */
export function useVaultStakes(wallet: string, keyId: string) {
	return useQuery({
		queryKey: queryKeys.stakingVault.stakes(wallet, keyId),
		queryFn: () => fetchVaultStakes(keyId, wallet),
		enabled: Boolean(wallet) && Boolean(keyId),
		staleTime: 30_000,
		retry: false,
	});
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Stakes a chosen quantity of creator keys for a selected lock period.
 * On success invalidates the vault stakes and wallet holdings caches.
 */
export function useStakeVaultMutation(wallet: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['staking-vault', 'stake', wallet],
		mutationFn: (variables: StakeVaultVariables) =>
			submitStakeKeys(variables),
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.stakingVault.stakes(wallet, variables.keyId),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.holdings(wallet),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.stakingPositions(wallet),
			});
			showToast.success('Keys staked successfully');
		},
		onError: (error: unknown) => {
			showToast.error(getSignatureErrorMessage(error));
		},
	});
}

/**
 * Unstakes a vault position after its lock period has expired.
 * On success invalidates vault stakes and wallet holdings caches.
 */
export function useUnstakeVaultMutation(wallet: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['staking-vault', 'unstake', wallet],
		mutationFn: (variables: UnstakeVaultVariables) =>
			submitUnstakeKeys(variables),
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.stakingVault.stakes(wallet, variables.keyId),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.holdings(wallet),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.stakingPositions(wallet),
			});
			showToast.success('Stake withdrawn successfully');
		},
		onError: (error: unknown) => {
			showToast.error(getSignatureErrorMessage(error));
		},
	});
}
