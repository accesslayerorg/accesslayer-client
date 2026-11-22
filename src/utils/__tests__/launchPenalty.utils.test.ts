import { describe, it, expect } from 'vitest';
import {
	isWithinLaunchWindow,
	calculateLaunchPenalty,
	LAUNCH_WINDOW_LEDGERS,
} from '../launchPenalty.utils';

describe('isWithinLaunchWindow', () => {
	it('returns true when the sell happens right at creation', () => {
		expect(isWithinLaunchWindow(1000, 1000)).toBe(true);
	});

	it('returns true when the sell happens partway through the 7-day window', () => {
		expect(isWithinLaunchWindow(1000, 1000 + LAUNCH_WINDOW_LEDGERS - 1)).toBe(
			true
		);
	});

	it('returns false once the sell happens at exactly 7 days out', () => {
		expect(isWithinLaunchWindow(1000, 1000 + LAUNCH_WINDOW_LEDGERS)).toBe(
			false
		);
	});

	it('returns false well past the launch window', () => {
		expect(
			isWithinLaunchWindow(1000, 1000 + LAUNCH_WINDOW_LEDGERS * 10)
		).toBe(false);
	});

	it('returns false when currentLedger precedes createdAtLedger', () => {
		expect(isWithinLaunchWindow(1000, 999)).toBe(false);
	});

	it.each([
		[null, 1000],
		[1000, null],
		[undefined, 1000],
		[1000, undefined],
		[NaN, 1000],
		[1000, NaN],
	])(
		'returns false when createdAtLedger=%s or currentLedger=%s is missing/invalid',
		(createdAtLedger, currentLedger) => {
			expect(isWithinLaunchWindow(createdAtLedger, currentLedger)).toBe(
				false
			);
		}
	);
});

describe('calculateLaunchPenalty', () => {
	it('applies the penalty within the launch window', () => {
		const result = calculateLaunchPenalty(1_000_000, 1000, 1500, 500); // 5%

		expect(result).toEqual({
			applies: true,
			penaltyBps: 500,
			penaltyStroops: 50_000,
			netProceedsStroops: 950_000,
		});
	});

	it('does not apply the penalty past the launch window', () => {
		const result = calculateLaunchPenalty(
			1_000_000,
			1000,
			1000 + LAUNCH_WINDOW_LEDGERS,
			500
		);

		expect(result).toEqual({
			applies: false,
			penaltyBps: 0,
			penaltyStroops: 0,
			netProceedsStroops: 1_000_000,
		});
	});

	it('does not apply when the creator has no launch penalty configured', () => {
		const result = calculateLaunchPenalty(1_000_000, 1000, 1200, 0);

		expect(result.applies).toBe(false);
		expect(result.netProceedsStroops).toBe(1_000_000);
	});

	it('does not apply when launchPenaltyBps is missing', () => {
		const result = calculateLaunchPenalty(1_000_000, 1000, 1200, undefined);

		expect(result.applies).toBe(false);
		expect(result.netProceedsStroops).toBe(1_000_000);
	});

	it('does not apply when ledger data is missing', () => {
		const result = calculateLaunchPenalty(1_000_000, null, null, 500);

		expect(result.applies).toBe(false);
		expect(result.netProceedsStroops).toBe(1_000_000);
	});

	it('falls back to 0 net proceeds when gross proceeds are unavailable', () => {
		const result = calculateLaunchPenalty(null, 1000, 1200, 500);

		expect(result).toEqual({
			applies: false,
			penaltyBps: 0,
			penaltyStroops: 0,
			netProceedsStroops: 0,
		});
	});

	it('rounds the penalty amount to the nearest stroop', () => {
		const result = calculateLaunchPenalty(1_000_000, 1000, 1200, 333); // 3.33%

		expect(result.penaltyStroops).toBe(Math.round((1_000_000 * 333) / 10_000));
		expect(result.netProceedsStroops).toBe(
			1_000_000 - result.penaltyStroops
		);
	});

	it('applies the maximum configured penalty (20%)', () => {
		const result = calculateLaunchPenalty(1_000_000, 1000, 1000, 2000);

		expect(result.penaltyStroops).toBe(200_000);
		expect(result.netProceedsStroops).toBe(800_000);
	});
});
