import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Signer } from '@/lib/signing/types';
import { queryKeys } from '@/lib/queryKeys';
import type {
	PermitPayload,
	PermitService,
	PermitTransferResult,
} from '@/types/permit';
import {
	buildPermitPayload,
	classifyPermitError,
	getPermitErrorMessage,
	PermitExpiredError,
	PermitUnsupportedError,
} from '@/utils/permit.utils';

export { buildPermitPayload };

export type PermitApprovalMode = 'permit' | 'allowance';

export interface UsePermitOptions {
	owner: string;
	spender: string;
	recipient: string;
	key: string;
	amount: number;
	deadline: number;
	contractId: string;
	networkPassphrase: string;
	signer: Signer | null;
	service: PermitService;
	enabled?: boolean;
	now?: () => number;
}

export interface UsePermitResult {
	mode: PermitApprovalMode;
	nonce: bigint | undefined;
	payload: PermitPayload | null;
	isLoadingNonce: boolean;
	isSigning: boolean;
	errorMessage: string | null;
	submitPermitAndTransfer: () => Promise<PermitTransferResult>;
	refreshNonce: () => Promise<void>;
	resetError: () => void;
}

/** Wallets without arbitrary-message signing always use the allowance flow. */
export function resolvePermitApprovalMode(
	service: PermitService,
	signer: Signer | null
): PermitApprovalMode {
	return service.supportsPermit() && typeof signer?.signMessage === 'function'
		? 'permit'
		: 'allowance';
}

/**
 * Fetches the holder's current permit nonce, builds the exact message shown to
 * the holder, signs it, and hands one atomic permit-plus-transfer request to
 * the contract service.
 */
export function usePermit({
	owner,
	spender,
	recipient,
	key,
	amount,
	deadline,
	contractId,
	networkPassphrase,
	signer,
	service,
	enabled = true,
	now = Date.now,
}: UsePermitOptions): UsePermitResult {
	const mode = resolvePermitApprovalMode(service, signer);
	const queryEnabled =
		enabled &&
		mode === 'permit' &&
		Boolean(owner && spender && recipient && key && contractId);

	const nonceQuery = useQuery({
		queryKey: queryKeys.permit.nonce(contractId, owner),
		queryFn: () => service.getPermitNonce(owner),
		enabled: queryEnabled,
		retry: false,
		staleTime: 0,
	});

	const payloadState = useMemo(() => {
		if (nonceQuery.data === undefined) {
			return { payload: null, error: null };
		}
		try {
			return {
				payload: buildPermitPayload({
					contractId,
					networkPassphrase,
					owner,
					spender,
					key,
					amount,
					deadline,
					nonce: nonceQuery.data,
				}),
				error: null,
			};
		} catch (error) {
			return { payload: null, error };
		}
	}, [
		amount,
		contractId,
		deadline,
		key,
		networkPassphrase,
		nonceQuery.data,
		owner,
		spender,
	]);

	const mutation = useMutation({
		mutationKey: ['permit', contractId, owner, 'submit'],
		mutationFn: async () => {
			if (mode !== 'permit' || !signer?.signMessage) {
				throw new PermitUnsupportedError();
			}
			if (!payloadState.payload) {
				throw (
					payloadState.error ??
					new Error('The permit nonce is not available yet.')
				);
			}
			if (Number(payloadState.payload.deadline) < Math.floor(now() / 1000)) {
				throw new PermitExpiredError();
			}

			const signature = await signer.signMessage(
				payloadState.payload.message
			);
			try {
				const result = await service.submitPermitAndTransfer({
					permit: payloadState.payload,
					signature,
					recipient,
				});
				await nonceQuery.refetch();
				return result;
			} catch (error) {
				if (classifyPermitError(error) === 'nonce-reused') {
					await nonceQuery.refetch();
				}
				throw error;
			}
		},
	});

	const refreshNonce = async () => {
		await nonceQuery.refetch();
	};

	const queryError = nonceQuery.error ?? payloadState.error;
	const currentError = mutation.error ?? queryError;

	return {
		mode,
		nonce: nonceQuery.data,
		payload: payloadState.payload,
		isLoadingNonce: nonceQuery.isFetching,
		isSigning: mutation.isPending,
		errorMessage: currentError ? getPermitErrorMessage(currentError) : null,
		submitPermitAndTransfer: mutation.mutateAsync,
		refreshNonce,
		resetError: mutation.reset,
	};
}
