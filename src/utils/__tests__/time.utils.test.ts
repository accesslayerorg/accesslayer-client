import { describe, it, expect } from 'vitest';
import { formatRelativeTimeLabel } from '../time.utils';

function makeDate(secondsAgo: number, from: Date): Date {
	return new Date(from.getTime() - secondsAgo * 1000);
}

describe('formatRelativeTimeLabel', () => {
	const now = new Date('2026-06-27T12:00:00.000Z');

	it('returns "just now" for 0 seconds ago', () => {
		expect(formatRelativeTimeLabel(now, now)).toBe('just now');
	});

	it('returns "just now" for 59 seconds ago', () => {
		expect(formatRelativeTimeLabel(makeDate(59, now), now)).toBe('just now');
	});

	it('returns "1 minutes ago" for exactly 60 seconds ago', () => {
		expect(formatRelativeTimeLabel(makeDate(60, now), now)).toBe('1 minutes ago');
	});

	it('returns "45 minutes ago" for 45 minutes ago', () => {
		expect(formatRelativeTimeLabel(makeDate(45 * 60, now), now)).toBe('45 minutes ago');
	});

	it('returns "59 minutes ago" for 59 minutes 59 seconds ago', () => {
		expect(formatRelativeTimeLabel(makeDate(59 * 60 + 59, now), now)).toBe('59 minutes ago');
	});

	it('returns "1 hours ago" for exactly 1 hour ago', () => {
		expect(formatRelativeTimeLabel(makeDate(3600, now), now)).toBe('1 hours ago');
	});

	it('returns "23 hours ago" for 23 hours ago', () => {
		expect(formatRelativeTimeLabel(makeDate(23 * 3600, now), now)).toBe('23 hours ago');
	});

	it('returns "1 days ago" for exactly 24 hours ago', () => {
		expect(formatRelativeTimeLabel(makeDate(24 * 3600, now), now)).toBe('1 days ago');
	});

	it('returns "29 days ago" for 29 days ago', () => {
		expect(formatRelativeTimeLabel(makeDate(29 * 24 * 3600, now), now)).toBe('29 days ago');
	});

	it('returns a formatted date for exactly 30 days ago', () => {
		const date = makeDate(30 * 24 * 3600, now);
		const result = formatRelativeTimeLabel(date, now);
		expect(result).toMatch(/\d{1,2} \w+ \d{4}/);
	});

	it('returns a formatted date for dates older than 30 days', () => {
		const date = new Date('2026-01-12T00:00:00.000Z');
		const result = formatRelativeTimeLabel(date, now);
		expect(result).toMatch(/12 Jan 2026/);
	});

	it('defaults now to the current time when omitted', () => {
		const veryRecentDate = new Date(Date.now() - 5000);
		expect(formatRelativeTimeLabel(veryRecentDate)).toBe('just now');
	});

	// #749's exact scope: a few specific inputs the boundary tests above don't
	// happen to cover by value, plus the future-timestamp case.
	it('returns "just now" for a timestamp 30 seconds ago', () => {
		expect(formatRelativeTimeLabel(makeDate(30, now), now)).toBe('just now');
	});

	it('returns "5 minutes ago" for a timestamp 5 minutes ago', () => {
		expect(formatRelativeTimeLabel(makeDate(5 * 60, now), now)).toBe('5 minutes ago');
	});

	it('returns "2 hours ago" for a timestamp 2 hours ago', () => {
		expect(formatRelativeTimeLabel(makeDate(2 * 3600, now), now)).toBe('2 hours ago');
	});

	it('returns "3 days ago" for a timestamp 3 days ago', () => {
		expect(formatRelativeTimeLabel(makeDate(3 * 24 * 3600, now), now)).toBe('3 days ago');
	});

	it('returns "just now" for a future timestamp, never a negative value', () => {
		const future = new Date(now.getTime() + 5 * 60 * 1000);
		const result = formatRelativeTimeLabel(future, now);
		expect(result).toBe('just now');
		expect(result).not.toMatch(/-/);
	});
});
