import { BaseApiService, type APIResponse } from './api.service';

export type PriceAlertDirection = 'above' | 'below';

export interface PriceAlert {
	id: string;
	keyId: string;
	keyName?: string;
	targetPrice: number;
	direction: PriceAlertDirection;
	active: boolean;
	createdAt?: number;
}

export interface CreatePriceAlertInput {
	keyId: string;
	targetPrice: number;
	direction: PriceAlertDirection;
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null
		? (value as Record<string, unknown>)
		: {};
}

function normalizeTimestamp(value: unknown): number | undefined {
	if (typeof value !== 'string' && typeof value !== 'number') return undefined;
	const numeric = typeof value === 'number' ? value : Number(value);
	if (Number.isFinite(numeric) && numeric > 0) return numeric;
	const parsed = new Date(String(value)).getTime();
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizePriceAlert(value: unknown): PriceAlert {
	const raw = asRecord(value);
	const key = asRecord(raw.key);
	const target = Number(raw.targetPrice ?? raw.price ?? raw.threshold);
	const direction = String(raw.direction ?? raw.condition).toLowerCase();

	return {
		id: String(raw.id ?? raw._id ?? raw.alertId),
		keyId: String(raw.keyId ?? key.id ?? ''),
		keyName:
			typeof (raw.keyName ?? raw.title ?? key.title ?? key.name) === 'string'
				? String(raw.keyName ?? raw.title ?? key.title ?? key.name)
				: undefined,
		targetPrice: Number.isFinite(target) ? target : 0,
		direction: direction === 'below' ? 'below' : 'above',
		active: raw.active == null ? true : Boolean(raw.active),
		createdAt: normalizeTimestamp(raw.createdAt ?? raw.created_at),
	};
}

function normalizePriceAlerts(value: unknown): PriceAlert[] {
	const direct = Array.isArray(value) ? value : asRecord(value).alerts;
	return Array.isArray(direct) ? direct.map(normalizePriceAlert) : [];
}

class PriceAlertService extends BaseApiService {
	async getPriceAlerts(): Promise<PriceAlert[]> {
		try {
			const response = await this.api.get<APIResponse<unknown>>('/alerts');
			return normalizePriceAlerts(response.data.data);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async createPriceAlert(input: CreatePriceAlertInput): Promise<PriceAlert> {
		try {
			// Send the issue contract exactly as specified. Amounts remain
			// numbers here; the backend owns unit conversion and persistence.
			const response = await this.api.post<APIResponse<unknown>>('/alerts', {
				keyId: input.keyId,
				targetPrice: input.targetPrice,
				direction: input.direction,
			});
			const data = response.data.data;
			return normalizePriceAlert(asRecord(data).alert ?? data);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async deletePriceAlert(alertId: string): Promise<void> {
		try {
			await this.api.delete(`/alerts/${encodeURIComponent(alertId)}`);
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const priceAlertService = new PriceAlertService();
