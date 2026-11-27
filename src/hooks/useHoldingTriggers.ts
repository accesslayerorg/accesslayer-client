/**
 * React Query hooks for holding triggers (#1471)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  createTrigger,
  updateTrigger,
  removeTrigger,
  fetchTriggers,
  fetchAllActiveTriggers,
  fetchTriggerStatus,
} from '@/services/holdingTriggers.service';
import type {
  HoldingTrigger,
  CreateTriggerInput,
  UpdateTriggerInput,
} from '@/types/holdingTrigger.types';
import type { Signer } from '@/lib/signing/types';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

/**
 * Query: triggers for a specific holding
 */
export function useHoldingTriggers(holdingId: string) {
  return useQuery({
    queryKey: queryKeys.holdingTriggers.byHolding(holdingId),
    queryFn: () => fetchTriggers(holdingId),
    enabled: !!holdingId,
    staleTime: 10_000,
  });
}

/**
 * Query: all active triggers for a wallet
 */
export function useActiveTriggers(wallet: string) {
  return useQuery({
    queryKey: queryKeys.holdingTriggers.active(wallet),
    queryFn: () => fetchAllActiveTriggers(wallet),
    enabled: !!wallet,
    refetchInterval: 15_000, // Poll for execution
  });
}

/**
 * Query: single trigger status
 */
export function useTriggerStatus(triggerId: string) {
  return useQuery({
    queryKey: queryKeys.holdingTriggers.byId(triggerId),
    queryFn: () => fetchTriggerStatus(triggerId),
    enabled: !!triggerId,
    refetchInterval: 10_000,
  });
}

/**
 * Mutation: create trigger
 */
export function useCreateTriggerMutation(wallet: string, signer: Signer | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTriggerInput) =>
      createTrigger(input, wallet, signer!),
    onError: error => {
      showToast.error(getSignatureErrorMessage(error));
    },
    onSuccess: trigger => {
      const typeLabel =
        trigger.type === 'take-profit' ? 'Take-profit' : 'Stop-loss';
      showToast.success(`${typeLabel} set at ${trigger.triggerPrice}`);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.holdingTriggers.all(wallet),
      });
    },
  });
}

/**
 * Mutation: update trigger
 */
export function useUpdateTriggerMutation(wallet: string, signer: Signer | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { triggerId: string; input: UpdateTriggerInput }) =>
      updateTrigger(data.triggerId, data.input, signer!),
    onError: error => {
      showToast.error(getSignatureErrorMessage(error));
    },
    onSuccess: () => {
      showToast.success('Trigger updated');
      void queryClient.invalidateQueries({
        queryKey: queryKeys.holdingTriggers.all(wallet),
      });
    },
  });
}

/**
 * Mutation: remove trigger (cancels order)
 */
export function useRemoveTriggerMutation(wallet: string, signer: Signer | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (triggerId: string) => removeTrigger(triggerId, signer!),
    onError: error => {
      showToast.error(getSignatureErrorMessage(error));
    },
    onSuccess: () => {
      showToast.success('Trigger removed');
      void queryClient.invalidateQueries({
        queryKey: queryKeys.holdingTriggers.all(wallet),
      });
    },
  });
}
