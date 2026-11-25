import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchPublicPortfolio } from '@/services/publicPortfolio.service';

/** Public portfolio for a handle; `data === null` means the page is not public (404). */
export function usePublicPortfolio(handle: string) {
	return useQuery({
		queryKey: queryKeys.publicPortfolio.byHandle(handle.toLowerCase()),
		queryFn: () => fetchPublicPortfolio(handle),
		enabled: !!handle,
		staleTime: 60_000,
	});
}
