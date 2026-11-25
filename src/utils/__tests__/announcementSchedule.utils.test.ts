import { describe, expect, it } from 'vitest';
import {
	MAX_SCHEDULE_LEAD_DAYS,
	MIN_SCHEDULE_LEAD_MINUTES,
	formatLocalScheduledTime,
	formatUtcScheduledTime,
	toLocalDatetimeInputValue,
	validateScheduledTime,
} from '@/utils/announcementSchedule.utils';

describe('validateScheduledTime (#1380)', () => {
	// Fixed reference time: 2026-11-23 12:00:00 UTC
	const now = new Date('2026-11-23T12:00:00.000Z');

	it('accepts a time exactly 5 minutes ahead', () => {
		const exactlyFiveMinutes = new Date(
			now.getTime() + MIN_SCHEDULE_LEAD_MINUTES * 60 * 1000
		);
		expect(validateScheduledTime(exactlyFiveMinutes, now)).toBeNull();
	});

	it('rejects a time 4 minutes 59 seconds ahead', () => {
		const fourMinFiftyNine = new Date(
			now.getTime() + (MIN_SCHEDULE_LEAD_MINUTES * 60 - 1) * 1000
		);
		expect(validateScheduledTime(fourMinFiftyNine, now)).toBe(
			'Pick a time at least 5 minutes from now'
		);
	});

	it('accepts a time exactly 90 days ahead', () => {
		const exactlyNinetyDays = new Date(
			now.getTime() + MAX_SCHEDULE_LEAD_DAYS * 24 * 60 * 60 * 1000
		);
		expect(validateScheduledTime(exactlyNinetyDays, now)).toBeNull();
	});

	it('rejects a time 90 days + 1 minute ahead', () => {
		const ninetyDaysPlusOneMin = new Date(
			now.getTime() + (MAX_SCHEDULE_LEAD_DAYS * 24 * 60 + 1) * 60 * 1000
		);
		expect(validateScheduledTime(ninetyDaysPlusOneMin, now)).toBe(
			'Pick a time within the next 90 days'
		);
	});

	it('rejects a time in the past', () => {
		const inPast = new Date(now.getTime() - 60 * 1000);
		expect(validateScheduledTime(inPast, now)).toBe(
			'Pick a time at least 5 minutes from now'
		);
	});

	it('rejects an empty value', () => {
		expect(validateScheduledTime('', now)).toBe(
			'Pick a date and time to schedule.'
		);
		expect(validateScheduledTime(null, now)).toBe(
			'Pick a date and time to schedule.'
		);
		expect(validateScheduledTime(undefined, now)).toBe(
			'Pick a date and time to schedule.'
		);
	});

	it('rejects an invalid date string', () => {
		expect(validateScheduledTime('not-a-valid-date', now)).toBe(
			'Pick a valid date and time.'
		);
	});
});

describe('date formatting helpers (#1380)', () => {
	it('converts Date to local YYYY-MM-DDTHH:mm string correctly', () => {
		const date = new Date(2026, 10, 23, 14, 30); // Nov 23, 2026 14:30 local
		expect(toLocalDatetimeInputValue(date)).toBe('2026-11-23T14:30');
	});

	it('formats UTC time string with UTC indicator', () => {
		const iso = '2026-11-23T12:00:00.000Z';
		const formattedUtc = formatUtcScheduledTime(iso);
		expect(formattedUtc).toContain('Nov 23, 2026');
		expect(formattedUtc).toContain('UTC');
	});

	it('formats local scheduled time including timezone label', () => {
		const iso = '2026-11-23T12:00:00.000Z';
		const formattedLocal = formatLocalScheduledTime(iso);
		expect(formattedLocal).toBeTruthy();
	});
});
