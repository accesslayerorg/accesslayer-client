import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { balanceHistoryService } from '@/services/balanceHistory.service';
import type { BalanceCheckpoint } from '@/types/balanceHistory.types';

export function useBalanceHistory(
	address?: string | null,
	keyId?: string,
	range: string = 'all'
) {
	const normalizedAddress = address?.trim() || '';

	return useQuery<BalanceCheckpoint[]>({
		queryKey: queryKeys.wallet.balanceHistory(normalizedAddress, keyId, range),
		queryFn: () =>
			balanceHistoryService.getBalanceCheckpoints(
				normalizedAddress,
				keyId,
				range
			),
		enabled: Boolean(normalizedAddress),
	});
}
