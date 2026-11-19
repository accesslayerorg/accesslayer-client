import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { cacheManager } from '@/utils/cache.utils';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

/**
 * Creator-facing contract calls issued from dashboard and portfolio surfaces.
 *
 * The on-chain wiring is not in this client yet, so calls simulate signing
 * latency and resolve. Exported so mutations in their own hooks submit calls
 * the same way.
 */
const SIGN_LATENCY_MS = 1200;

export async function submitCreatorContractCall(fn: string, args: unknown) {
	void fn;
	void args;
	await new Promise<void>(resolve =>
		window.setTimeout(resolve, SIGN_LATENCY_MS)
	);
	return { success: true as const };
}

const submitContractCall = submitCreatorContractCall;

export interface AuctionConfigInput {
	price: number;
	supply: number;
}

export type GraduatedCurveConfigInput = unknown[];

export function useUpdateMetadataMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'update_metadata', creatorId],
		mutationFn: (change: Record<string, unknown>) =>
			submitContractCall('update_metadata', { creatorId, ...change }),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.onChainMetadata(creatorId),
			});
			showToast.success('Profile metadata updated');
		},
	});
}

export function useConfigureAuctionMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'configure_auction', creatorId],
		mutationFn: (input: AuctionConfigInput) =>
			submitContractCall('configure_auction', { creatorId, ...input }),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			showToast.success('Auction configured');
		},
	});
}

export function useCancelAuctionMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'cancel_auction', creatorId],
		mutationFn: () => submitContractCall('cancel_auction', { creatorId }),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			showToast.success('Auction cancelled');
		},
	});
}

export function usePlaceAuctionBidMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'place_bid', creatorId],
		mutationFn: (amount: number) =>
			submitContractCall('place_bid', { creatorId, amount }),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.auctionBids(creatorId),
			});
			showToast.success('Bid placed');
		},
	});
}

export function useSetLaunchPenaltyMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'set_launch_penalty', creatorId],
		mutationFn: (penaltyBps: number) =>
			submitContractCall('set_launch_penalty', { creatorId, penaltyBps }),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			showToast.success('Launch penalty updated');
		},
	});
}

export function useSetMaxBuyQuantityMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'set_max_buy_quantity', creatorId],
		mutationFn: (maxBuyQuantity: number) =>
			submitContractCall('set_max_buy_quantity', {
				creatorId,
				maxBuyQuantity,
			}),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			showToast.success('Max buy quantity updated');
		},
	});
}

export function useSetBuyCooldownMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'set_buy_cooldown', creatorId],
		mutationFn: (cooldownLedgers: number) =>
			submitContractCall('set_buy_cooldown', { creatorId, cooldownLedgers }),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			cacheManager.invalidate(`course_${creatorId}`);
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			showToast.success('Buy cooldown updated');
		},
	});
}

export function useSetQuorumBpsMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'set_quorum_bps', creatorId],
		mutationFn: (quorumBps: number) =>
			submitContractCall('set_quorum_bps', { creatorId, quorumBps }),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			cacheManager.invalidate(`course_${creatorId}`);
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			showToast.success('Quorum threshold updated');
		},
	});
}

export function useConfigureGraduatedCurveMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'configure_graduated_curve', creatorId],
		mutationFn: (milestones: GraduatedCurveConfigInput) =>
			submitContractCall('configure_graduated_curve', {
				creatorId,
				milestones,
			}),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			showToast.success('Graduated curve configured');
		},
	});
}

export interface DeprecateKeyInput {
	buybackPrice: number;
	totalEscrow: number;
}

export function useDeprecateKeyMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'deprecate_key', creatorId],
		mutationFn: (input: DeprecateKeyInput) =>
			submitContractCall('deprecate_key', { creatorId, ...input }),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			cacheManager.invalidate(`course_${creatorId}`);
			queryClient.setQueryData(
				queryKeys.creators.detail(creatorId),
				(old: Record<string, unknown> | undefined) =>
					old ? { ...old, deprecated: true } : old
			);
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			showToast.success('Key deprecated successfully');
		},
	});
}

export function useExecuteCurveMigrationMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'execute_curve_migration', creatorId],
		mutationFn: (migrationId: string) =>
			submitContractCall('execute_curve_migration', {
				creatorId,
				migrationId,
			}),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			cacheManager.invalidate(`curve_migrations_${creatorId}`);
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.curveMigrations(creatorId),
			});
			showToast.success('Curve migration executed');
		},
	});
}

/**
 * Claims a creator's vested allocation for a key (#960).
 */
export function useClaimVestedTokensMutation(
	creatorId: string,
	wallet: string
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'claim_vested_tokens', creatorId, wallet],
		mutationFn: (amountXlm: number) =>
			submitContractCall('claim_vested_tokens', {
				creatorId,
				wallet,
				amountXlm,
			}),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.vesting(creatorId),
			});
			showToast.success('Vested tokens claimed');
		},
	});
}
