/**
 * API service for take-profit and stop-loss triggers (#1471)
 */

import { apiClient } from '@/services/api.service';
import type {
  HoldingTrigger,
  CreateTriggerInput,
  UpdateTriggerInput,
} from '@/types/holdingTrigger.types';
import type { Signer } from '@/lib/signing/types';

/**
 * Create a new trigger (take-profit or stop-loss) on a holding.
 */
export async function createTrigger(
  input: CreateTriggerInput,
  _wallet: string,
  _signer: Signer
): Promise<HoldingTrigger> {
  const response = await apiClient.post<HoldingTrigger>(
    `/holdings/${input.holdingId}/triggers`,
    input
  );
  return response.data;
}

/**
 * Update an existing trigger.
 */
export async function updateTrigger(
  triggerId: string,
  input: UpdateTriggerInput,
  _signer: Signer
): Promise<HoldingTrigger> {
  const response = await apiClient.patch<HoldingTrigger>(`/triggers/${triggerId}`, input);
  return response.data;
}

/**
 * Remove a trigger and cancel its underlying order.
 */
export async function removeTrigger(
  triggerId: string,
  _signer: Signer
): Promise<void> {
  await apiClient.delete(`/triggers/${triggerId}`);
}

/**
 * Fetch all triggers for a holding.
 */
export async function fetchTriggers(holdingId: string): Promise<HoldingTrigger[]> {
  const response = await apiClient.get<HoldingTrigger[]>(`/holdings/${holdingId}/triggers`);
  return response.data;
}

/**
 * Fetch all active triggers for a wallet.
 */
export async function fetchAllActiveTriggers(
  wallet: string
): Promise<HoldingTrigger[]> {
  const response = await apiClient.get<HoldingTrigger[]>(`/wallet/${wallet}/triggers`, {
    params: { status: 'active' },
  });
  return response.data;
}

/**
 * Fetch the current status of a trigger.
 */
export async function fetchTriggerStatus(
  triggerId: string
): Promise<HoldingTrigger> {
  const response = await apiClient.get<HoldingTrigger>(`/triggers/${triggerId}`);
  return response.data;
}
