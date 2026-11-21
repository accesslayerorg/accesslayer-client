import { useQuery } from '@tanstack/react-query';
import { fetchFeeDiscount } from '@/services/feeDiscount.service';
import { queryKeys } from '@/lib/queryKeys';
import type { FeeDiscount } from '@/utils/feeDiscount.utils';

/**
 * Connected wallet's active fee discount tier (#1173).
 * Disabled when no address is connected so we never fire a request at mount.
 */
export function useFeeDiscount(address: string | null | undefined) {
	return useQuery<FeeDiscount>({
		queryKey: queryKeys.wallet.feeDiscount(address ?? 'anonymous'),
		queryFn: () => fetchFeeDiscount(address as string),
		enabled: !!address,
		staleTime: 60_000,
	});
}
