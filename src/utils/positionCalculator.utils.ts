/**
 * Utilities for position sizing and break-even calculations (#1472)
 */

import type {
  PositionCalculatorInputs,
  OutcomeAtPrice,
  TriggerValidation,
} from '@/types/positionCalculator.types';

/**
 * Calculate break-even price including all fees.
 * Break-even = current price * (1 + protocol fee + creator fee)
 */
export function calculateBreakEvenPrice(
  currentPrice: number,
  protocolFeePercent: number,
  creatorFeePercent: number
): number {
  const totalFeePercent = protocolFeePercent + creatorFeePercent;
  return currentPrice * (1 + totalFeePercent);
}

/**
 * Calculate maximum position quantity for chosen risk percentage.
 * Max Quantity = (Capital * Risk%) / (Current Price - Stop Price)
 */
export function calculateMaxPosition(
  capital: number,
  riskPercent: number,
  stopPrice: number,
  currentPrice: number
): number {
  if (stopPrice >= currentPrice) return 0;
  const maxRisk = capital * (riskPercent / 100);
  const riskPerShare = currentPrice - stopPrice;
  return riskPerShare > 0 ? maxRisk / riskPerShare : 0;
}

/**
 * Generate outcomes table at multiple exit prices.
 * Shows profit/loss and return percentage at each exit price.
 */
export function generateOutcomesTable(
  inputs: PositionCalculatorInputs,
  quantity: number,
  protocolFeePercent: number,
  creatorFeePercent: number
): OutcomeAtPrice[] {
  const totalFeePercent = protocolFeePercent + creatorFeePercent;
  const exitPrices = generateExitPrices(
    inputs.currentPrice,
    inputs.plannedExitPrice
  );

  return exitPrices.map(price => {
    const proceeds =
      quantity * price * (1 - totalFeePercent / 2);
    const profitLoss = proceeds - inputs.capital;
    const returnPercent = (profitLoss / inputs.capital) * 100;

    return {
      exitPrice: price,
      quantity,
      proceeds,
      profitLoss,
      returnPercent,
    };
  });
}

/**
 * Generate meaningful exit price points for the outcomes table.
 * Returns 10 prices evenly distributed from current to planned exit.
 */
function generateExitPrices(
  currentPrice: number,
  plannedExitPrice: number
): number[] {
  const prices: number[] = [];
  const step = Math.abs(plannedExitPrice - currentPrice) / 10;

  for (let i = 0; i <= 10; i++) {
    if (plannedExitPrice >= currentPrice) {
      prices.push(currentPrice + step * i);
    } else {
      prices.push(currentPrice - step * i);
    }
  }

  return prices;
}

/**
 * Validate position size relative to key supply.
 * Warn if position exceeds threshold (default 5%).
 */
export function validatePositionSize(
  quantity: number,
  keySupply: number,
  threshold = 0.05
): TriggerValidation {
  const share = quantity / keySupply;

  if (share > threshold) {
    return {
      valid: true,
      message: `Position is ${(share * 100).toFixed(1)}% of supply - large position`,
    };
  }

  return { valid: true, message: '' };
}

/**
 * Calculate estimated proceeds at a given exit price.
 */
export function calculateProceeds(
  quantity: number,
  exitPrice: number,
  protocolFeePercent: number,
  creatorFeePercent: number
): number {
  const totalFeePercent = protocolFeePercent + creatorFeePercent;
  return quantity * exitPrice * (1 - totalFeePercent / 2);
}

/**
 * Test vectors for unit tests
 */
export const TEST_VECTORS = [
  {
    name: 'Basic break-even calculation',
    capital: 1000,
    currentPrice: 10,
    protocolFee: 0.01,
    creatorFee: 0.01,
    expectedBreakEven: 10.2, // 10 * (1 + 0.02)
  },
  {
    name: 'Max position with 2% risk',
    capital: 1000,
    riskPercent: 2,
    currentPrice: 10,
    stopPrice: 8,
    expectedQuantity: 100, // (1000 * 0.02) / (10 - 8)
  },
  {
    name: 'Proceeds calculation',
    quantity: 100,
    exitPrice: 15,
    protocolFee: 0.01,
    creatorFee: 0.01,
    expectedProceeds: 1485, // 100 * 15 * (1 - 0.02/2)
  },
];
