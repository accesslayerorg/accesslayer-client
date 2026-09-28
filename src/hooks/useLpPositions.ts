import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { SigningPipelineError } from '@/lib/signing/errors';
import type { Signer } from '@/lib/signing/types';
import { buildStellarExpertTxUrl } from '@/constants/stellar';
import { env } from '@/utils/env.utils';
import showToast from '@/utils/toast.util';
import {
	isUserRejection,
	WALLET_ERROR_COPY,
} from '@/utils/errorHandling.utils';
import {
	describeLpContractErrorCode,
	extractContractErrorCode,
	formatLpAmount,
	resolveLpLockState,
	validateLpAmountInput,
} from '@/utils/lpPositions.utils';
import {
	fetchLpPool,
	fetchLpPositions,
	type LpPosition,
} from '@/services/lpPositions.service';
import {
	LpContractError,
	lpContractService,
	type LpTransactionResult,
} from '@/services/lpContract.service';
import { stellarAccountService } from '@/services/stellarAccount.service';

/**
 * LP position data and actions for the portfolio Liquidity tab (#1030).
 *
 * Reads: positions and pool stats from the LP API (accesslayer-server #980),
 * spendable XLM from Soroban RPC.
 * Writes: `add_liquidity` / `claim_lp_rewards` / `remove_liquidity` on the
 * Creator Keys contract through `lpContractService` and the connected
 * Stellar `Signer`.
 *
 * Every write re-checks fresh state before the wallet prompt and invalidates
 * the affected queries once the network confirms it. Nothing is optimistically
 * subtracted: the UI shows the refetched values, never an assumed result.
 */

/** Rewards accrue on every trade, so keep positions reasonably fresh. */
const LP_POSITIONS_STALE_MS = 15_000;
const LP_POSITIONS_REFETCH_MS = 30_000;

export function useLpPositions(wallet: string | undefined) {
	return useQuery({
		queryKey: queryKeys.lp.positions(wallet ?? ''),
		queryFn: () => fetchLpPositions(wallet!),
		enabled: Boolean(wallet),
		staleTime: LP_POSITIONS_STALE_MS,
		refetchInterval: LP_POSITIONS_REFETCH_MS,
	});
}

export function useLpPool(keyId: string | undefined, enabled = true) {
	return useQuery({
		queryKey: queryKeys.lp.pool(keyId ?? ''),
		queryFn: () => fetchLpPool(keyId!),
		enabled: Boolean(keyId) && enabled,
		staleTime: LP_POSITIONS_STALE_MS,
	});
}

export function useSpendableXlmBalance(
	address: string | undefined,
	enabled = true
) {
	return useQuery({
		queryKey: queryKeys.wallet.xlmBalance(address ?? ''),
		queryFn: () => stellarAccountService.getSpendableXlmStroops(address!),
		enabled: Boolean(address) && enabled,
		staleTime: 10_000,
	});
}

/** Maps any LP transaction failure to the message shown to the user. */
export function describeLpTransactionError(error: unknown): string {
	if (error instanceof LpContractError) return error.message;
	if (error instanceof SigningPipelineError) {
		return error.type === 'UserRejected'
			? 'Transaction cancelled in your wallet.'
			: error.hint;
	}
	if (isUserRejection(error)) return 'Transaction cancelled in your wallet.';
	const message = error instanceof Error ? error.message : String(error ?? '');
	const code = extractContractErrorCode(message);
	if (code !== null) return describeLpContractErrorCode(code);
	return WALLET_ERROR_COPY.GENERIC_TRANSACTION_FAILED;
}

interface LpActionContext {
	/** Wallet whose positions are shown; must be the signer's address. */
	wallet: string | undefined;
	signer: Signer | null;
}

function requireSigner({ wallet, signer }: LpActionContext) {
	if (!wallet || !signer) {
		throw new LpContractError(
			'INVALID_INPUT',
			'Connect a Stellar wallet to manage liquidity.'
		);
	}
	return { wallet, signer };
}

function explorerUrl(hash: string) {
	return buildStellarExpertTxUrl(hash, env.VITE_STELLAR_NETWORK);
}

function useInvalidateLpState(wallet: string | undefined) {
	const queryClient = useQueryClient();
	return (keyId: string) =>
		Promise.all([
			queryClient.invalidateQueries({
				queryKey: queryKeys.lp.positions(wallet ?? ''),
			}),
			queryClient.invalidateQueries({ queryKey: queryKeys.lp.pool(keyId) }),
			queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.xlmBalance(wallet ?? ''),
			}),
		]);
}

export interface AddLiquidityVariables {
	keyId: string;
	/** Raw input; re-validated against a fresh balance before signing. */
	amountInput: string;
}

export function useAddLiquidity(context: LpActionContext) {
	const invalidate = useInvalidateLpState(context.wallet);

	return useMutation<
		LpTransactionResult<bigint>,
		Error,
		AddLiquidityVariables
	>({
		mutationKey: ['lp', 'add', context.wallet],
		mutationFn: async ({ keyId, amountInput }) => {
			const { wallet, signer } = requireSigner(context);
			// The balance may have moved since the modal opened; validate
			// against a fresh read, not the value on screen.
			const available =
				await stellarAccountService.getSpendableXlmStroops(wallet);
			const validation = validateLpAmountInput(amountInput, {
				availableStroops: available,
			});
			if (!validation.ok) {
				throw new LpContractError('INVALID_INPUT', validation.message);
			}
			return lpContractService.addLiquidity({
				keyId,
				provider: wallet,
				amountStroops: validation.stroops,
				signer,
			});
		},
		onSuccess: async (result, { keyId }) => {
			await invalidate(keyId);
			showToast.transactionSuccess(
				'Liquidity added',
				`Your new position #${result.value.toString()} is confirmed on-chain.`,
				result.hash,
				explorerUrl(result.hash)
			);
		},
		onError: error => {
			showToast.error(describeLpTransactionError(error));
		},
	});
}

export interface LpPositionActionVariables {
	lpId: string;
	keyId: string;
}

/**
 * True when the contract disagreed with what the list showed (nothing to
 * claim, position closed, ...). The displayed data is stale, so re-sync it
 * instead of waiting for the next poll.
 */
function isStaleDataRejection(error: unknown): boolean {
	return (
		error instanceof LpContractError &&
		(error.code === 'NOTHING_TO_CLAIM' || error.code === 'CONTRACT_REJECTED')
	);
}

export function useClaimLpRewards(context: LpActionContext) {
	const queryClient = useQueryClient();
	const invalidate = useInvalidateLpState(context.wallet);

	return useMutation<
		LpTransactionResult<bigint>,
		Error,
		LpPositionActionVariables
	>({
		mutationKey: ['lp', 'claim', context.wallet],
		mutationFn: ({ lpId }) => {
			const { wallet, signer } = requireSigner(context);
			return lpContractService.claimRewards({
				lpId,
				provider: wallet,
				signer,
			});
		},
		onSuccess: async (result, { keyId }) => {
			await invalidate(keyId);
			showToast.transactionSuccess(
				'Rewards claimed',
				`${formatLpAmount(result.value)} was sent to your wallet.`,
				result.hash,
				explorerUrl(result.hash)
			);
		},
		onError: error => {
			showToast.error(describeLpTransactionError(error));
			if (isStaleDataRejection(error)) {
				void queryClient.invalidateQueries({
					queryKey: queryKeys.lp.positions(context.wallet ?? ''),
				});
			}
		},
	});
}

/**
 * Confirms from freshly fetched positions that the position still exists and
 * is unlocked. Guards against the list on screen being stale (e.g. the lock
 * was extended, or the position was closed from another tab). The contract
 * still makes the final decision when the transaction is simulated.
 */
export function assertPositionRemovable(
	positions: readonly LpPosition[],
	lpId: string,
	nowMs: number = Date.now()
): LpPosition {
	const position = positions.find(candidate => candidate.lpId === lpId);
	if (!position) {
		throw new LpContractError(
			'INVALID_INPUT',
			'This liquidity position is no longer active.'
		);
	}
	const lock = resolveLpLockState(position.lock, nowMs);
	if (!lock.canRemove) {
		throw new LpContractError(
			'INVALID_INPUT',
			lock.status === 'invalid'
				? 'The lock period for this position could not be verified.'
				: 'This position is still locked.'
		);
	}
	return position;
}

export function useRemoveLiquidity(context: LpActionContext) {
	const queryClient = useQueryClient();
	const invalidate = useInvalidateLpState(context.wallet);

	return useMutation<
		LpTransactionResult<bigint>,
		Error,
		LpPositionActionVariables
	>({
		mutationKey: ['lp', 'remove', context.wallet],
		mutationFn: async ({ lpId }) => {
			const { wallet, signer } = requireSigner(context);
			// fetchQuery (not a bare fetch) so the fresh lock state also lands
			// in the cache and the list re-renders with it if we bail out.
			const positions = await queryClient.fetchQuery({
				queryKey: queryKeys.lp.positions(wallet),
				queryFn: () => fetchLpPositions(wallet),
				staleTime: 0,
			});
			assertPositionRemovable(positions, lpId);
			return lpContractService.removeLiquidity({
				lpId,
				provider: wallet,
				signer,
			});
		},
		onSuccess: async (result, { keyId }) => {
			await invalidate(keyId);
			showToast.transactionSuccess(
				'Liquidity removed',
				`${formatLpAmount(result.value)} (principal + rewards) was returned to your wallet.`,
				result.hash,
				explorerUrl(result.hash)
			);
		},
		onError: error => {
			showToast.error(describeLpTransactionError(error));
			if (isStaleDataRejection(error)) {
				void queryClient.invalidateQueries({
					queryKey: queryKeys.lp.positions(context.wallet ?? ''),
				});
			}
		},
	});
}
