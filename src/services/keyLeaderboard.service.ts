import {
	analyticsService,
	type LeaderboardMetric,
	type KeyLeaderboardEntry,
	type KeyLeaderboardCreator,
	type RawKeyLeaderboardEntry,
} from './analytics.service';

export type {
	LeaderboardMetric,
	KeyLeaderboardEntry,
	KeyLeaderboardCreator,
	RawKeyLeaderboardEntry,
};

export class KeyLeaderboardService {
	async getKeyDiscoveryLeaderboard(
		metric: LeaderboardMetric = 'volume'
	): Promise<KeyLeaderboardEntry[]> {
		return analyticsService.getKeyDiscoveryLeaderboard(metric);
	}
}

export const keyLeaderboardService = new KeyLeaderboardService();
