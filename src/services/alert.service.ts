import { BaseApiService, type APIResponse } from './api.service';

export type AlertDirection = 'above' | 'below';

export interface PriceAlert {
	id: string;
	userId?: string;
	keyId: string;
	keyName?: string;
	keyTitle?: string;
	targetPrice: number;
	direction: AlertDirection;
	triggered?: boolean;
	createdAt?: string;
}

class AlertService extends BaseApiService {
	/** Fetch user's active price alerts — GET /alerts */
	async getActiveAlerts(userId: string): Promise<PriceAlert[]> {
		try {
			const response = await this.api.get<
				APIResponse<PriceAlert[] | { alerts: PriceAlert[] }>
			>(`/alerts`, { params: { userId, active: true } });

			const raw = response.data.data;
			if (Array.isArray(raw)) return raw;
			if (raw && typeof raw === 'object' && 'alerts' in raw && Array.isArray(raw.alerts)) {
				return raw.alerts;
			}
			return [];
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Mark alert as triggered on backend — PATCH /alerts/:alertId/triggered */
	async markAlertTriggered(alertId: string): Promise<void> {
		try {
			await this.api.patch(`/alerts/${alertId}/triggered`);
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const alertService = new AlertService();
