import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { keyReserveService } from '@/services/keyReserve.service';

/** Protocol reserve backing a creator key, refetched on every page load (#1208). */
export function useKeyReserve(keyId: string) {
	return useQuery({
		queryKey: queryKeys.creators.reserve(keyId),
		queryFn: () => keyReserveService.getKeyReserve(keyId),
		enabled: !!keyId,
		refetchOnMount: 'always',
		retry: false,
	});
}
