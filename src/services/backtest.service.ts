/**
 * API service for backtest simulator (#1473)
 */

import { apiClient } from '@/services/api.service';
import type {
  HistoricalPrice,
  BacktestParams,
  BacktestResult,
  PricePoint,
} from '@/types/backtest.types';

/**
 * Fetch historical prices for a key within a date range.
 */
export async function fetchHistoricalPrices(
  keyId: string,
  range: { start: string; end: string }
): Promise<HistoricalPrice[]> {
  const response = await apiClient.get<HistoricalPrice[]>(
    `/analytics/historical-prices/${keyId}`,
    {
      params: {
        start: range.start,
        end: range.end,
      },
    }
  );
  return response.data;
}

/**
 * Fetch XLM historical prices for comparison.
 */
export async function fetchXlmPrices(range: {
  start: string;
  end: string;
}): Promise<HistoricalPrice[]> {
  const response = await apiClient.get<HistoricalPrice[]>('/analytics/xlm-prices', {
    params: {
      start: range.start,
      end: range.end,
    },
  });
  return response.data;
}

/**
 * Fetch when a key was created/deployed.
 */
export async function fetchKeyExistenceDate(keyId: string): Promise<string> {
  const response = await apiClient.get<{ createdAt: string }>(`/creators/${keyId}/created-at`);
  return response.data.createdAt;
}

/**
 * Calculate backtest locally on frontend after prices are fetched.
 * This keeps computation on the client and avoids backend round-trips.
 */
export function calculateBacktest(
  keyPrices: HistoricalPrice[],
  xlmPrices: HistoricalPrice[],
  params: BacktestParams,
  fees: { protocolFee: number; creatorFee: number }
): BacktestResult {
  if (!keyPrices.length || !xlmPrices.length) {
    throw new Error('Price data is required for backtest calculation');
  }

  // Find prices on specific dates
  const startPrice = findPriceOnDate(keyPrices, params.startDate);
  const exitDate = params.exitDate || new Date().toISOString();
  const exitPrice = findPriceOnDate(keyPrices, exitDate);

  if (!startPrice || !exitPrice) {
    throw new Error('Unable to find prices for selected dates');
  }

  // Calculate effective buy price with fees
  const totalFeePercent = fees.protocolFee + fees.creatorFee;
  const effBuyPrice = startPrice * (1 + totalFeePercent);
  const quantity = params.amountSpent / effBuyPrice;
  const purchaseCost =
    params.amountSpent + params.amountSpent * fees.protocolFee;

  // Calculate exit value with fee reduction
  const exitValue =
    quantity * exitPrice * (1 - totalFeePercent / 2);
  const returns = (exitValue - purchaseCost) / purchaseCost;

  // Build price history with values
  const priceHistory = buildPriceHistory(
    keyPrices,
    params.startDate,
    exitDate,
    quantity
  );

  // Calculate max drawdown
  const maxDrawdown = computeMaxDrawdown(priceHistory);

  // XLM comparison
  const xlmStartPrice = findPriceOnDate(xlmPrices, params.startDate);
  const xlmExitPrice = findPriceOnDate(xlmPrices, exitDate);

  if (!xlmStartPrice || !xlmExitPrice) {
    throw new Error('Unable to find XLM prices for selected dates');
  }

  const xlmQuantity = params.amountSpent / xlmStartPrice;
  const xlmHoldValue = xlmQuantity * xlmExitPrice;
  const xlmReturn = (xlmHoldValue - params.amountSpent) / params.amountSpent;

  return {
    startDate: params.startDate,
    exitDate,
    quantity,
    purchaseCost,
    exitValue,
    returns,
    maxDrawdown,
    holdingDays: dateDiffDays(params.startDate, exitDate),
    priceHistory,
    xlmHoldValue,
    xlmReturn,
  };
}

/**
 * Find price on a specific date or nearest date.
 */
function findPriceOnDate(
  prices: HistoricalPrice[],
  date: string
): number | null {
  const targetTime = new Date(date).getTime();

  // Find exact match or closest date
  let closest = prices[0];
  let minDiff = Math.abs(
    new Date(prices[0].timestamp).getTime() - targetTime
  );

  for (const price of prices) {
    const diff = Math.abs(new Date(price.timestamp).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = price;
    }
  }

  return closest ? closest.price : null;
}

/**
 * Build price history with computed values.
 */
function buildPriceHistory(
  prices: HistoricalPrice[],
  startDate: string,
  endDate: string,
  quantity: number
): PricePoint[] {
  const startTime = new Date(startDate).getTime();
  const endTime = new Date(endDate).getTime();

  return prices
    .filter(p => {
      const time = new Date(p.timestamp).getTime();
      return time >= startTime && time <= endTime;
    })
    .map(p => ({
      date: p.timestamp,
      price: p.price,
      value: quantity * p.price,
    }));
}

/**
 * Compute maximum drawdown from peak during price history.
 */
function computeMaxDrawdown(priceHistory: PricePoint[]): number {
  if (!priceHistory.length) return 0;

  let peak = priceHistory[0]!.value;
  let maxDD = 0;

  for (const point of priceHistory) {
    if (point.value > peak) {
      peak = point.value;
    }
    const dd = (peak - point.value) / peak;
    if (dd > maxDD) {
      maxDD = dd;
    }
  }

  return maxDD;
}

/**
 * Calculate days between two dates.
 */
function dateDiffDays(start: string, end: string): number {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const diffMs = endTime - startTime;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
