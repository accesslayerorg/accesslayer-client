/**
 * Utilities for take-profit and stop-loss triggers (#1471)
 */

import type { TriggerType, TriggerValidation } from '@/types/holdingTrigger.types';

/**
 * Validate trigger price based on type.
 * - Take-profit must be above current price
 * - Stop-loss must be below current price
 */
export function validateTriggerPrice(
  triggerPrice: number,
  currentPrice: number,
  type: TriggerType
): TriggerValidation {
  if (type === 'take-profit' && triggerPrice <= currentPrice) {
    return {
      valid: false,
      message: 'Take-profit must be above current price',
    };
  }

  if (type === 'stop-loss' && triggerPrice >= currentPrice) {
    return {
      valid: false,
      message: 'Stop-loss must be below current price',
    };
  }

  if (triggerPrice <= 0) {
    return {
      valid: false,
      message: 'Trigger price must be positive',
    };
  }

  return { valid: true, message: '' };
}

/**
 * Calculate percentage distance from current price.
 * Positive for take-profit, negative for stop-loss.
 */
export function calculatePriceDistance(
  triggerPrice: number,
  currentPrice: number
): number {
  return ((triggerPrice - currentPrice) / currentPrice) * 100;
}

/**
 * Calculate estimated proceeds at trigger price.
 */
export function calculateEstimatedProceeds(
  quantity: number,
  triggerPrice: number,
  protocolFeePercent: number,
  creatorFeePercent: number
): number {
  const totalFeePercent = protocolFeePercent + creatorFeePercent;
  return quantity * triggerPrice * (1 - totalFeePercent / 2);
}

/**
 * Calculate profit/loss if trigger executes at the trigger price.
 */
export function calculateTriggerProfitLoss(
  quantity: number,
  triggerPrice: number,
  purchasePrice: number,
  protocolFeePercent: number,
  creatorFeePercent: number
): number {
  const proceeds = calculateEstimatedProceeds(
    quantity,
    triggerPrice,
    protocolFeePercent,
    creatorFeePercent
  );
  const purchaseCost = quantity * purchasePrice;
  return proceeds - purchaseCost;
}

/**
 * Calculate return percentage if trigger executes.
 */
export function calculateTriggerReturn(
  quantity: number,
  triggerPrice: number,
  purchasePrice: number,
  protocolFeePercent: number,
  creatorFeePercent: number
): number {
  const profitLoss = calculateTriggerProfitLoss(
    quantity,
    triggerPrice,
    purchasePrice,
    protocolFeePercent,
    creatorFeePercent
  );
  const purchaseCost = quantity * purchasePrice;
  return purchaseCost > 0 ? (profitLoss / purchaseCost) * 100 : 0;
}

/**
 * Get human-readable trigger description.
 */
export function getTriggerDescription(
  type: TriggerType,
  triggerPrice: number,
  estimatedProceeds: number
): string {
  const proceedsStr = estimatedProceeds.toFixed(2);
  if (type === 'take-profit') {
    return `Sell at ${triggerPrice} for ~${proceedsStr}`;
  }
  return `Sell at ${triggerPrice} to limit loss to ~${proceedsStr}`;
}

/**
 * Test vectors for unit tests
 */
export const TEST_VECTORS = [
  {
    name: 'Valid take-profit',
    triggerPrice: 15,
    currentPrice: 10,
    type: 'take-profit' as TriggerType,
    expectedValid: true,
  },
  {
    name: 'Invalid take-profit (below current)',
    triggerPrice: 8,
    currentPrice: 10,
    type: 'take-profit' as TriggerType,
    expectedValid: false,
  },
  {
    name: 'Valid stop-loss',
    triggerPrice: 8,
    currentPrice: 10,
    type: 'stop-loss' as TriggerType,
    expectedValid: true,
  },
  {
    name: 'Invalid stop-loss (above current)',
    triggerPrice: 15,
    currentPrice: 10,
    type: 'stop-loss' as TriggerType,
    expectedValid: false,
  },
  {
    name: 'Price distance calculation',
    triggerPrice: 12,
    currentPrice: 10,
    expectedDistance: 20, // 20% above current
  },
];
