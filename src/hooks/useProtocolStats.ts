import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
	protocolService,
	type ProtocolStats,
} from '@/services/protocol.service';

export const PROTOCOL_STATS_QUERY_KEY = ['protocol', 'stats'] as const;

export function useProtocolStats(): UseQueryResult<ProtocolStats, Error> {
	return useQuery<ProtocolStats, Error>({
		queryKey: PROTOCOL_STATS_QUERY_KEY,
		queryFn: () => protocolService.getProtocolStats(),
		staleTime: 300_000, // 5 minutes
		refetchInterval: 300_000, // 5 minutes explicit refetch interval
	});
}
