import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	keySnapshotHistoryService,
	type KeySnapshot,
	type SnapshotHistoryRange,
} from '@/services/keySnapshotHistory.service';

/** Daily snapshots change at most once a day, so cache for 5 minutes (#1142). */
export const SNAPSHOT_HISTORY_STALE_TIME_MS = 5 * 60 * 1000;

export function useKeySnapshotHistory(
	keyId: string | undefined,
	range: SnapshotHistoryRange
) {
	return useQuery<KeySnapshot[]>({
		queryKey: queryKeys.creators.snapshotHistory(keyId ?? '', range),
		queryFn: () =>
			keySnapshotHistoryService.getSnapshotHistory(keyId!, range),
		enabled: Boolean(keyId),
		staleTime: SNAPSHOT_HISTORY_STALE_TIME_MS,
		retry: false,
	});
}
