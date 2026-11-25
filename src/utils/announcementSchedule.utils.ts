export const MIN_SCHEDULE_LEAD_MINUTES = 5;
export const MAX_SCHEDULE_LEAD_DAYS = 90;

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

/**
 * Validates the chosen scheduled time against the lead time bounds (#1380).
 *
 * Rules:
 *  - Must be a valid date/time
 *  - Must be at least 5 minutes from `now`
 *  - Must be at most 90 days from `now`
 *
 * @param scheduledAt ISO string, Date object, or null/undefined
 * @param now Reference current time (defaults to new Date())
 * @returns Error string or null if valid
 */
export function validateScheduledTime(
	scheduledAt: string | Date | null | undefined,
	now: Date = new Date()
): string | null {
	if (!scheduledAt) {
		return 'Pick a date and time to schedule.';
	}

	const target = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt);
	if (Number.isNaN(target.getTime())) {
		return 'Pick a valid date and time.';
	}

	const nowMs = now.getTime();
	const targetMs = target.getTime();

	const minAllowedMs = nowMs + MIN_SCHEDULE_LEAD_MINUTES * MS_PER_MINUTE;
	if (targetMs < minAllowedMs) {
		return 'Pick a time at least 5 minutes from now';
	}

	const maxAllowedMs = nowMs + MAX_SCHEDULE_LEAD_DAYS * MS_PER_DAY;
	if (targetMs > maxAllowedMs) {
		return 'Pick a time within the next 90 days';
	}

	return null;
}

/**
 * Converts a Date object to local YYYY-MM-DDTHH:mm string for datetime-local inputs.
 */
export function toLocalDatetimeInputValue(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	const year = date.getFullYear();
	const month = pad(date.getMonth() + 1);
	const day = pad(date.getDate());
	const hours = pad(date.getHours());
	const minutes = pad(date.getMinutes());
	return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Formats an ISO string in the creator's local timezone with timezone name/abbreviation.
 */
export function formatLocalScheduledTime(isoString: string): string {
	const date = new Date(isoString);
	if (Number.isNaN(date.getTime())) return '';

	return new Intl.DateTimeFormat(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZoneName: 'short',
	}).format(date);
}

/**
 * Formats an ISO string in UTC.
 */
export function formatUtcScheduledTime(isoString: string): string {
	const date = new Date(isoString);
	if (Number.isNaN(date.getTime())) return '';

	return (
		new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'UTC',
		}).format(date) + ' UTC'
	);
}
