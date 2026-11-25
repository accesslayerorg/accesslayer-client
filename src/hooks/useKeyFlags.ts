import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	courseService,
	type KeyFlag,
	type KeyFlagReasonCode,
	type KeyFlagReceipt,
	type KeyFlagResolution,
	type KeyFlagsStatus,
} from '@/services/course.service';
import showToast from '@/utils/toast.util';

export type {
	KeyFlag,
	KeyFlagReasonCode,
	KeyFlagReceipt,
	KeyFlagResolution,
	KeyFlagsStatus,
};

/** How often aggregate flag state is refreshed in milliseconds (#1386). */
export const KEY_FLAGS_REFRESH_INTERVAL_MS = 30_000;

export const ALREADY_FLAGGED_MESSAGE =
	'You have already flagged this key. Only one flag is allowed per wallet.';

export interface FlagKeyInput {
	reasonCode: KeyFlagReasonCode;
	stakeStroops: number;
}

export interface KeyFlagsState {
	/** Raw aggregate status, `null` while loading or when unsupported. */
	status: KeyFlagsStatus | null;
	flagCount: number;
	threshold: number;
	autoFrozen: boolean;
	reviewStatus: string | null;
	frozenAt: string | null;
	/** Stake required to submit a flag, in stroops. */
	requiredStakeStroops: number;
	/** This wallet's existing flag, when it already flagged the key. */
	userFlag: KeyFlag | null;
	/** Resolution of this wallet's flag, when the review has completed. */
	resolution: KeyFlagResolution | null;
	isLoading: boolean;
	isError: boolean;
	refetch: () => void;
}

/**
 * Stake-weighted flagging state for a creator key (#1386).
 *
 * Returns the current flag count, the auto-freeze threshold, whether the key is
 * frozen for review, and the authenticated wallet's own flag so a second flag
 * can be blocked in the UI. `autoFrozen` falls back to `flagCount >= threshold`
 * when the backend omits the explicit flag.
 */
export function useKeyFlags(
	keyId: string | undefined,
	walletAddress?: string
): KeyFlagsState {
	const query = useQuery<KeyFlagsStatus | null>({
		queryKey: queryKeys.creators.keyFlags(keyId ?? ''),
		queryFn: () => courseService.getKeyFlags(keyId!, walletAddress),
		enabled: Boolean(keyId),
		staleTime: KEY_FLAGS_REFRESH_INTERVAL_MS,
		retry: false,
	});

	const status = query.data ?? null;
	const flagCount = status?.flagCount ?? 0;
	const threshold = status?.threshold ?? 0;
	const userFlag = status?.userFlag ?? null;

	return {
		status,
		flagCount,
		threshold,
		autoFrozen:
			Boolean(status?.autoFrozen) ||
			(threshold > 0 && flagCount >= threshold),
		reviewStatus: status?.reviewStatus ?? null,
		frozenAt: status?.frozenAt ?? null,
		requiredStakeStroops: status?.requiredStakeStroops ?? 0,
		userFlag,
		resolution: userFlag?.resolution ?? null,
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: query.refetch,
	};
}

/**
 * Submits a flag and locks the stake on-chain (#1386).
 *
 * A second flag from the same wallet is rejected before the request is sent,
 * using the cached status, so the UI cannot double-lock a stake. On success the
 * cached status is updated in place: the flag count increments and the key is
 * marked frozen as soon as the threshold is reached.
 */
export function useFlagKeyMutation(keyId: string, walletAddress?: string) {
	const queryClient = useQueryClient();
	const flagsQueryKey = queryKeys.creators.keyFlags(keyId);

	return useMutation<KeyFlagReceipt, Error, FlagKeyInput>({
		mutationKey: ['keys', keyId, 'flag', walletAddress ?? 'anonymous'],
		mutationFn: async input => {
			if (!keyId) {
				throw new Error('Key ID is required to flag a key.');
			}
			if (!walletAddress) {
				throw new Error('Connect your wallet to flag this key.');
			}
			if (!Number.isFinite(input.stakeStroops) || input.stakeStroops <= 0) {
				throw new Error('A stake is required to flag this key.');
			}

			const cached = queryClient.getQueryData<KeyFlagsStatus | null>(
				flagsQueryKey
			);
			if (cached?.userFlag) {
				throw new Error(ALREADY_FLAGGED_MESSAGE);
			}

			return courseService.flagKey(keyId, {
				reasonCode: input.reasonCode,
				stakeStroops: input.stakeStroops,
				walletAddress,
			});
		},
		onSuccess: receipt => {
			queryClient.setQueryData<KeyFlagsStatus | null>(
				flagsQueryKey,
				(old = null) => {
					const base: KeyFlagsStatus = old ?? {
						keyId,
						flagCount: 0,
						threshold: 0,
						autoFrozen: false,
						userFlag: null,
					};
					// Never overwrite an existing flag: one flag per wallet.
					if (base.userFlag) return base;

					const flagCount = base.flagCount + 1;
					return {
						...base,
						flagCount,
						autoFrozen:
							base.autoFrozen ||
							(base.threshold > 0 && flagCount >= base.threshold),
						userFlag: {
							id: receipt.txHash,
							keyId,
							walletAddress: receipt.walletAddress,
							reasonCode: receipt.reasonCode,
							stakeStroops: receipt.stakeStroops,
							createdAt: receipt.createdAt,
							resolution: null,
						},
					};
				}
			);
			// Keep the cached count authoritative for this render, but refetch
			// on the next mount so the server's aggregate wins.
			void queryClient.invalidateQueries({
				queryKey: flagsQueryKey,
				refetchType: 'none',
			});
			showToast.success(
				'Flag submitted. Your stake is locked until the review completes.'
			);
		},
		onError: error => {
			showToast.error(error.message || 'Failed to flag this key');
		},
	});
}
