import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from '../relativeTime.utils';

const NOW = new Date('2026-01-12T12:00:00Z');

function ago(ms: number): Date {
	return new Date(NOW.getTime() - ms);
}

const SEC = 1_000;
const MIN = 60 * SEC;
const HR = 60 * MIN;
const DAY = 24 * HR;

describe('formatRelativeTime', () => {
	describe('under 60 seconds', () => {
		it('returns "just now" for 0 seconds ago', () => {
			expect(formatRelativeTime(ago(0), NOW)).toBe('just now');
		});

		it('returns "just now" for 30 seconds ago', () => {
			expect(formatRelativeTime(ago(30 * SEC), NOW)).toBe('just now');
		});

		it('returns "just now" at exactly 59 seconds ago', () => {
			expect(formatRelativeTime(ago(59 * SEC), NOW)).toBe('just now');
		});
	});

	describe('boundary at 60 seconds', () => {
		it('returns "1 minute ago" at exactly 60 seconds', () => {
			expect(formatRelativeTime(ago(60 * SEC), NOW)).toBe('1 minute ago');
		});
	});

	describe('under 60 minutes', () => {
		it('returns singular "1 minute ago" at 1 minute', () => {
			expect(formatRelativeTime(ago(1 * MIN), NOW)).toBe('1 minute ago');
		});

		it('returns "5 minutes ago" at 5 minutes', () => {
			expect(formatRelativeTime(ago(5 * MIN), NOW)).toBe('5 minutes ago');
		});

		it('returns "59 minutes ago" at 59 minutes', () => {
			expect(formatRelativeTime(ago(59 * MIN), NOW)).toBe('59 minutes ago');
		});
	});

	describe('boundary at 60 minutes', () => {
		it('returns "1 hour ago" at exactly 60 minutes', () => {
			expect(formatRelativeTime(ago(60 * MIN), NOW)).toBe('1 hour ago');
		});
	});

	describe('under 24 hours', () => {
		it('returns singular "1 hour ago" at 1 hour', () => {
			expect(formatRelativeTime(ago(1 * HR), NOW)).toBe('1 hour ago');
		});

		it('returns "3 hours ago" at 3 hours', () => {
			expect(formatRelativeTime(ago(3 * HR), NOW)).toBe('3 hours ago');
		});

		it('returns "23 hours ago" at 23 hours', () => {
			expect(formatRelativeTime(ago(23 * HR), NOW)).toBe('23 hours ago');
		});
	});

	describe('boundary at 24 hours', () => {
		it('returns "1 day ago" at exactly 24 hours', () => {
			expect(formatRelativeTime(ago(24 * HR), NOW)).toBe('1 day ago');
		});
	});

	describe('under 30 days', () => {
		it('returns singular "1 day ago" at 1 day', () => {
			expect(formatRelativeTime(ago(1 * DAY), NOW)).toBe('1 day ago');
		});

		it('returns "7 days ago" at 7 days', () => {
			expect(formatRelativeTime(ago(7 * DAY), NOW)).toBe('7 days ago');
		});

		it('returns "29 days ago" at 29 days', () => {
			expect(formatRelativeTime(ago(29 * DAY), NOW)).toBe('29 days ago');
		});
	});

	describe('boundary at 30 days', () => {
		it('returns a formatted date string at exactly 30 days', () => {
			const result = formatRelativeTime(ago(30 * DAY), NOW);
			expect(result).not.toContain('ago');
			expect(result).toMatch(/\d{1,2} \w+ \d{4}/);
		});
	});

	describe('beyond 30 days', () => {
		it('returns formatted date string "13 Dec 2025" for 30 days ago from Jan 12 2026', () => {
			expect(formatRelativeTime(ago(30 * DAY), NOW)).toBe('13 Dec 2025');
		});

		it('returns formatted date string for a date 1 year ago', () => {
			const result = formatRelativeTime(ago(365 * DAY), NOW);
			expect(result).toMatch(/\d{1,2} \w+ \d{4}/);
			expect(result).not.toContain('ago');
		});
	});

	describe('injectable now param', () => {
		it('uses the provided now date for deterministic results', () => {
			const fixedNow = new Date('2026-06-01T00:00:00Z');
			const date = new Date('2026-05-31T23:59:00Z');
			expect(formatRelativeTime(date, fixedNow)).toBe('1 minute ago');
		});

		it('defaults to real Date when now is omitted (smoke test)', () => {
			const recent = new Date(Date.now() - 5 * MIN);
			const result = formatRelativeTime(recent);
			expect(result).toBe('5 minutes ago');
		});
	});
});
