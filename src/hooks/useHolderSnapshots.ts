import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	holderSnapshotsService,
	type HolderSnapshot,
	type HolderSnapshotRange,
} from '@/services/holderSnapshots.service';

/** Snapshots change slowly, so they are cached for 5 minutes (#1107). */
export const HOLDER_SNAPSHOTS_STALE_TIME_MS = 5 * 60 * 1000;

export function useHolderSnapshots(
	keyId: string | undefined,
	range: HolderSnapshotRange
) {
	return useQuery<HolderSnapshot[]>({
		queryKey: queryKeys.creators.holderSnapshots(keyId ?? '', range),
		queryFn: () => holderSnapshotsService.getHolderSnapshots(keyId!, range),
		enabled: Boolean(keyId),
		staleTime: HOLDER_SNAPSHOTS_STALE_TIME_MS,
		retry: false,
	});
}
