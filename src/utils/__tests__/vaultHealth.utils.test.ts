import { describe, expect, it } from 'vitest';
import { getHealthBand, previewHealthFactor } from '../vaultHealth.utils';

describe('vault health utilities', () => {
  it('classifies safe, caution, and danger bands', () => {
    expect(getHealthBand(1.5)).toBe('safe');
    expect(getHealthBand(1.2)).toBe('caution');
    expect(getHealthBand(0.9)).toBe('danger');
  });

  it('previews borrow and repayment health', () => {
    expect(previewHealthFactor(100, 50, 0, 0, 20)).toBeCloseTo(100 / 70);
    expect(previewHealthFactor(100, 50, 0, 0, -20)).toBeCloseTo(100 / 30);
  });

  it('previews collateral deposits and withdrawals', () => {
    expect(previewHealthFactor(100, 50, 0, 25, 0)).toBe(125 / 50);
    expect(previewHealthFactor(100, 50, 0, -25, 0)).toBe(75 / 50);
  });
});
