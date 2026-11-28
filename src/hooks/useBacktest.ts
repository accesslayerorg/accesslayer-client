/**
 * React Query hooks for backtest simulator (#1473)
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  fetchHistoricalPrices,
  fetchXlmPrices,
  fetchKeyExistenceDate,
  calculateBacktest,
} from '@/services/backtest.service';
import type {
  HistoricalPrice,
  BacktestParams,
  BacktestResult,
} from '@/types/backtest.types';

/**
 * Query: historical prices for a key within a date range
 */
export function useHistoricalPrices(
  keyId: string,
  range: { start: string; end: string }
) {
  const rangeKey = `${range.start}_${range.end}`;

  return useQuery({
    queryKey: queryKeys.backtest.historicalPrices(keyId, rangeKey),
    queryFn: () => fetchHistoricalPrices(keyId, range),
    enabled: !!keyId && !!range.start && !!range.end,
  });
}

/**
 * Query: XLM historical prices for comparison
 */
export function useXlmPrices(range: { start: string; end: string }) {
  const rangeKey = `${range.start}_${range.end}`;

  return useQuery({
    queryKey: queryKeys.backtest.xlmPrices(rangeKey),
    queryFn: () => fetchXlmPrices(range),
    enabled: !!range.start && !!range.end,
  });
}

/**
 * Query: when a key was created/deployed
 */
export function useKeyCreatedDate(keyId: string) {
  return useQuery({
    queryKey: queryKeys.backtest.keyCreatedDate(keyId),
    queryFn: () => fetchKeyExistenceDate(keyId),
    enabled: !!keyId,
    staleTime: Infinity, // Never changes
  });
}

/**
 * Compute backtest locally after prices are loaded.
 * Returns null if data is insufficient.
 */
export function useBacktestComputation(
  keyPrices: HistoricalPrice[] | undefined,
  xlmPrices: HistoricalPrice[] | undefined,
  params: BacktestParams,
  fees: { protocolFee: number; creatorFee: number }
): BacktestResult | null {
  if (!keyPrices?.length || !xlmPrices?.length || !params.keyId) {
    return null;
  }

  try {
    return calculateBacktest(keyPrices, xlmPrices, params, fees);
  } catch {
    return null;
  }
}
