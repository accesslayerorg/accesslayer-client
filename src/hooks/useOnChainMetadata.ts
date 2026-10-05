import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	creatorKeysContractService,
	type OnChainMetadataResult,
} from '@/services/creatorKeysContract.service';

/**
 * Hook to fetch creator key metadata directly from on-chain contract storage (#1033).
 */
export function useOnChainMetadata(keyId: string | undefined) {
	return useQuery<OnChainMetadataResult | null>({
		queryKey: queryKeys.creators.onChainMetadata(keyId ?? ''),
		queryFn: () => creatorKeysContractService.getMetadata(keyId!),
		enabled: Boolean(keyId),
		staleTime: 30_000,
		retry: false,
	});
}
