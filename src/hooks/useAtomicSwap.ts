import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import showToast from '@/utils/toast.util';
import type { AtomicSwapProposal } from '@/types/atomicSwap';
import {
  createAtomicSwapProposal,
  fetchAtomicSwapProposal,
  acceptAtomicSwapProposal,
  fetchUserAtomicSwapProposals,
  fetchAtomicSwapHistory,
} from '@/services/atomicSwap.service';

export function useCreateAtomicSwapProposal(address: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['atomic-swap', 'create', address],
    mutationFn: async (params: Parameters<typeof createAtomicSwapProposal>[0]) => {
      return createAtomicSwapProposal(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.holdings(address) });
      queryClient.invalidateQueries({ queryKey: ['atomic-swap', 'proposals', address] });
      showToast.success('Proposal created');
    },
    onError: (error) => {
      showToast.error(error instanceof Error ? error.message : 'Failed to create proposal');
    },
  });
}

export function useAtomicSwapProposal(proposalId: string, enabled = true) {
  return useQuery<AtomicSwapProposal | null>({
    queryKey: ['atomic-swap', 'proposal', proposalId],
    queryFn: () => fetchAtomicSwapProposal({ proposalId }),
    enabled: enabled && !!proposalId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useAcceptAtomicSwapProposal(address: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['atomic-swap', 'accept', address],
    mutationFn: async (params: Parameters<typeof acceptAtomicSwapProposal>[0]) => {
      return acceptAtomicSwapProposal(params);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['atomic-swap', 'proposal', variables.proposalId], data.proposal);
      queryClient.invalidateQueries({ queryKey: ['atomic-swap', 'proposals', address] });
      queryClient.invalidateQueries({ queryKey: ['atomic-swap', 'history', address] });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.holdings(address) });
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.all });
      showToast.transactionSuccess('Swap completed', 'Atomic swap executed successfully');
    },
    onError: (error) => {
      showToast.error(error instanceof Error ? error.message : 'Failed to accept proposal');
    },
  });
}

export function useUserAtomicSwapProposals(address: string, status?: AtomicSwapProposal['status']) {
  return useQuery<AtomicSwapProposal[]>({
    queryKey: ['atomic-swap', 'proposals', address, status ?? 'all'],
    queryFn: () => fetchUserAtomicSwapProposals({ address, status }),
    enabled: !!address,
    staleTime: 30_000,
  });
}

export function useAtomicSwapHistory(address: string) {
  return useInfiniteQuery({
    queryKey: ['atomic-swap', 'history', address],
    queryFn: ({ pageParam }) => fetchAtomicSwapHistory({ address, cursor: pageParam as string | null | undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!address,
    staleTime: 30_000,
  });
}