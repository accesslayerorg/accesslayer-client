import { describe, expect, it } from 'vitest';
import {
	computeCliffCountdownSeconds,
	formatCliffCountdown,
} from '../vestingSchedule.utils';

describe('computeCliffCountdownSeconds (#1018)', () => {
	const NOW = Date.parse('2026-09-29T12:00:00Z');

	it('returns whole seconds remaining until the cliff', () => {
		const cliff = Date.parse('2026-09-29T12:01:30Z'); // 90s out
		expect(computeCliffCountdownSeconds(cliff, { now: NOW })).toBe(90);
	});

	it('floors sub-second remainders so the countdown never shows 1s early', () => {
		const cliff = NOW + 90_500; // 90.5s out
		expect(computeCliffCountdownSeconds(cliff, { now: NOW })).toBe(90);
	});

	it('returns 0 once the cliff has passed', () => {
		const cliff = NOW - 1;
		expect(computeCliffCountdownSeconds(cliff, { now: NOW })).toBe(0);
	});

	it('returns 0 for missing or unparseable timestamps', () => {
		expect(computeCliffCountdownSeconds(null, { now: NOW })).toBe(0);
		expect(computeCliffCountdownSeconds(undefined, { now: NOW })).toBe(0);
		expect(computeCliffCountdownSeconds('not-a-date', { now: NOW })).toBe(0);
	});

	it('accepts ISO strings and epoch numbers alike', () => {
		expect(
			computeCliffCountdownSeconds('2026-09-29T12:00:10Z', { now: NOW })
		).toBe(10);
		expect(computeCliffCountdownSeconds(NOW + 10_000, { now: NOW })).toBe(10);
	});
});

describe('formatCliffCountdown (#1018)', () => {
	it('renders HH:MM:SS below a day', () => {
		expect(formatCliffCountdown(0)).toBe('00:00:00');
		expect(formatCliffCountdown(59)).toBe('00:00:59');
		expect(formatCliffCountdown(3661)).toBe('01:01:01');
	});

	it('renders days as a Dd prefix once the countdown crosses 24h', () => {
		expect(formatCliffCountdown(86_400)).toBe('1d 00:00:00');
		expect(formatCliffCountdown(2 * 86_400 + 3 * 3600 + 4 * 60 + 5)).toBe(
			'2d 03:04:05'
		);
	});

	it('clamps negative inputs to zero', () => {
		expect(formatCliffCountdown(-5)).toBe('00:00:00');
	});
});
