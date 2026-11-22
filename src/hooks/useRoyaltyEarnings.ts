import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  royaltyService,
  type RoyaltyClaim,
  type RoyaltyEarningsSummary,
} from '@/services/royalty.service';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

/**
 * Royalty earnings for a creator key (#987).
 *
 * Aggregated totals plus per-transfer breakdown from
 * `GET /keys/:id/royalties`. The issue's acceptance criteria call for a
 * 60-second refresh cadence, so `refetchInterval` is set explicitly.
 */
export function useRoyaltyEarnings(
  keyId: string | undefined,
  wallet: string | undefined
) {
  return useQuery({
    queryKey: ['creators', keyId ?? '', 'royalties', wallet ?? ''],
    queryFn: () => royaltyService.getRoyaltyEarnings(keyId!, wallet!),
    enabled: Boolean(keyId && wallet),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });
}

/**
 * Withdraws accumulated royalties (#987). On success the earnings query is
 * invalidated so totals, pending amount and claimed history refresh
 * together.
 */
export function useClaimRoyaltiesMutation(keyId: string, wallet: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['contract', 'claim_royalties', keyId, wallet],
    mutationFn: () => royaltyService.claimRoyalties(keyId, wallet),
    onError: error => {
      showToast.error(getSignatureErrorMessage(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['creators', keyId, 'royalties'],
      });
      showToast.success('Royalties claimed');
    },
  });
}

export type { RoyaltyClaim, RoyaltyEarningsSummary };
