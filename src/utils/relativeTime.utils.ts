/**
 * Formats a date as a human-readable relative time label for activity feeds.
 *
 * @param date - The date to format
 * @param now - Reference point for "now" (defaults to `new Date()`; injectable for deterministic tests)
 * @returns A relative label such as "just now", "5 minutes ago", "2 hours ago",
 *          "3 days ago", or a formatted date string like "12 Jan 2026".
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
	const diffMs = now.getTime() - date.getTime();
	const diffSec = Math.floor(diffMs / 1_000);
	const diffMin = Math.floor(diffMs / 60_000);
	const diffHrs = Math.floor(diffMs / 3_600_000);
	const diffDays = Math.floor(diffMs / 86_400_000);

	if (diffSec < 60) {
		return 'just now';
	}

	if (diffMin < 60) {
		return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
	}

	if (diffHrs < 24) {
		return `${diffHrs} ${diffHrs === 1 ? 'hour' : 'hours'} ago`;
	}

	if (diffDays < 30) {
		return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
	}

	return date.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}
