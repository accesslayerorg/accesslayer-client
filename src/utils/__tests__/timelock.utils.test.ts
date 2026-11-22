import { describe, expect, it } from 'vitest';
import {
	calculateProposalEta,
	formatTimelockCountdown,
	TIMELOCK_DURATION_HOURS,
	TIMELOCK_DURATION_MS,
} from '../timelock.utils';

describe('timelock.utils', () => {
	it('defines 48-hour timelock constants', () => {
		expect(TIMELOCK_DURATION_HOURS).toBe(48);
		expect(TIMELOCK_DURATION_MS).toBe(48 * 60 * 60 * 1000);
	});

	it('calculates correct ETA 48 hours after proposal creation', () => {
		const baseTime = 1_700_000_000_000;
		const eta = calculateProposalEta(baseTime);
		expect(eta).toBe(baseTime + 48 * 60 * 60 * 1000);
	});

	it('formats countdown accurately before expiry', () => {
		const now = 1_700_000_000_000;
		// 47 hours, 30 minutes, 15 seconds remaining
		const eta = now + (47 * 3600 + 30 * 60 + 15) * 1000;

		const result = formatTimelockCountdown(eta, now);
		expect(result.hours).toBe(47);
		expect(result.minutes).toBe(30);
		expect(result.seconds).toBe(15);
		expect(result.isExpired).toBe(false);
		expect(result.formatted).toBe('47h 30m 15s remaining');
	});

	it('handles zero or expired remaining time', () => {
		const now = 1_700_000_000_000;
		const expiredEta = now - 5000;

		const result = formatTimelockCountdown(expiredEta, now);
		expect(result.hours).toBe(0);
		expect(result.minutes).toBe(0);
		expect(result.seconds).toBe(0);
		expect(result.isExpired).toBe(true);
		expect(result.totalSecondsRemaining).toBe(0);
		expect(result.formatted).toContain('Ready to execute');
	});
});
