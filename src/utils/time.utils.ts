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

export function formatAbsoluteDateTime(
	input: string | number | Date | null | undefined
): string | null {
	if (input == null) return null;
	const date = input instanceof Date ? input : new Date(input);
	if (Number.isNaN(date.getTime())) return null;

	return new Intl.DateTimeFormat(undefined, {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
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

