import { BaseApiService, type APIResponse } from './api.service';

export type ActivityType = 'buy' | 'sell';

export interface GlobalActivityTrade {
	id: string;
	walletAddress: string;
	type: ActivityType;
	creatorName: string;
	creatorId: string;
	quantity: number;
	timestamp: number;
}

class GlobalActivityService extends BaseApiService {
	async getRecentActivity(limit = 5): Promise<GlobalActivityTrade[]> {
		try {
			const response = await this.api.get<APIResponse<GlobalActivityTrade[]>>(
				'/activity/recent',
				{ params: { limit } }
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const globalActivityService = new GlobalActivityService();
