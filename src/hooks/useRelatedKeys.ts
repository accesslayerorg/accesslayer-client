import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	relatedKeysService,
	type RelatedKey,
} from '@/services/relatedKeys.service';

/** Related keys change slowly, so they stay fresh for 15 minutes (#1318). */
export const RELATED_KEYS_STALE_TIME_MS = 15 * 60 * 1000;

export const DEFAULT_RELATED_KEYS_LIMIT = 12;

/**
 * Keys that share holders with `keyId`, from `GET /keys/:keyId/related`.
 */
export function useRelatedKeys(
	keyId: string | undefined,
	limit: number = DEFAULT_RELATED_KEYS_LIMIT
) {
	return useQuery<RelatedKey[]>({
		queryKey: queryKeys.creators.related(keyId ?? '', limit),
		queryFn: () => relatedKeysService.getRelatedKeys(keyId as string, limit),
		enabled: Boolean(keyId),
		staleTime: RELATED_KEYS_STALE_TIME_MS,
		retry: false,
	});
}
