import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	keyReputationService,
	type KeyReputation,
} from '@/services/keyReputation.service';

/** Reputation is recomputed daily server-side, so cache for 5 minutes (#1143). */
export const KEY_REPUTATION_STALE_TIME_MS = 5 * 60 * 1000;

export function useKeyReputation(keyId: string | undefined) {
	return useQuery<KeyReputation>({
		queryKey: queryKeys.creators.reputation(keyId ?? ''),
		queryFn: () => keyReputationService.getKeyReputation(keyId!),
		enabled: Boolean(keyId),
		staleTime: KEY_REPUTATION_STALE_TIME_MS,
		retry: false,
	});
}
