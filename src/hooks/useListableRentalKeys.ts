import { useMemo } from 'react';
import { useCreatorPrices } from '@/hooks/useCreatorPrices';
import { useWalletRentals } from '@/hooks/useKeyRentals';
import { useWalletHoldings } from '@/hooks/useWallet';
import type { ListableKey } from '@/types/keyRental';
import { buildListableKeys } from '@/utils/keyRental.utils';

/**
 * Keys the wallet can list for rent, with names and the balance left after
 * frozen keys and existing listings (#1360).
 */
export function useListableRentalKeys(
	wallet: string | null | undefined
): ListableKey[] {
	const { data: holdings = [] } = useWalletHoldings(wallet ?? '');
	const { data: creators = [] } = useCreatorPrices();
	const { data: rentals = [] } = useWalletRentals(wallet);

	return useMemo(() => {
		const names: Record<string, string> = {};
		for (const creator of creators) {
			names[creator.id] = creator.title || creator.name || creator.id;
		}
		return buildListableKeys(holdings, names, rentals, wallet);
	}, [holdings, creators, rentals, wallet]);
}
