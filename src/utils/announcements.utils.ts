import type { ActionAttribution } from '@/utils/actionAttribution.utils';

/**
 * Announcement category chips (#1175).
 * Each category has its own colour so the feed is scannable at a glance.
 */

export type AnnouncementCategory =
	| 'general'
	| 'update'
	| 'event'
	| 'warning'
	| 'launch';

export const ANNOUNCEMENT_CATEGORY_COLOURS: Record<
	AnnouncementCategory,
	string
> = {
	general: 'bg-white/10 text-white/70 border-white/15',
	update: 'bg-sky-400/15 text-sky-200 border-sky-400/30',
	event: 'bg-violet-400/15 text-violet-200 border-violet-400/30',
	warning: 'bg-amber-400/15 text-amber-200 border-amber-400/30',
	launch: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30',
};

const VALID: readonly AnnouncementCategory[] = [
	'general',
	'update',
	'event',
	'warning',
	'launch',
];

export function normalizeAnnouncementCategory(
	value: unknown
): AnnouncementCategory {
	if (typeof value !== 'string') return 'general';
	const match = VALID.find(
		c => c.toLowerCase() === value.trim().toLowerCase()
	);
	return match ?? 'general';
}

export function categoryColour(category: AnnouncementCategory): string {
	return (
		ANNOUNCEMENT_CATEGORY_COLOURS[category] ??
		ANNOUNCEMENT_CATEGORY_COLOURS.general
	);
}

export interface Announcement {
	id: string;
	title: string;
	category: AnnouncementCategory;
	/** ISO timestamp of the post. */
	publishedAt: string;
	/** Short preview shown when collapsed. */
	summary: string;
	/** Wallet that posted it, when the API attributes the post (#1224). */
	postedBy?: ActionAttribution | null;
}

export interface AnnouncementPage {
	announcements: Announcement[];
	/** Next page number, or null when exhausted. */
	nextPage: number | null;
}
