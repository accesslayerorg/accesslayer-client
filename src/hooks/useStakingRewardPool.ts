import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  stakingPoolService,
  type FundRewardPoolInput,
  type StakingRewardPool,
} from '@/services/stakingPool.service';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

/**
 * Staking reward pool state for one creator key (#1023).
 *
 * The pool balance moves as stakers claim and the creator funds, so the
 * query refetches on the same 60s cadence the dashboard uses elsewhere.
 */
export function useStakingRewardPool(keyId: string | undefined) {
  return useQuery({
    queryKey: ['creators', keyId ?? '', 'staking-pool'],
    queryFn: () => stakingPoolService.getRewardPool(keyId!),
    enabled: Boolean(keyId),
    refetchInterval: 60_000,
    staleTime: 15_000,
    retry: false,
  });
}

/**
 * Funds the staking reward pool (#1023). On success the pool query is
 * invalidated so the balance and reward-rate preview reflect the deposit.
 */
export function useFundRewardPoolMutation(keyId: string, wallet: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['contract', 'fund_reward_pool', keyId, wallet],
    mutationFn: (input: FundRewardPoolInput) =>
      stakingPoolService.fundRewardPool(keyId, wallet, input),
    onError: error => {
      showToast.error(getSignatureErrorMessage(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['creators', keyId, 'staking-pool'],
      });
      showToast.success('Reward pool funded');
    },
  });
}

export type { StakingRewardPool };
