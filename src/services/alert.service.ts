// src/services/alert.service.ts
import { BaseApiService, type APIResponse } from './api.service';

/** A user-defined price alert for a monitored key. */
export interface PriceAlert {
	id: string;
	userId: string;
	keyId: string;
	keyName: string;
	targetPrice: number;
	direction: 'above' | 'below';
	triggered?: boolean;
	createdAt?: string;
}

export interface KeyPriceResponse {
	keyId: string;
	price: number;
}

export class AlertService extends BaseApiService {
	/** Fetch active price alerts for user — GET /alerts */
	async getActiveAlerts(userId: string): Promise<PriceAlert[]> {
		try {
			const response = await this.api.get<APIResponse<PriceAlert[]>>(
				'/alerts',
				{
					params: { userId, status: 'active' },
				}
			);
			return response.data.data ?? [];
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Fetch current price for a key — GET /keys/:keyId/price */
	async getKeyPrice(keyId: string): Promise<number> {
		try {
			const response = await this.api.get<APIResponse<KeyPriceResponse>>(
				`/keys/${keyId}/price`
			);
			return response.data.data.price;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Mark alert as triggered on the backend — PATCH /alerts/:alertId/triggered */
	async markAlertTriggered(alertId: string): Promise<void> {
		try {
			await this.api.patch(`/alerts/${alertId}/triggered`);
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const alertService = new AlertService();
