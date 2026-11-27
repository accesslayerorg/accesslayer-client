import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  fetchVaultPosition,
  submitVaultAction,
  type VaultActionVariables,
  type VaultPosition,
} from '@/services/vaultBorrow.service';
import showToast from '@/utils/toast.util';

export function useVaultPosition(address: string) {
  return useQuery({
    queryKey: queryKeys.wallet.vaultPosition(address),
    queryFn: () => fetchVaultPosition(address),
    enabled: Boolean(address),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useVaultAction(address: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['vault', 'action', address],
    mutationFn: (variables: VaultActionVariables) => submitVaultAction(variables),
    onMutate: async variables => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wallet.vaultPosition(address) });
      const previous = queryClient.getQueryData<VaultPosition>(queryKeys.wallet.vaultPosition(address));
      if (previous) {
        const next = { ...previous };
        if (variables.action === 'deposit') next.collateral += variables.amount;
        if (variables.action === 'withdraw') next.collateral = Math.max(0, next.collateral - variables.amount);
        if (variables.action === 'borrow') next.debt += variables.amount;
        if (variables.action === 'repay') next.debt = Math.max(0, next.debt - variables.amount);
        next.collateralValueXlm = next.collateral;
        const debtAndInterest = next.debt + next.interest;
        next.healthFactor = debtAndInterest > 0 ? next.collateralValueXlm / debtAndInterest : 999;
        queryClient.setQueryData(queryKeys.wallet.vaultPosition(address), next);
      }
      return { previous };
    },
    onSuccess: result => {
      if (result.position) {
        queryClient.setQueryData(queryKeys.wallet.vaultPosition(address), result.position);
      } else {
        void queryClient.invalidateQueries({ queryKey: queryKeys.wallet.vaultPosition(address) });
      }
      showToast.success('Vault position updated');
    },
    onError: error => {
      showToast.error(error instanceof Error ? error.message : 'Vault action failed');
    },
  });
}
