// src/services/keyMetrics.service.ts
import { BaseApiService, type APIResponse } from './api.service';

export interface CurveMilestone {
	/** Human-readable milestone name, e.g. "Tier 2". */
	label: string;
	/** Progress towards the next milestone, 0–100. */
	progressPercent: number;
}

/** Market metrics used by the key comparison page. */
export interface KeyMetrics {
	creatorId: string;
	/** Current key price in XLM. */
	price: number;
	/** 24h trading volume in XLM. */
	volume24h: number;
	holders: number;
	/** Distinct wallets that traded the key in the last 30 days. */
	uniqueTraders: number;
	/** Average community rating, 0–5. `null` when unrated. */
	rating: number | null;
	curveMilestone: CurveMilestone | null;
	/** Annualised holder yield as a percentage. `null` when not applicable. */
	yieldPercent: number | null;
}

class KeyMetricsService extends BaseApiService {
	/** GET /creators/:id/metrics */
	async getKeyMetrics(creatorId: string): Promise<KeyMetrics> {
		try {
			const response = await this.api.get<APIResponse<KeyMetrics>>(
				`/creators/${creatorId}/metrics`
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const keyMetricsService = new KeyMetricsService();
