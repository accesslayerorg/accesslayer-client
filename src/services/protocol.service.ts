import { BaseApiService, type APIResponse } from './api.service';

export interface ProtocolStats {
	totalVolume: number;
	activeKeys: number;
	totalHolders: number;
	trades24h: number;
	volumeChange24h?: number;
	tradesChange24h?: number;
}

class ProtocolService extends BaseApiService {
	/**
	 * Fetch macro-level protocol stats.
	 * GET /protocol/stats
	 */
	async getProtocolStats(): Promise<ProtocolStats> {
		try {
			const response =
				await this.api.get<APIResponse<ProtocolStats>>('/protocol/stats');
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const protocolService = new ProtocolService();
