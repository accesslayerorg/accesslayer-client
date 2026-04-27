import { formatRelativeTime as sharedFormatRelativeTime } from '@/utils/time.utils';

export interface TooltipContent {
	lastUpdated?: string | null;
	quoteSource?: string | null;
}

export function formatRelativeTime(iso: string | null | undefined): string {
	if (iso == null) return 'Last updated: N/A';
	const relative = sharedFormatRelativeTime(iso, { prefix: 'Updated' });
	return relative === 'N/A' ? 'Last updated: N/A' : relative;
}
