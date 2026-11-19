import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	holderConcentrationService,
	type HolderConcentration,
} from '@/services/holderConcentration.service';

/** Concentration changes slowly between trades, cached for 60s (#1245). */
export const HOLDER_CONCENTRATION_STALE_TIME_MS = 60 * 1000;

export function useHolderConcentration(keyId: string | undefined) {
	return useQuery<HolderConcentration>({
		queryKey: queryKeys.creators.holderConcentration(keyId ?? ''),
		queryFn: () =>
			holderConcentrationService.getHolderConcentration(keyId!),
		enabled: Boolean(keyId),
		staleTime: HOLDER_CONCENTRATION_STALE_TIME_MS,
		retry: false,
	});
}
