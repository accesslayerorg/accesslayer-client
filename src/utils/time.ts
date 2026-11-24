import { useTimezone, getBrowserTimezone } from '@/hooks/useTimezone';

export function getEffectiveTimezone(zoneOverride?: string): string {
	if (zoneOverride) return zoneOverride;
	try {
		return useTimezone.getState().getEffectiveZone();
	} catch {
		return getBrowserTimezone();
	}
}

/**
 * Formats date and time consistently with user's selected timezone using Intl.DateTimeFormat.
 */
export function formatDateTime(
	input: string | number | Date | null | undefined,
	options: {
		timeZone?: string;
		dateStyle?: 'full' | 'long' | 'medium' | 'short';
		timeStyle?: 'full' | 'long' | 'medium' | 'short';
		includeZone?: boolean;
	} = {}
): string {
	if (input == null) return 'N/A';
	const date = input instanceof Date ? input : new Date(input);
	if (Number.isNaN(date.getTime())) return 'N/A';

	const timeZone = getEffectiveTimezone(options.timeZone);

	const formatter = new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: options.timeStyle === 'full' || options.timeStyle === 'long' ? '2-digit' : undefined,
		timeZone,
		timeZoneName: options.includeZone ? 'short' : undefined,
	});

	return formatter.format(date);
}

/**
 * Formats date consistently with user's selected timezone using Intl.DateTimeFormat.
 */
export function formatDate(
	input: string | number | Date | null | undefined,
	options: {
		timeZone?: string;
		format?: 'short' | 'medium' | 'long';
	} = {}
): string {
	if (input == null) return 'N/A';
	const date = input instanceof Date ? input : new Date(input);
	if (Number.isNaN(date.getTime())) return 'N/A';

	const timeZone = getEffectiveTimezone(options.timeZone);
	const monthOption =
		options.format === 'short'
			? 'numeric'
			: options.format === 'long'
				? 'long'
				: 'short';

	const formatter = new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: monthOption,
		day: 'numeric',
		timeZone,
	});

	return formatter.format(date);
}

/**
 * Formats relative time (e.g., 'just now', '5 min ago', '2 hr ago', '3 days ago').
 */
export function formatRelative(
	input: string | number | Date | null | undefined,
	now: Date = new Date()
): string {
	if (input == null) return 'N/A';
	const date = input instanceof Date ? input : new Date(input);
	if (Number.isNaN(date.getTime())) return 'N/A';

	const diffMs = now.getTime() - date.getTime();
	const diffSec = Math.floor(Math.abs(diffMs) / 1000);
	const isFuture = diffMs < 0;

	if (diffSec < 60) return 'just now';

	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) {
		return isFuture ? `in ${diffMin}m` : `${diffMin}m ago`;
	}

	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) {
		return isFuture ? `in ${diffHr}h` : `${diffHr}h ago`;
	}

	const diffDay = Math.floor(diffHr / 24);
	if (diffDay < 30) {
		return isFuture ? `in ${diffDay}d` : `${diffDay}d ago`;
	}

	return formatDate(date);
}

/**
 * Returns timezone abbreviation (e.g., 'UTC', 'EST', 'EDT', 'PST', 'BST').
 */
export function getZoneAbbreviation(
	date: Date = new Date(),
	timeZoneOverride?: string
): string {
	const timeZone = getEffectiveTimezone(timeZoneOverride);
	try {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone,
			timeZoneName: 'short',
		}).formatToParts(date);
		const zonePart = parts.find(p => p.type === 'timeZoneName');
		return zonePart ? zonePart.value : timeZone;
	} catch {
		return timeZone;
	}
}

/**
 * Formats matching UTC tooltip time string on hover.
 */
export function formatUtcTooltip(input: string | number | Date | null | undefined): string {
	if (input == null) return '';
	const date = input instanceof Date ? input : new Date(input);
	if (Number.isNaN(date.getTime())) return '';

	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		timeZone: 'UTC',
		hour12: false,
	}).format(date) + ' UTC';
}

/**
 * Converts date string (YYYY-MM-DD) and time string (HH:mm) entered in a given
 * timezone into a UTC Date object, handling daylight saving boundaries accurately.
 */
export function scheduleInputToUtc(
	dateStr: string,
	timeStr: string,
	timeZoneOverride?: string
): Date {
	const timeZone = getEffectiveTimezone(timeZoneOverride);
	const [yearStr, monthStr, dayStr] = dateStr.split('-');
	const [hourStr, minuteStr] = timeStr.split(':');

	const year = parseInt(yearStr, 10);
	const month = parseInt(monthStr, 10);
	const day = parseInt(dayStr, 10);
	const hour = parseInt(hourStr || '0', 10);
	const minute = parseInt(minuteStr || '0', 10);

	// Initial UTC estimation
	let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

	// Iteratively adjust offset to handle DST shift
	for (let i = 0; i < 3; i++) {
		const formattedParts = new Intl.DateTimeFormat('en-US', {
			timeZone,
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
			hour12: false,
		}).formatToParts(new Date(utcMs));

		const partMap: Record<string, number> = {};
		for (const p of formattedParts) {
			if (p.type !== 'literal') {
				partMap[p.type] = parseInt(p.value, 10);
			}
		}

		const formattedHour = partMap.hour === 24 ? 0 : (partMap.hour ?? 0);
		const diffMs =
			Date.UTC(year, month - 1, day, hour, minute) -
			Date.UTC(
				partMap.year ?? year,
				(partMap.month ?? month) - 1,
				partMap.day ?? day,
				formattedHour,
				partMap.minute ?? minute
			);

		if (diffMs === 0) break;
		utcMs += diffMs;
	}

	return new Date(utcMs);
}

/**
 * Converts a UTC Date into local input format strings { date: 'YYYY-MM-DD', time: 'HH:mm' }
 * in the chosen timezone.
 */
export function utcToScheduleInput(
	utcDate: Date,
	timeZoneOverride?: string
): { date: string; time: string } {
	const timeZone = getEffectiveTimezone(timeZoneOverride);

	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).formatToParts(utcDate);

	const partMap: Record<string, string> = {};
	for (const p of parts) {
		if (p.type !== 'literal') {
			partMap[p.type] = p.value;
		}
	}

	const date = `${partMap.year}-${partMap.month}-${partMap.day}`;
	const hour = partMap.hour === '24' ? '00' : (partMap.hour ?? '00');
	const time = `${hour}:${partMap.minute ?? '00'}`;

	return { date, time };
}
