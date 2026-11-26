import { useQuery } from '@tanstack/react-query';
import {
	royaltyService,
	type ApprovedMarketplace,
	type RoyaltyEnforcementStatus,
} from '@/services/royalty.service';

/** Enforcement status plus the approved marketplace recipients for a key. */
export type UseRoyaltyEnforcementData = RoyaltyEnforcementStatus & {
	/** Alias used by transfer UIs that refer to enforcement as simply "on". */
	enabled: boolean;
	approvedMarketplaces: ApprovedMarketplace[];
};

/**
 * Shared royalty-enforcement lookup for transfer flows: direct transfers are
 * blocked while enforcement is on, unless the recipient is an approved
 * marketplace address.
 */
export function useRoyaltyEnforcement(keyId: string | undefined) {
	return useQuery<UseRoyaltyEnforcementData>({
		queryKey: ['royalty-enforcement', keyId ?? ''],
		queryFn: async () => {
			const [status, marketplaces] = await Promise.all([
				royaltyService.getRoyaltyEnforcement(keyId!),
				royaltyService.getApprovedMarketplaces(),
			]);
			return {
				...status,
				enabled: status.enforced,
				approvedMarketplaces: marketplaces,
			};
		},
		enabled: Boolean(keyId),
		staleTime: 30_000,
		retry: false,
	});
}

export default useRoyaltyEnforcement;
