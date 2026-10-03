import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

/**
 * Staking dashboard contract mutations (#917).
 *
 * Stake, unstake, and claim-reward actions for the staking dashboard page.
 * The on-chain wiring is not in the client yet, so each mutation simulates
 * signing latency and resolves. On success the staking-positions and wallet
 * holdings queries are invalidated so the dashboard reflects new state.
 */

const SIGN_LATENCY_MS = 1200;

async function submitStakingCall(fn: string, args: unknown) {
	void fn;
	void args;
	await new Promise<void>(resolve =>
		window.setTimeout(resolve, SIGN_LATENCY_MS)
	);
	return { success: true as const };
}

// ── Stake keys ──────────────────────────────────────────────────────────

export interface StakeKeysVariables {
	/** Creator key to stake. */
	keyId: string;
	/** Number of keys to stake. */
	quantity: number;
	/** Lock period in days. */
	lockPeriodDays: number;
}

export function useStakeKeysMutation(address: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'stake_keys', address],
		mutationFn: (variables: StakeKeysVariables) =>
			submitStakingCall('stake_keys', { address, ...variables }),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.stakingPositions(address),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.holdings(address),
			});
			showToast.success('Keys staked successfully');
		},
	});
}

// ── Unstake keys ────────────────────────────────────────────────────────

export interface UnstakeKeysVariables {
	/** Staking position id being unstaked. */
	positionId: string;
	/** Creator key id of the staked position. */
	keyId: string;
}

export function useUnstakeKeysMutation(address: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'unstake_keys', address],
		mutationFn: (variables: UnstakeKeysVariables) =>
			submitStakingCall('unstake_keys', { address, ...variables }),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.stakingPositions(address),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.holdings(address),
			});
			showToast.success('Keys unstaked successfully');
		},
	});
}

// ── Claim staking rewards ───────────────────────────────────────────────

export interface ClaimStakingRewardsVariables {
	/** Staking position id to claim rewards from. */
	positionId: string;
	/** Creator key id. */
	keyId: string;
}

export function useClaimStakingRewardsMutation(address: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'claim_staking_rewards', address],
		mutationFn: (variables: ClaimStakingRewardsVariables) =>
			submitStakingCall('claim_staking_rewards', {
				address,
				...variables,
			}),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.stakingPositions(address),
			});
			showToast.success('Staking rewards claimed');
		},
	});
}
