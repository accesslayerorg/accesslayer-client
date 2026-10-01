import type { Course } from '@/services/course.service';
import type {
	CreatorKeyStatus,
	CreatorKeySummary,
	CreatorProfileStats,
	CreatorSocialLink,
	CreatorSocialLinkSource,
	CreatorSocialPlatform,
} from '@/types/creatorProfile';
import { formatCreatorHandle } from '@/utils/handleDisplay.utils';
import { normalizeCreatorDisplayName } from '@/utils/creatorDisplayName.utils';
import { resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';

/**
 * Pure helpers behind the public creator profile (#1054).
 *
 * Everything here is derived from the creator's deployed keys so the page can
 * be unit-tested without touching React Query or the network.
 */

/** Case-insensitive creator address comparison. Blank addresses never match. */
export function isSameCreatorAddress(
	left: string | null | undefined,
	right: string | null | undefined
): boolean {
	const a = left?.trim().toLowerCase();
	const b = right?.trim().toLowerCase();
	if (!a || !b) return false;
	return a === b;
}

/** Every key deployed by `address`, preserving the API's ordering. */
export function filterKeysByCreator(
	courses: Course[],
	address: string | null | undefined
): Course[] {
	if (!address?.trim()) return [];
	return courses.filter(course =>
		isSameCreatorAddress(course.instructorId, address)
	);
}

/** Distinct holders for a key, tolerating the API's several count fields. */
export function resolveCreatorKeyHolderCount(course: Course): number {
	const value = course.holderCount ?? course.holdersCount ?? course.holders;
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Traded volume for a key in stroops. Prefers the all-time `totalVolume` when
 * the API reports it and falls back to the rolling 24h figure otherwise.
 */
export function resolveCreatorKeyVolumeStroops(course: Course): number {
	const value = course.totalVolume ?? course.volume24h;
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Current deployment state of a key: deprecated keys can no longer be bought,
 * keys with a future scheduled drop are `scheduled`, everything else is live.
 */
export function resolveCreatorKeyStatus(
	course: Course,
	now: number = Date.now()
): CreatorKeyStatus {
	if (course.deprecated) return 'deprecated';

	if (course.nextDropAt) {
		const dropAt = Date.parse(course.nextDropAt);
		if (Number.isFinite(dropAt) && dropAt > now) return 'scheduled';
	}

	return 'live';
}

/**
 * Aggregates a creator's keys into the profile stats row.
 *
 * Volume and holder counts are summed; the rating is the mean of the ratings
 * of the keys that actually carry one (keys without a rating are excluded
 * rather than counted as zero). A creator with no rated key gets `null`.
 */
export function aggregateCreatorProfileStats(
	keys: Course[],
	ratingsById?: ReadonlyMap<string, number>
): CreatorProfileStats {
	let totalVolumeStroops = 0;
	let totalHolders = 0;
	let ratingSum = 0;
	let ratedKeyCount = 0;

	for (const key of keys) {
		totalVolumeStroops += resolveCreatorKeyVolumeStroops(key);
		totalHolders += resolveCreatorKeyHolderCount(key);

		const rating = ratingsById?.get(key.id);
		if (typeof rating === 'number' && Number.isFinite(rating) && rating > 0) {
			ratingSum += rating;
			ratedKeyCount += 1;
		}
	}

	return {
		keyCount: keys.length,
		totalVolumeStroops,
		totalHolders,
		averageRating:
			ratedKeyCount > 0
				? Math.round((ratingSum / ratedKeyCount) * 10) / 10
				: null,
		ratedKeyCount,
	};
}

const SOCIAL_LINK_LABELS: Record<CreatorSocialPlatform, string> = {
	twitter: 'X',
	website: 'Website',
	discord: 'Discord',
};

const SOCIAL_LINK_BASE_URLS: Record<CreatorSocialPlatform, string> = {
	twitter: 'https://x.com/',
	website: 'https://',
	discord: 'https://discord.gg/',
};

function toSocialLinkUrl(
	platform: CreatorSocialPlatform,
	rawValue: string
): string {
	const trimmed = rawValue.trim();
	if (/^https?:\/\//i.test(trimmed)) return trimmed;

	const path =
		platform === 'twitter'
			? trimmed.replace(/^@/, '')
			: trimmed.replace(/^\/+/, '');

	return `${SOCIAL_LINK_BASE_URLS[platform]}${path}`;
}

/**
 * Resolves the links a creator has actually published. Links are only emitted
 * when a value is present, so the page can render an empty social row by
 * simply receiving an empty array.
 *
 * The creator handle doubles as the X/Twitter link when no explicit URL is
 * set, matching how handles are surfaced elsewhere in the app.
 */
export function resolveCreatorSocialLinks(
	sources: CreatorSocialLinkSource[]
): CreatorSocialLink[] {
	const links: CreatorSocialLink[] = [];
	const seen = new Set<CreatorSocialPlatform>();

	const push = (platform: CreatorSocialPlatform, rawValue?: string | null) => {
		if (seen.has(platform)) return;
		const value = rawValue?.trim();
		if (!value) return;

		const url = toSocialLinkUrl(platform, value);
		if (!url || url === SOCIAL_LINK_BASE_URLS.website) return;

		seen.add(platform);
		links.push({ platform, label: SOCIAL_LINK_LABELS[platform], url });
	};

	for (const source of sources) {
		push('twitter', source.socialLinks?.twitter);
		push('website', source.socialLinks?.website);
		push('discord', source.socialLinks?.discord);
	}

	if (!seen.has('twitter')) {
		const handle = sources
			.map(source => source.socialHandle)
			.find(value => Boolean(value?.trim()));
		push('twitter', handle);
	}

	return links;
}

/** Maps a deployed key onto the shape the profile grid renders. */
export function toCreatorKeySummary(
	course: Course,
	rating: number | null = null,
	now?: number
): CreatorKeySummary {
	return {
		id: course.id,
		title:
			normalizeCreatorDisplayName(course.title || course.name) ||
			'Unnamed key',
		handle: formatCreatorHandle(course.socialHandle || course.instructorId),
		avatarUrl: course.avatarUri || course.thumbnail || null,
		category: course.category || null,
		priceStroops: resolveCreatorKeyPriceStroops(course),
		status: resolveCreatorKeyStatus(course, now),
		holderCount: resolveCreatorKeyHolderCount(course),
		volumeStroops: resolveCreatorKeyVolumeStroops(course),
		rating,
	};
}

/** Formats an ISO join date as `Mar 2024`; `null` for missing/invalid dates. */
export function formatMemberSince(joinedAt?: string | null): string | null {
	if (!joinedAt) return null;
	const date = new Date(joinedAt);
	if (Number.isNaN(date.getTime())) return null;

	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		year: 'numeric',
	}).format(date);
}
