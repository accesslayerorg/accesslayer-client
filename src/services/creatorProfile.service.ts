// src/services/creatorProfile.service.ts
import { ApiError, BaseApiService } from './api.service';
import { courseService } from './course.service';
import { leaderboardService } from './leaderboard.service';
import type { CreatorPublicProfile } from '@/types/creatorProfile';
import {
	aggregateCreatorProfileStats,
	filterKeysByCreator,
	resolveCreatorSocialLinks,
	toCreatorKeySummary,
} from '@/utils/creatorProfile.utils';
import { normalizeCreatorDisplayName } from '@/utils/creatorDisplayName.utils';

/** Sort order for the deployed keys grid: most traded first, then A→Z. */
function byVolumeThenTitle(
	left: { volumeStroops: number; title: string },
	right: { volumeStroops: number; title: string }
): number {
	if (right.volumeStroops !== left.volumeStroops) {
		return right.volumeStroops - left.volumeStroops;
	}
	return left.title.localeCompare(right.title);
}

class CreatorProfileService extends BaseApiService {
	/**
	 * Builds the public profile for a creator address (#1054).
	 *
	 * Every key the creator has deployed is loaded from the marketplace courses
	 * endpoint and filtered by creator address (`instructorId`), then the header
	 * fields, aggregated stats and key summaries are derived from that set.
	 *
	 * Throws a 404 `ApiError` when the address has deployed no keys so the page
	 * can render its dedicated "creator not found" state.
	 */
	async getCreatorPublicProfile(
		address: string
	): Promise<CreatorPublicProfile> {
		const normalizedAddress = address.trim();
		const courses = await courseService.getCourses();
		const keys = filterKeysByCreator(courses, normalizedAddress);

		if (keys.length === 0) {
			throw new ApiError('Creator not found', 404);
		}

		const ratingsById = await this.fetchRatingsById();
		const primary = keys[0];

		return {
			address: normalizedAddress,
			displayName:
				normalizeCreatorDisplayName(primary.name || primary.title) ||
				'Unnamed creator',
			avatarUrl: primary.avatarUri || primary.thumbnail || null,
			isVerified: keys.some(key => Boolean(key.isVerified)),
			joinedAt: primary.joinedAt || primary.createdAt || null,
			socialLinks: resolveCreatorSocialLinks(keys),
			stats: aggregateCreatorProfileStats(keys, ratingsById),
			keys: keys
				.map(key =>
					toCreatorKeySummary(key, ratingsById.get(key.id) ?? null)
				)
				.sort(byVolumeThenTitle),
		};
	}

	/**
	 * Holder ratings keyed by creator key id. Ratings only feed the "average
	 * key rating" stat, so a leaderboard failure degrades to an unrated profile
	 * instead of taking down the whole page.
	 */
	private async fetchRatingsById(): Promise<Map<string, number>> {
		try {
			const entries = await leaderboardService.getRatingsLeaderboard();
			return new Map(
				entries
					.filter(entry => Boolean(entry.id))
					.map(entry => [entry.id, entry.averageRating])
			);
		} catch {
			// Ratings are best-effort enrichment; keep the profile usable.
			return new Map();
		}
	}
}

export const creatorProfileService = new CreatorProfileService();
