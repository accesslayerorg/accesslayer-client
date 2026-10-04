import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { curveMigrationService } from '@/services/curveMigration.service';
import { partitionCurveMigrations } from '@/utils/curveMigration.utils';
import type { CurveMigration } from '@/types/curveMigration';

/**
 * Curve migrations for a creator key, split into the pending proposals the
 * creator can act on and the executed history.
 *
 * The query stays disabled until a `keyId` is known — the panel is
 * creator-only, so non-creators never reach this hook with an id. It
 * refetches every 15 seconds so the timelock countdown, the vote tally, and
 * the Execute button stay current without a manual refresh.
 */
export function useCurveMigrations(keyId: string | undefined) {
	const query = useQuery<CurveMigration[]>({
		queryKey: queryKeys.creators.curveMigrations(keyId ?? ''),
		queryFn: () => curveMigrationService.getMigrations(keyId!),
		enabled: Boolean(keyId),
		staleTime: 15_000,
		refetchInterval: 15_000,
		retry: false,
	});

	return { ...query, ...partitionCurveMigrations(query.data) };
}
