export interface RelativeTimeOptions {
	/**
	 * Optional prefix included before the relative value.
	 * Example: prefix="Updated" -> "Updated 2 min ago"
	 */
	prefix?: string;
	/**
	 * Controls whether to include "ago" wording for past times.
	 * Defaults to true.
	 */
	includeAgo?: boolean;
}

export interface TimestampTooltipOptions {
	/**
	 * Timezone to use for absolute timestamp display.
	 * Defaults to system timezone via Intl.DateTimeFormat(undefined).
	 */
	timeZone?: string;
	/**
	 * Whether to show absolute timestamp in parentheses after relative time.
	 * Defaults to true.
	 */
	showAbsolute?: boolean;
}

/**
 * Formats a timestamp for tooltip display with consistent pattern:
 * - Relative time as primary display (e.g., "2 hr ago")
 * - Absolute time in tooltip on hover (via title attribute)
 * - Optional absolute time in parentheses
 *
 * @param input - Timestamp as string, number, Date, or null/undefined
 * @param options - Configuration options for formatting
 * @returns Object with formatted strings and hover title
 */
export function formatTimestampTooltip(
	input: string | number | Date | null | undefined,
	options: TimestampTooltipOptions = {}
): { display: string; title: string | null } {
	const { timeZone, showAbsolute = true } = options;

	const absolute =
		input != null ? formatAbsoluteDateTime(input, { timeZone }) : null;
	const relative = input != null ? formatRelativeTime(input) : 'N/A';

	if (input == null) {
		return { display: 'N/A', title: null };
	}

	const display =
		showAbsolute && absolute ? `${relative} (${absolute})` : relative;

	return { display, title: absolute };
}

export interface AbsoluteDateTimeOptions {
	/**
	 * Timezone to use for formatting.
	 * Defaults to system timezone via Intl.DateTimeFormat(undefined).
	 */
	timeZone?: string;
}

export function formatAbsoluteDateTime(
	input: string | number | Date | null | undefined,
	options: AbsoluteDateTimeOptions = {}
): string | null {
	const { timeZone } = options;
	if (input == null) return null;
	const date = input instanceof Date ? input : new Date(input);
	if (Number.isNaN(date.getTime())) return null;

	return new Intl.DateTimeFormat(undefined, {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		timeZone,
	}).format(date);
}

export function formatRelativeTimeLabel(date: Date, now: Date = new Date()): string {
	const diffMs = now.getTime() - date.getTime();
	const diffSec = Math.floor(diffMs / 1000);

	if (diffSec < 60) return 'just now';

	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) return `${diffMin} minutes ago`;

	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return `${diffHr} hours ago`;

	const diffDay = Math.floor(diffHr / 24);
	if (diffDay < 30) return `${diffDay} days ago`;

	return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Formats the time elapsed since `startMs`, e.g. `8s` or `2m 05s`.
 * Used by the pending-transaction drawer to show how long a submission has
 * been waiting for ledger inclusion.
 */
export function formatElapsedTime(
	startMs: number,
	nowMs: number = Date.now()
): string {
	const elapsedSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
	if (elapsedSec < 60) return `${elapsedSec}s`;

	const elapsedMin = Math.floor(elapsedSec / 60);
	const seconds = elapsedSec % 60;
	if (elapsedMin < 60) {
		return `${elapsedMin}m ${String(seconds).padStart(2, '0')}s`;
	}

	const hours = Math.floor(elapsedMin / 60);
	return `${hours}h ${String(elapsedMin % 60).padStart(2, '0')}m`;
}

export function formatRelativeTime(
	input: string | number | Date | null | undefined,
	options: RelativeTimeOptions = {}
): string {
	const { prefix, includeAgo = true } = options;
	if (input == null) return prefix ? `${prefix}: N/A` : 'N/A';

	const date = input instanceof Date ? input : new Date(input);
	if (Number.isNaN(date.getTime())) return prefix ? `${prefix}: N/A` : 'N/A';

	const diffMs = Date.now() - date.getTime();
	const diffSec = Math.floor(Math.abs(diffMs) / 1000);

	const isFuture = diffMs < 0;
	if (diffSec < 60) return prefix ? `${prefix} just now` : 'just now';

	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) {
		const core = `${diffMin} min`;
		const suffix = isFuture ? 'from now' : includeAgo ? 'ago' : '';
		return [prefix, core, suffix].filter(Boolean).join(' ');
	}

	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) {
		const core = `${diffHr} hr`;
		const suffix = isFuture ? 'from now' : includeAgo ? 'ago' : '';
		return [prefix, core, suffix].filter(Boolean).join(' ');
	}

	const diffDay = Math.floor(diffHr / 24);
	const core = `${diffDay} day${diffDay === 1 ? '' : 's'}`;
	const suffix = isFuture ? 'from now' : includeAgo ? 'ago' : '';
	return [prefix, core, suffix].filter(Boolean).join(' ');
}
