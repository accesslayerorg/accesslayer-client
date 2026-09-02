/**
 * Unit tests for buy cooldown utilities (#873).
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
	computeRemainingCooldownSeconds,
	formatCooldownDuration,
} from '../buyCooldown.utils';

describe('buyCooldown.utils', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('computeRemainingCooldownSeconds', () => {
		it('computes remaining seconds until a future numeric (seconds) timestamp', () => {
			const nowSec = 1700000000;
			vi.setSystemTime(nowSec * 1000);

			expect(computeRemainingCooldownSeconds(nowSec + 272)).toBe(272);
		});

		it('computes remaining seconds until a future numeric (ms) timestamp', () => {
			const nowSec = 1700000000;
			vi.setSystemTime(nowSec * 1000);

			expect(computeRemainingCooldownSeconds((nowSec + 100) * 1000)).toBe(100);
		});

		it('computes remaining seconds until a future ISO string timestamp', () => {
			const nowSec = 1700000000;
			vi.setSystemTime(nowSec * 1000);

			const futureIso = new Date((nowSec + 60) * 1000).toISOString();
			expect(computeRemainingCooldownSeconds(futureIso)).toBe(60);
		});

		it('returns 0 when the target timestamp is in the past', () => {
			const nowSec = 1700000000;
			vi.setSystemTime(nowSec * 1000);

			expect(computeRemainingCooldownSeconds(nowSec - 10)).toBe(0);
		});

		it('returns 0 for null/undefined', () => {
			expect(computeRemainingCooldownSeconds(null)).toBe(0);
			expect(computeRemainingCooldownSeconds(undefined)).toBe(0);
		});

		it('returns 0 for an unparseable string', () => {
			expect(computeRemainingCooldownSeconds('not-a-date')).toBe(0);
		});
	});

	describe('formatCooldownDuration', () => {
		it('formats seconds-only durations as "Ns"', () => {
			expect(formatCooldownDuration(45)).toBe('45s');
			expect(formatCooldownDuration(1)).toBe('1s');
		});

		it('formats minute+second durations as "Nm SSs"', () => {
			expect(formatCooldownDuration(272)).toBe('4m 32s');
			expect(formatCooldownDuration(60)).toBe('1m 00s');
		});

		it('formats hour+minute durations as "Nh MMm"', () => {
			expect(formatCooldownDuration(3720)).toBe('1h 02m');
			expect(formatCooldownDuration(7200)).toBe('2h 00m');
		});

		it('returns "0s" for zero or negative durations', () => {
			expect(formatCooldownDuration(0)).toBe('0s');
			expect(formatCooldownDuration(-5)).toBe('0s');
		});
	});
});
