import { BaseApiService, type APIResponse } from './api.service';

export type VolumeWindow = '24h' | '7d';

export interface LeaderboardEntry {
	rank: number;
	id: string;
	title: string;
	thumbnail?: string;
	price: number;
	/** 24-hour trading volume. */
	volume24h: number;
	/** 7-day trading volume. */
	volume7d: number;
	/** Price change percentage over the selected window (e.g. 5.2 = +5.2%). */
	change24h: number;
	/** Kept for backward compat; callers should prefer volume24h / volume7d. */
	totalVolume: number;
}

class LeaderboardService extends BaseApiService {
	async getVolumeLeaderboard(
		window: VolumeWindow = '24h'
	): Promise<LeaderboardEntry[]> {
		try {
			const response = await this.api.get<APIResponse<LeaderboardEntry[]>>(
				'/leaderboard/volume',
				{ params: { window } }
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const leaderboardService = new LeaderboardService();
