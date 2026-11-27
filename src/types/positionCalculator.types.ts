/**
 * Types for position sizing and break-even calculator feature (#1472)
 */

export interface PositionCalculatorInputs {
  capital: number;
  riskPercentage: number;
  plannedExitPrice: number;
  currentPrice: number;
  supplyShare?: number;
}

export interface BreakEvenCalculation {
  breakEvenPrice: number;
  includesFees: boolean;
  includesRoundTrip: boolean;
}

export interface PositionSizingResult {
  maxQuantity: number;
  maxRisk: number;
  riskPerShare: number;
}

export interface OutcomeAtPrice {
  exitPrice: number;
  quantity: number;
  proceeds: number;
  profitLoss: number;
  returnPercent: number;
}

export interface TriggerValidation {
  valid: boolean;
  message: string;
}
