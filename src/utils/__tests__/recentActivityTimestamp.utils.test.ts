import { describe, expect, it } from 'vitest';
import { formatRecentActivityCompactTimestamp } from '../recentActivityTimestamp.utils';

describe('formatRecentActivityCompactTimestamp', () => {
	it('preserves supported compact timestamp labels', () => {
		expect(formatRecentActivityCompactTimestamp('2m ago')).toBe('2m ago');
		expect(formatRecentActivityCompactTimestamp('18 min ago')).toBe(
			'18 min ago'
		);
		expect(formatRecentActivityCompactTimestamp('just now')).toBe('just now');
	});

	it('falls back when the compact timestamp input is missing', () => {
		expect(formatRecentActivityCompactTimestamp(undefined)).toBe(
			'Time unavailable'
		);
		expect(formatRecentActivityCompactTimestamp('   ')).toBe(
			'Time unavailable'
		);
	});

	it('falls back when the compact timestamp input is invalid', () => {
		expect(formatRecentActivityCompactTimestamp('yesterday')).toBe(
			'Time unavailable'
		);
		expect(formatRecentActivityCompactTimestamp('18 minutes')).toBe(
			'Time unavailable'
		);
	});
});
