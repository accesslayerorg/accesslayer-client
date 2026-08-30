import { BaseApiService, type APIResponse } from './api.service';

export interface LeaderboardEntry {
	rank: number;
	id: string;
	title: string;
	thumbnail?: string;
	totalVolume: number;
	change24h: number;
}

class LeaderboardService extends BaseApiService {
	async getVolumeLeaderboard(): Promise<LeaderboardEntry[]> {
		try {
			const response =
				await this.api.get<APIResponse<LeaderboardEntry[]>>(
					'/leaderboard/volume'
				);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const leaderboardService = new LeaderboardService();
