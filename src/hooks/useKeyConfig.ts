import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService, type KeyConfig } from '@/services/course.service';

/**
 * Fetches the live trading config for a creator key (#951).
 *
 * The config carries the current buy/sell prices used to derive the
 * bid-ask spread. React Query refetches it when the cache is invalidated
 * or goes stale, so the displayed spread stays in sync with the key
 * configuration without a full page reload.
 */
export function useKeyConfig(keyId: string | undefined) {
	return useQuery<KeyConfig>({
		queryKey: queryKeys.creators.keyConfig(keyId ?? ''),
		queryFn: () => courseService.getKeyConfig(keyId!),
		enabled: Boolean(keyId),
		staleTime: 30_000,
		retry: false,
	});
}
