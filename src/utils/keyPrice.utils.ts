import { formatRelativeTime as sharedFormatRelativeTime } from '@/utils/time.utils';

export interface TooltipContent {
	lastUpdated?: string | null;
	quoteSource?: string | null;
}

/**
 * Formats a timestamp for key price tooltip display.
 * Uses consistent timestamp tooltip formatting with:
 * - Relative time as primary display (e.g., "Updated 2 hr ago")
 * - Absolute time in tooltip on hover (via title attribute)
 *
 * @param iso - ISO 8601 timestamp string or null/undefined
 * @returns Object with formatted display string and hover title
 */
export function formatTimestampTooltip(iso: string | null | undefined): {
	display: string;
	title: string | null;
} {
	if (iso == null) return { display: 'Last updated: N/A', title: null };
	const relative = sharedFormatRelativeTime(iso, { prefix: 'Updated' });
	return relative.includes('N/A')
		? { display: 'Last updated: N/A', title: null }
		: { display: relative, title: null };
}

/**
 * @deprecated Use formatTimestampTooltip instead for consistent tooltip formatting.
 * Formats relative time for key price display.
 */
export function formatRelativeTime(iso: string | null | undefined): string {
	if (iso == null) return 'Last updated: N/A';
	const relative = sharedFormatRelativeTime(iso, { prefix: 'Updated' });
	return relative.includes('N/A') ? 'Last updated: N/A' : relative;
}
