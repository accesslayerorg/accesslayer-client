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
