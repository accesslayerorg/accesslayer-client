import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService } from '@/services/course.service';

export function useKeyTwap(keyId: string) {
	return useQuery({
		queryKey: queryKeys.creators.twap(keyId),
		queryFn: () => courseService.getKeyTwap(keyId),
		enabled: !!keyId,
		staleTime: 60_000,
		retry: false,
	});
}
