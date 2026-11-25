import { useContext } from 'react';
import { useQuery, QueryClientContext, QueryClient } from '@tanstack/react-query';
import { fetchFeeDiscount } from '@/services/feeDiscount.service';
import { queryKeys } from '@/lib/queryKeys';
import type { FeeDiscount } from '@/utils/feeDiscount.utils';

const fallbackQueryClient = new QueryClient();

/**
 * Connected wallet's active fee discount tier (#1173).
 * Disabled when no address is connected so we never fire a request at mount.
 */
export function useFeeDiscount(address: string | null | undefined) {
	const clientInContext = useContext(QueryClientContext);
	const client = clientInContext ?? fallbackQueryClient;

	return useQuery<FeeDiscount>(
		{
			queryKey: queryKeys.wallet.feeDiscount(address ?? 'anonymous'),
			queryFn: () => fetchFeeDiscount(address as string),
			enabled: !!address && !!clientInContext,
			staleTime: 60_000,
		},
		client
	);
}
