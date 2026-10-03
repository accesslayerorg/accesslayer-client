import { BaseApiService, type APIResponse } from './api.service';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';

export type WalletHolding = HeldKeyPosition;

type HoldingsPayload =
	WalletHolding[] | { holdings?: WalletHolding[]; data?: WalletHolding[] };

class WalletService extends BaseApiService {
	async getHoldings(address: string): Promise<WalletHolding[]> {
		try {
			const response = await this.api.get<APIResponse<HoldingsPayload>>(
				`/wallets/${address}/holdings`
			);

			const payload = response.data.data;
			if (Array.isArray(payload)) return payload;
			if (Array.isArray(payload?.holdings)) return payload.holdings;
			if (Array.isArray(payload?.data)) return payload.data;
			return [];
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const walletService = new WalletService();

export async function fetchWalletHoldings(
	address: string
): Promise<WalletHolding[]> {
	return walletService.getHoldings(address);
}
