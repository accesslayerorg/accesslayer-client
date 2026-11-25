import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { Signer } from '@/lib/signing/types';
import {
	fetchAvailableRentals,
	fetchWalletRentals,
} from '@/services/keyRental.service';
import {
	isKeyRentalContractConfigured,
	keyRentalContractService,
} from '@/services/keyRentalContract.service';
import type { ListRentalInput, RentKeyInput } from '@/types/keyRental';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

/**
 * Whether rentals are live: a rental contract is configured (#1360). While
 * false every rental query stays idle and every action stays disabled.
 */
export function useKeyRentalsEnabled(): boolean {
	return isKeyRentalContractConfigured();
}

/** Listings available to rent, shown on the rental market. */
export function useAvailableRentals() {
	const enabled = useKeyRentalsEnabled();
	return useQuery({
		queryKey: queryKeys.keyRentals.available(),
		queryFn: fetchAvailableRentals,
		enabled,
		staleTime: 15_000,
	});
}

/** Every rental the wallet takes part in, as owner or renter. */
export function useWalletRentals(wallet: string | null | undefined) {
	const enabled = useKeyRentalsEnabled() && Boolean(wallet);
	return useQuery({
		queryKey: queryKeys.keyRentals.wallet(wallet ?? ''),
		queryFn: () => fetchWalletRentals(wallet ?? ''),
		enabled,
		staleTime: 15_000,
	});
}

/**
 * Whether `wallet` currently rents `keyId`, read from the contract's
 * `is_active_renter` view. Used by gated content to grant rental access.
 */
export function useIsActiveRenter(
	keyId: string,
	wallet: string | null | undefined
) {
	const enabled = useKeyRentalsEnabled() && Boolean(keyId && wallet);
	return useQuery({
		queryKey: queryKeys.keyRentals.activeRenter(keyId, wallet ?? ''),
		queryFn: () =>
			keyRentalContractService.isActiveRenter(wallet ?? '', keyId),
		enabled,
		staleTime: 30_000,
		retry: false,
	});
}

function useInvalidateRentals() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({
			queryKey: queryKeys.keyRentals.all(),
		});
		void queryClient.invalidateQueries({ queryKey: ['wallet'] });
	};
}

/** Lists keys for rent via `list_rental`, escrowing them in the contract. */
export function useListRentalMutation(wallet: string, signer: Signer | null) {
	const invalidate = useInvalidateRentals();
	return useMutation({
		mutationKey: ['contract', 'list_rental', wallet],
		mutationFn: (input: ListRentalInput) =>
			keyRentalContractService.listRental(input, wallet, signer),
		onSuccess: () => showToast.success('Keys listed for rent'),
		onError: error => showToast.error(getSignatureErrorMessage(error)),
		onSettled: invalidate,
	});
}

/** Rents a listing via `rent`, paying the fee and locking the collateral. */
export function useRentKeyMutation(wallet: string, signer: Signer | null) {
	const invalidate = useInvalidateRentals();
	return useMutation({
		mutationKey: ['contract', 'rent', wallet],
		mutationFn: (input: RentKeyInput) =>
			keyRentalContractService.rent(input, wallet, signer),
		onSuccess: () => showToast.success('Rental started'),
		onError: error => showToast.error(getSignatureErrorMessage(error)),
		onSettled: invalidate,
	});
}

/** Ends an expired rental via `end_rental`. */
export function useEndRentalMutation(wallet: string, signer: Signer | null) {
	const invalidate = useInvalidateRentals();
	return useMutation({
		mutationKey: ['contract', 'end_rental', wallet],
		mutationFn: (listingId: string) =>
			keyRentalContractService.endRental(listingId, wallet, signer),
		onSuccess: () =>
			showToast.success('Rental ended: keys and collateral returned'),
		onError: error => showToast.error(getSignatureErrorMessage(error)),
		onSettled: invalidate,
	});
}

/** Claims the collateral of an overdue rental via `claim_collateral`. */
export function useClaimCollateralMutation(
	wallet: string,
	signer: Signer | null
) {
	const invalidate = useInvalidateRentals();
	return useMutation({
		mutationKey: ['contract', 'claim_collateral', wallet],
		mutationFn: (listingId: string) =>
			keyRentalContractService.claimCollateral(listingId, wallet, signer),
		onSuccess: () => showToast.success('Collateral claimed'),
		onError: error => showToast.error(getSignatureErrorMessage(error)),
		onSettled: invalidate,
	});
}
