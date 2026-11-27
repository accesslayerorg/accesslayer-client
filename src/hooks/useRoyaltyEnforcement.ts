import { useQuery } from '@tanstack/react-query';
import {
	royaltyService,
	type ApprovedMarketplace,
	type RoyaltyEnforcementStatus,
} from '@/services/royalty.service';

export type UseRoyaltyEnforcementData = RoyaltyEnforcementStatus & {
	enabled: boolean;
	approvedMarketplaces: ApprovedMarketplace[];
};

/** Fetches royalty enforcement status and approved marketplaces for transfer flows. */
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
