import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService } from '@/services/course.service';

export type KeyTwapWindow = '1h' | '24h';

export function useKeyTwap(keyId: string, window: KeyTwapWindow = '24h') {
	return useQuery({
		queryKey: queryKeys.creators.twap(keyId, window),
		queryFn: () => courseService.getKeyTwap(keyId, window),
		enabled: !!keyId,
		staleTime: 60_000,
		refetchInterval: 60_000,
		retry: false,
	});
}
