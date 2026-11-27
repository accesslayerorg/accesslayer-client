import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService, type KeyConfig } from '@/services/course.service';
import {
	royaltyService,
	type ApprovedMarketplace,
	type RoyaltyEnforcementStatus,
} from '@/services/royalty.service';

export type RoyaltyEnforcement = RoyaltyEnforcementStatus & {
	approvedMarketplaces: ApprovedMarketplace[];
};

/**
 * Fetches royalty enforcement status for a creator key.
 *
 * Used to show the enforcement badge, restrict direct wallet transfers,
 * and warn when a recipient is not an approved marketplace.
 */
export function useRoyaltyEnforcement(keyId: string | undefined) {
	return useQuery<RoyaltyEnforcement>({
		queryKey: ['keys', keyId ?? '', 'royalty-enforcement'],
		queryFn: async () => {
			const [status, approvedMarketplaces] = await Promise.all([
				royaltyService.getRoyaltyEnforcement(keyId!),
				royaltyService.getApprovedMarketplaces(),
			]);
			return { ...status, approvedMarketplaces };
		},
		enabled: Boolean(keyId),
		staleTime: 30_000,
		retry: false,
	});
}

/**
 * Fetches the live trading config for a creator key (#951).
 *
 * The config carries the current buy/sell prices used to derive the
 * bid-ask spread. React Query refetches it when the cache is invalidated
 * or goes stale, so the displayed spread stays in sync with the key
 * configuration without a full page reload.
 */
export function useKeyConfig(keyId: string | undefined) {
	return useQuery<KeyConfig>({
		queryKey: queryKeys.creators.keyConfig(keyId ?? ''),
		queryFn: () => courseService.getKeyConfig(keyId!),
		enabled: Boolean(keyId),
		staleTime: 30_000,
		retry: false,
	});
}
