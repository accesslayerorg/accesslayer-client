/**
 * Types for take-profit and stop-loss triggers feature (#1471)
 */

export type TriggerType = 'take-profit' | 'stop-loss';

export interface HoldingTrigger {
  id: string;
  holdingId: string;
  keyId: string;
  type: TriggerType;
  triggerPrice: number;
  linkedTriggerId?: string;
  estimatedProceeds: number;
  currentPrice: number;
  priceDistancePercent: number;
  createdAt: string;
  status: 'active' | 'executed' | 'cancelled';
}

export interface CreateTriggerInput {
  holdingId: string;
  type: TriggerType;
  triggerPrice: number;
  linkToTriggerId?: string;
}

export interface UpdateTriggerInput {
  triggerPrice?: number;
  linkToTriggerId?: string;
}

export interface TriggerValidation {
  valid: boolean;
  message: string;
}
