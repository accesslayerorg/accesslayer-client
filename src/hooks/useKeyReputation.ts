import { useContext } from 'react';
import { useQuery, QueryClientContext, QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	keyReputationService,
	type KeyReputation,
} from '@/services/keyReputation.service';

/** Reputation is recomputed daily server-side, so cache for 5 minutes (#1143). */
export const KEY_REPUTATION_STALE_TIME_MS = 5 * 60 * 1000;

const fallbackQueryClient = new QueryClient();

export function useKeyReputation(keyId: string | undefined) {
	const clientInContext = useContext(QueryClientContext);
	const client = clientInContext ?? fallbackQueryClient;

	return useQuery<KeyReputation>(
		{
			queryKey: queryKeys.creators.reputation(keyId ?? ''),
			queryFn: () => keyReputationService.getKeyReputation(keyId!),
			enabled: Boolean(keyId) && !!clientInContext,
			staleTime: KEY_REPUTATION_STALE_TIME_MS,
			retry: false,
		},
		client
	);
}
