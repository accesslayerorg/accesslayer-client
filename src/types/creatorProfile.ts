/**
 * Public creator profile types (#1054).
 *
 * A creator (identified by their wallet address) can deploy several creator
 * keys. The public profile page joins those keys into a single view with
 * aggregated stats, published social links and a follow button.
 */

/** Optional social links a creator can publish on their public profile. */
export interface CreatorSocialLinks {
	twitter?: string | null;
	website?: string | null;
	discord?: string | null;
}

/**
 * Minimal shape needed to resolve a creator's published social links. Creator
 * keys (and the creator record derived from them) structurally satisfy this.
 */
export interface CreatorSocialLinkSource {
	socialHandle?: string | null;
	socialLinks?: CreatorSocialLinks | null;
}

export type CreatorSocialPlatform = 'twitter' | 'website' | 'discord';

export interface CreatorSocialLink {
	platform: CreatorSocialPlatform;
	/** Human-readable label rendered on the link chip. */
	label: string;
	url: string;
}

/** Deployment state of a creator key on the public profile grid. */
export type CreatorKeyStatus = 'live' | 'scheduled' | 'deprecated';

/** Aggregated stats across every key a creator has deployed. */
export interface CreatorProfileStats {
	/** Number of keys the creator has deployed. */
	keyCount: number;
	/** Cumulative traded volume across every key, in stroops. */
	totalVolumeStroops: number;
	/** Distinct key holders summed across every key. */
	totalHolders: number;
	/** Mean holder rating across rated keys; `null` when nothing is rated. */
	averageRating: number | null;
	/** How many keys carry a rating (the denominator for `averageRating`). */
	ratedKeyCount: number;
}

/** A single deployed key as rendered in the public profile grid. */
export interface CreatorKeySummary {
	id: string;
	title: string;
	/** Display-normalised handle, e.g. `@arivers`. Empty when unknown. */
	handle: string;
	avatarUrl: string | null;
	category: string | null;
	priceStroops: number | null;
	status: CreatorKeyStatus;
	holderCount: number;
	volumeStroops: number;
	rating: number | null;
}

/** Everything the public creator profile page renders. */
export interface CreatorPublicProfile {
	/** Creator wallet address the profile was requested for. */
	address: string;
	displayName: string;
	avatarUrl: string | null;
	isVerified: boolean;
	/** ISO timestamp the creator joined; `null` when unknown. */
	joinedAt: string | null;
	socialLinks: CreatorSocialLink[];
	stats: CreatorProfileStats;
	keys: CreatorKeySummary[];
}
