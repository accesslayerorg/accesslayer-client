/**
 * Types for backtest simulator feature (#1473)
 */

export interface HistoricalPrice {
  timestamp: string;
  price: number;
  volume?: number;
}

export interface BacktestParams {
  keyId: string;
  amountSpent: number;
  startDate: string;
  exitDate?: string;
}

export interface PricePoint {
  date: string;
  price: number;
  value: number;
}

export interface BacktestResult {
  startDate: string;
  exitDate: string;
  quantity: number;
  purchaseCost: number;
  exitValue: number;
  returns: number;
  maxDrawdown: number;
  holdingDays: number;
  priceHistory: PricePoint[];
  xlmHoldValue: number;
  xlmReturn: number;
}
