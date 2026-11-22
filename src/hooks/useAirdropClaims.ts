import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchAirdropClaims } from '@/services/airdropClaims.service';
import { airdropContractService } from '@/services/airdropContract.service';
import type { Signer } from '@/lib/signing/types';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

/**
 * Airdrop allocations and claim history for a wallet.
 *
 * The backend resolves which airdrops the wallet is eligible for based on
 * holder snapshots taken per creator key, so a single request returns both
 * unclaimed allocations and previously claimed entries.
 */
export function useAirdropClaims(wallet: string) {
	return useQuery({
		queryKey: queryKeys.airdropClaims.list(wallet),
		queryFn: () => fetchAirdropClaims(wallet),
		enabled: !!wallet,
		// Claim status flips right after a successful `claim_airdrop` call,
		// so keep the window short like other position queries.
		staleTime: 15_000,
	});
}

export interface ClaimAirdropVariables {
	/** Airdrop id being claimed, forwarded to the contract call. */
	airdropId: string;
}

/**
 * Claims a single airdrop allocation via the on-chain `claim_airdrop`
 * contract function.
 */
export function useClaimAirdropMutation(wallet: string, signer: Signer | null) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'claim_airdrop', wallet],
		mutationFn: (variables: ClaimAirdropVariables) =>
			airdropContractService.claimAirdrop({
				airdropId: variables.airdropId,
				wallet,
				signer,
			}),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			showToast.success('Airdrop claimed');
		},
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.airdropClaims.all(),
			});
		},
	});
}

export interface ClaimAllAirdropsResult {
	/** Number of airdrops successfully claimed. */
	claimed: number;
	/** Transaction hash per claimed airdrop, in submission order. */
	hashes: Array<string | null>;
}

/**
 * Claims every unclaimed airdrop across all held keys in one flow.
 *
 * Each `claim_airdrop` call is submitted sequentially so every claim gets
 * its own signature and a failure mid-way leaves earlier claims intact.
 */
export function useClaimAllAirdropsMutation(
	wallet: string,
	signer: Signer | null
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'claim_airdrop_all', wallet],
		mutationFn: async (
			variables: ClaimAirdropVariables[]
		): Promise<ClaimAllAirdropsResult> => {
			const hashes: Array<string | null> = [];

			for (const { airdropId } of variables) {
				const result = await airdropContractService.claimAirdrop({
					airdropId,
					wallet,
					signer,
				});
				hashes.push(result.hash);
			}

			return { claimed: hashes.length, hashes };
		},
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: result => {
			showToast.success(
				result.claimed === 1
					? 'Airdrop claimed'
					: `${result.claimed} airdrops claimed`
			);
		},
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.airdropClaims.all(),
			});
		},
	});
}
