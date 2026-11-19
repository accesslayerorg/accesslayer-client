import { BaseApiService, type APIResponse } from './api.service';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';
import type {
	WalletBadge,
	WalletBadgeMetrics,
} from '@/utils/walletBadges.utils';

export type WalletHolding = HeldKeyPosition;

type BadgesPayload = WalletBadge[] | { badges?: WalletBadge[] };

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

	async getBadges(address: string): Promise<WalletBadge[]> {
		try {
			const response = await this.api.get<APIResponse<BadgesPayload>>(
				`/wallets/${address}/badges`
			);

			const payload = response.data.data;
			if (Array.isArray(payload)) return payload;
			if (Array.isArray(payload?.badges)) return payload.badges;
			return [];
		} catch (error) {
			const apiError = this.handleError(error);
			// The badges endpoint may not exist yet; treat it as no badges.
			if (apiError.status === 404) return [];
			throw apiError;
		}
	}

	/**
	 * Activity counters badge criteria are measured against (#1225).
	 * GET /wallets/:address/badge-metrics
	 */
	async getBadgeMetrics(
		address: string
	): Promise<Partial<WalletBadgeMetrics>> {
		try {
			const response = await this.api.get<
				APIResponse<Partial<WalletBadgeMetrics> | null>
			>(`/wallets/${address}/badge-metrics`);
			return response.data.data ?? {};
		} catch (error) {
			const apiError = this.handleError(error);
			// Like badges, a missing endpoint means no recorded progress yet.
			if (apiError.status === 404) return {};
			throw apiError;
		}
	}
}

export const walletService = new WalletService();

export async function fetchWalletHoldings(
	address: string
): Promise<WalletHolding[]> {
	return walletService.getHoldings(address);
}

export async function fetchWalletBadges(
	address: string
): Promise<WalletBadge[]> {
	return walletService.getBadges(address);
}

export async function fetchWalletBadgeMetrics(
	address: string
): Promise<Partial<WalletBadgeMetrics>> {
	return walletService.getBadgeMetrics(address);
}
