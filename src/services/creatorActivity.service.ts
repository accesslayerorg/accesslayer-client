// src/services/creatorActivity.service.ts
import { BaseApiService, type APIResponse } from './api.service';

/**
 * A single trade entry on a creator's public activity feed.
 *
 * Mirrors the shape consumed by the existing `TransactionHistory`
 * component so the feed can pass entries straight through.
 */
export interface CreatorActivityTrade {
	id: string;
	type: 'buy' | 'sell';
	traderHandle: string;
	amount: number;
	price: number;
	timestamp: number;
	txHash: string;
	status: 'completed' | 'pending' | 'failed';
}

class CreatorActivityService extends BaseApiService {
	async getCreatorActivity(creatorId: string): Promise<CreatorActivityTrade[]> {
		try {
			const response = await this.api.get<APIResponse<CreatorActivityTrade[]>>(
				`/creators/${creatorId}/activity`
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const creatorActivityService = new CreatorActivityService();
