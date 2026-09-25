// src/utils/priceChange.utils.ts

/**
 * Result of a price change computation between two key price values.
 */
export interface PriceChangeResult {
  /** Percentage change as a number, e.g. 12.4 or -3.1. Always 0 when direction is 'flat'. */
  percent: number;
  /** Direction of the price movement relative to the previous value. */
  direction: 'up' | 'down' | 'flat';
}

/**
 * Computes the percentage price change between two key price values expressed
 * in stroops (bigint).
 *
 * Returns `flat` with `percent: 0` when:
 * - `previous` is zero (division by zero is undefined)
 * - `current` equals `previous` (no change)
 *
 * @param current  - The current key price in stroops
 * @param previous - The previous key price in stroops
 * @returns        PriceChangeResult with percent and direction
 *
 * @example
 * computePriceChange(112n, 100n) // { percent: 12, direction: 'up' }
 * computePriceChange(88n, 100n)  // { percent: -12, direction: 'down' }
 * computePriceChange(100n, 100n) // { percent: 0, direction: 'flat' }
 * computePriceChange(100n, 0n)   // { percent: 0, direction: 'flat' }
 */
export function computePriceChange(
  current: bigint,
  previous: bigint
): PriceChangeResult {
  if (previous === 0n || current === previous) {
    return { percent: 0, direction: 'flat' };
  }

  const percent =
    (Number(current - previous) / Number(previous)) * 100;

  return {
    percent,
    direction: percent > 0 ? 'up' : 'down',
  };
}