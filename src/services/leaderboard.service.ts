import { BaseApiService, type APIResponse } from './api.service';

export type VolumeWindow = '24h' | '7d';
export type RatingLeaderboardSort = 'rating' | 'reviews';

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

interface RatingLeaderboardApiEntry {
        id?: string;
        creatorId?: string;
        title?: string;
        name?: string;
        thumbnail?: string;
        avatarUri?: string;
        price?: number | string;
        currentPrice?: number | string;
        averageRating?: number | string;
        rating?: number | string;
        ratingScore?: number | string;
        aggregateHolderRating?: number | string;
        reviewCount?: number | string;
        reviews?: number | string;
        holderReviewCount?: number | string;
}

export interface RatingLeaderboardEntry {
        id: string;
        title: string;
        thumbnail?: string;
        price: number;
        averageRating: number;
        reviewCount: number;
}

function getFiniteNumber(
        ...values: Array<number | string | null | undefined>
): number {
        for (const value of values) {
                const parsedValue =
                        typeof value === 'string' ? Number(value) : value;

                if (typeof parsedValue === 'number' && Number.isFinite(parsedValue)) {
                        return parsedValue;
                }
        }

        return 0;
}

function normalizeRatingEntry(entry: RatingLeaderboardApiEntry): RatingLeaderboardEntry {
        const id = entry.id ?? entry.creatorId ?? '';

        return {
                id,
                title: entry.title ?? entry.name ?? 'Unnamed creator',
                thumbnail: entry.thumbnail ?? entry.avatarUri,
                price: getFiniteNumber(entry.price, entry.currentPrice),
                averageRating: getFiniteNumber(
                        entry.averageRating,
                        entry.rating,
                        entry.ratingScore,
                        entry.aggregateHolderRating
                ),
                reviewCount: getFiniteNumber(
                        entry.reviewCount,
                        entry.reviews,
                        entry.holderReviewCount
                ),
        };
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

        async getRatingsLeaderboard(): Promise<RatingLeaderboardEntry[]> {
                try {
                        const response = await this.api.get<
                                APIResponse<RatingLeaderboardApiEntry[]>
                        >('/leaderboard/ratings');

                        return (response.data.data ?? [])
                                .map(normalizeRatingEntry)
                                .filter(entry => entry.id);
                } catch (error) {
                        throw this.handleError(error);
                }
        }
}

export const leaderboardService = new LeaderboardService();
