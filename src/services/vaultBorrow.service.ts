import { BaseApiService, type APIResponse } from './api.service';

export interface VaultPosition {
  collateral: number;
  debt: number;
  interest: number;
  healthFactor: number;
  liquidationPrice: number;
  collateralValueXlm?: number;
}

export type VaultAction = 'deposit' | 'withdraw' | 'borrow' | 'repay';

export interface VaultActionVariables {
  address: string;
  action: VaultAction;
  amount: number;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

class VaultBorrowService extends BaseApiService {
  async getPosition(address: string): Promise<VaultPosition> {
    try {
      const response = await this.api.get<APIResponse<Record<string, unknown>>>(
        `/v1/wallets/${encodeURIComponent(address)}/vault/health`
      );
      const root = response.data.data ?? {};
      const health = (root.health ?? root) as Record<string, unknown>;
      const collateral = root.collateral as Record<string, unknown> | undefined;
      const debt = root.debt as Record<string, unknown> | undefined;
      const collateralAmount = numberValue(root.collateralAmount ?? root.collateral_amount ?? collateral?.amount ?? root.collateral);
      const debtAmount = numberValue(root.debtAmount ?? root.debt_amount ?? debt?.amount ?? root.debt);
      const interest = numberValue(root.interest ?? root.accruedInterest ?? root.accrued_interest ?? root.interestAccrued);
      const healthFactor = numberValue(root.healthFactor ?? root.health_factor ?? health.healthFactor ?? health.health_factor);
      const liquidationPrice = numberValue(root.liquidationPrice ?? root.liquidation_price ?? health.liquidationPrice ?? health.liquidation_price);
      const collateralValueXlm = numberValue(root.collateralValueXlm ?? root.collateral_value_xlm ?? health.collateralValueXlm, collateralAmount);
      return { collateral: collateralAmount, debt: debtAmount, interest, healthFactor, liquidationPrice, collateralValueXlm };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async submitAction({ address, action, amount }: VaultActionVariables): Promise<{ position?: VaultPosition }> {
    try {
      const response = await this.api.post<APIResponse<{ position?: Record<string, unknown> }>>(
        `/v1/wallets/${encodeURIComponent(address)}/vault/${action}`,
        { amount }
      );
      return { position: response.data.data?.position as VaultPosition | undefined };
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export const vaultBorrowService = new VaultBorrowService();

export async function fetchVaultPosition(address: string): Promise<VaultPosition> {
  return vaultBorrowService.getPosition(address);
}

export async function submitVaultAction(variables: VaultActionVariables): Promise<{ position?: VaultPosition }> {
  return vaultBorrowService.submitAction(variables);
}
