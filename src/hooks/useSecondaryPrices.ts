import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	fetchSecondaryPrices,
	type SecondaryPriceRange,
} from '@/services/secondaryPrices.service';

export function useSecondaryPrices(keyId: string, range: SecondaryPriceRange) {
	return useQuery({
		queryKey: queryKeys.creators.secondaryPrices(keyId, range),
		queryFn: () => fetchSecondaryPrices(keyId, range),
		enabled: !!keyId,
		retry: false,
	});
}
