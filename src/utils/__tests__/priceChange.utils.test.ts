// src/utils/__tests__/priceChange.utils.test.ts
import { describe, expect, it } from 'vitest';
import { computePriceChange } from '../priceChange.utils';

describe('computePriceChange', () => {
  describe('price up', () => {
    it('returns positive percent and direction up when price increases', () => {
      const result = computePriceChange(112n, 100n);
      expect(result.direction).toBe('up');
      expect(result.percent).toBeCloseTo(12);
    });

    it('handles a large price increase', () => {
      const result = computePriceChange(200n, 100n);
      expect(result.direction).toBe('up');
      expect(result.percent).toBeCloseTo(100);
    });
  });

  describe('price down', () => {
    it('returns negative percent and direction down when price decreases', () => {
      const result = computePriceChange(88n, 100n);
      expect(result.direction).toBe('down');
      expect(result.percent).toBeCloseTo(-12);
    });

    it('handles a large price decrease', () => {
      const result = computePriceChange(1n, 100n);
      expect(result.direction).toBe('down');
      expect(result.percent).toBeCloseTo(-99);
    });
  });

  describe('flat — no change', () => {
    it('returns flat with 0 percent when current equals previous', () => {
      const result = computePriceChange(100n, 100n);
      expect(result.direction).toBe('flat');
      expect(result.percent).toBe(0);
    });
  });

  describe('flat — zero previous value', () => {
    it('returns flat with 0 percent when previous is zero', () => {
      const result = computePriceChange(100n, 0n);
      expect(result.direction).toBe('flat');
      expect(result.percent).toBe(0);
    });

    it('returns flat when both current and previous are zero', () => {
      const result = computePriceChange(0n, 0n);
      expect(result.direction).toBe('flat');
      expect(result.percent).toBe(0);
    });
  });
});