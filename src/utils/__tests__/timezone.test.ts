import { describe, it, expect, beforeEach } from 'vitest';
import { useTimezone } from '@/hooks/useTimezone';
import {
	formatDateTime,
	formatDate,
	formatRelative,
	formatUtcTooltip,
	getZoneAbbreviation,
	scheduleInputToUtc,
	utcToScheduleInput,
} from '@/utils/time';

describe('Timezone store and formatting helpers (#1489)', () => {
	beforeEach(() => {
		useTimezone.getState().setTimezone('UTC', false);
	});

	it('formats date and time in selected timezone', () => {
		// 2026-06-15 12:00:00 UTC
		const testTime = new Date('2026-06-15T12:00:00.000Z');

		useTimezone.getState().setTimezone('UTC', false);
		const utcResult = formatDateTime(testTime);
		expect(utcResult).toContain('Jun 15, 2026');
		expect(utcResult).toContain('12:00');

		useTimezone.getState().setTimezone('America/New_York', false);
		const nyResult = formatDateTime(testTime);
		// EDT is UTC-4 in June
		expect(nyResult).toContain('08:00');
	});

	it('returns matching UTC tooltip string', () => {
		const testTime = new Date('2026-11-24T15:30:45.000Z');
		const tooltip = formatUtcTooltip(testTime);
		expect(tooltip).toContain('Nov 24, 2026');
		expect(tooltip).toContain('15:30:45 UTC');
	});

	it('returns correct timezone abbreviation', () => {
		const summerDate = new Date('2026-07-01T12:00:00.000Z');
		const abbr = getZoneAbbreviation(summerDate, 'America/New_York');
		expect(['EDT', 'GMT-4']).toContain(abbr);

		const utcAbbr = getZoneAbbreviation(summerDate, 'UTC');
		expect(utcAbbr).toBe('UTC');
	});

	it('handles daylight saving transitions in schedule inputs', () => {
		// New York switches from EST (UTC-5) to EDT (UTC-4) in March
		// March 1, 2026 is EST (UTC-5)
		const winterUtc = scheduleInputToUtc('2026-03-01', '10:00', 'America/New_York');
		expect(winterUtc.toISOString()).toBe('2026-03-01T15:00:00.000Z');

		// July 1, 2026 is EDT (UTC-4)
		const summerUtc = scheduleInputToUtc('2026-07-01', '10:00', 'America/New_York');
		expect(summerUtc.toISOString()).toBe('2026-07-01T14:00:00.000Z');

		// Verify round-trip conversion
		const roundTrip = utcToScheduleInput(summerUtc, 'America/New_York');
		expect(roundTrip.date).toBe('2026-07-01');
		expect(roundTrip.time).toBe('10:00');
	});

	it('falls back to browser zone on auto-detect', () => {
		useTimezone.getState().setAutoDetect();
		expect(useTimezone.getState().isAuto).toBe(true);
		expect(useTimezone.getState().getEffectiveZone()).toBeTruthy();
	});

	it('formats relative times correctly', () => {
		const now = new Date('2026-11-24T12:00:00.000Z');
		const fiveMinAgo = new Date('2026-11-24T11:55:00.000Z');
		const twoHoursAgo = new Date('2026-11-24T10:00:00.000Z');

		expect(formatRelative(fiveMinAgo, now)).toBe('5m ago');
		expect(formatRelative(twoHoursAgo, now)).toBe('2h ago');
	});
});
