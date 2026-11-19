import {
	ANNOUNCEMENT_CATEGORIES,
	type AnnouncementCategory,
} from '@/services/announcement.service';

export const ANNOUNCEMENT_CONTENT_MAX_LENGTH = 2000;

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> =
	{
		update: 'Update',
		event: 'Event',
		milestone: 'Milestone',
		general: 'General',
	};

export interface AnnouncementDraft {
	title: string;
	category: AnnouncementCategory;
	content: string;
}

/** Returns the first blocking validation message for a draft, or null (#1159). */
export function validateAnnouncementDraft(
	draft: AnnouncementDraft
): string | null {
	if (!draft.title.trim()) return 'Add a title for your announcement.';
	if (!ANNOUNCEMENT_CATEGORIES.includes(draft.category)) {
		return 'Choose a valid category.';
	}
	if (!draft.content.trim()) return 'Write the announcement content.';
	if (draft.content.length > ANNOUNCEMENT_CONTENT_MAX_LENGTH) {
		return `Content must be ${ANNOUNCEMENT_CONTENT_MAX_LENGTH} characters or fewer.`;
	}
	return null;
}

/** Formats an ISO date for the posted announcements list (#1159). */
export function formatAnnouncementDate(iso: string): string {
	const date = new Date(iso);
	return Number.isNaN(date.getTime())
		? ''
		: date.toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			});
}
