import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	fetchEarlyIncentive,
	type EarlyIncentive,
} from '@/services/earlyIncentive.service';

/** How often early incentive slot counts are refreshed (#1232). */
export const EARLY_INCENTIVE_REFRESH_INTERVAL_MS = 30_000;

export function useEarlyIncentive(keyId: string) {
	return useQuery<EarlyIncentive>({
		queryKey: queryKeys.creators.earlyIncentive(keyId),
		queryFn: () => fetchEarlyIncentive(keyId),
		enabled: !!keyId,
		staleTime: EARLY_INCENTIVE_REFRESH_INTERVAL_MS,
		refetchInterval: EARLY_INCENTIVE_REFRESH_INTERVAL_MS,
		retry: false,
	});
}
