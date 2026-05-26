const COMPACT_RECENT_ACTIVITY_TIMESTAMP_PATTERN =
	/^(just now|\d+\s?(?:s|sec|secs|m|min|mins|h|hr|hrs|d|day|days)\s+ago)$/i;

const RECENT_ACTIVITY_TIMESTAMP_FALLBACK = 'Time unavailable';

export function formatRecentActivityCompactTimestamp(
	compactTimestamp: string | null | undefined
): string {
	const normalized = compactTimestamp?.trim();

	if (!normalized) {
		return RECENT_ACTIVITY_TIMESTAMP_FALLBACK;
	}

	return COMPACT_RECENT_ACTIVITY_TIMESTAMP_PATTERN.test(normalized)
		? normalized
		: RECENT_ACTIVITY_TIMESTAMP_FALLBACK;
}
