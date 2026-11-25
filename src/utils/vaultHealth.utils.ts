export type HealthBand = 'safe' | 'caution' | 'danger';

export function getHealthBand(healthFactor: number): HealthBand {
  if (healthFactor >= 1.3) return 'safe';
  if (healthFactor >= 1) return 'caution';
  return 'danger';
}

export function previewHealthFactor(collateral: number, debt: number, interest = 0, collateralDelta = 0, debtDelta = 0): number {
  const nextCollateral = Math.max(0, collateral + collateralDelta);
  const nextDebt = Math.max(0, debt + debtDelta);
  const obligations = nextDebt + interest;
  return obligations > 0 ? nextCollateral / obligations : 999;
}

export function isActionHealthy(healthFactor: number): boolean {
  return healthFactor >= 1;
}
