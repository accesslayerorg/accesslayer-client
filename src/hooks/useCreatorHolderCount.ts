import { useQuery } from '@tanstack/react-query';

export interface HolderCountResult {
  count: number | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Fetches the holder count for a given creator via React Query.
 * Query key: ['creator', creatorId, 'holderCount']
 *
 * The queryFn is injected as a parameter so tests can supply a mock
 * without module-level vi.mock() patching.
 */
export function useCreatorHolderCount(
  creatorId: string,
  fetchHolderCount: (id: string) => Promise<number | null>
): HolderCountResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['creator', creatorId, 'holderCount'],
    queryFn: () => fetchHolderCount(creatorId),
    staleTime: 30_000,
  });

  return {
    count: data ?? null,
    isLoading,
    isError,
  };
}
