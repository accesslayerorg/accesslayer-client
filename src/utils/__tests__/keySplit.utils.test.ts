import { describe, expect, it, beforeEach } from 'vitest';
import {
	formatSplitRatio,
	isSplitActive,
	getSplitRemainingMs,
	parseTimestampMs,
	resolveSplitBalances,
	isSplitDismissedForSession,
	dismissSplitForSession,
	clearSplitDismissal,
	SPLIT_ACTIVE_DURATION_MS,
} from '../keySplit.utils';
import type { SplitExecutedEvent } from '@/types/keySplit';

describe('keySplit.utils', () => {
	beforeEach(() => {
		if (typeof window !== 'undefined' && window.sessionStorage) {
			window.sessionStorage.clear();
		}
	});

	describe('parseTimestampMs', () => {
		it('parses ISO date string correctly', () => {
			const iso = '2026-10-22T04:00:00.000Z';
			expect(parseTimestampMs(iso)).toBe(Date.parse(iso));
		});

		it('parses numeric epoch milliseconds', () => {
			const ms = 1770000000000;
			expect(parseTimestampMs(ms)).toBe(ms);
		});

		it('converts unix seconds to milliseconds', () => {
			const seconds = 1770000000;
			expect(parseTimestampMs(seconds)).toBe(seconds * 1000);
		});

		it('returns NaN for invalid timestamp', () => {
			expect(parseTimestampMs(undefined)).toBeNaN();
			expect(parseTimestampMs(null)).toBeNaN();
			expect(parseTimestampMs('')).toBeNaN();
			expect(parseTimestampMs('not-a-date')).toBeNaN();
		});
	});

	describe('isSplitActive', () => {
		const now = 1770000000000;

		it('returns true when split occurred 1 hour ago (< 48h)', () => {
			const executedAt = now - 1 * 60 * 60 * 1000;
			expect(isSplitActive({ executedAt }, now)).toBe(true);
		});

		it('returns true when split occurred 47 hours ago (< 48h)', () => {
			const executedAt = now - 47 * 60 * 60 * 1000;
			expect(isSplitActive({ executedAt }, now)).toBe(true);
		});

		it('returns true when split occurred exactly 48 hours ago', () => {
			const executedAt = now - SPLIT_ACTIVE_DURATION_MS;
			expect(isSplitActive({ executedAt }, now)).toBe(true);
		});

		it('returns false when split occurred 49 hours ago (> 48h)', () => {
			const executedAt = now - 49 * 60 * 60 * 1000;
			expect(isSplitActive({ executedAt }, now)).toBe(false);
		});

		it('returns false when split is null, undefined, or missing executedAt', () => {
			expect(isSplitActive(null, now)).toBe(false);
			expect(isSplitActive(undefined, now)).toBe(false);
			expect(isSplitActive({}, now)).toBe(false);
		});
	});

	describe('getSplitRemainingMs', () => {
		const now = 1770000000000;

		it('returns correct remaining milliseconds within 48h window', () => {
			const elapsed = 10 * 3600 * 1000;
			const executedAt = now - elapsed;
			expect(getSplitRemainingMs({ executedAt }, now)).toBe(
				SPLIT_ACTIVE_DURATION_MS - elapsed
			);
		});

		it('returns 0 when 48h have already passed', () => {
			const executedAt = now - 50 * 3600 * 1000;
			expect(getSplitRemainingMs({ executedAt }, now)).toBe(0);
		});
	});

	describe('formatSplitRatio', () => {
		it('formats numeric ratios into ratio notation', () => {
			expect(formatSplitRatio(2)).toBe('2:1');
			expect(formatSplitRatio(3)).toBe('3:1');
			expect(formatSplitRatio(5)).toBe('5:1');
		});

		it('falls back to 1:1 for non-positive ratios', () => {
			expect(formatSplitRatio(0)).toBe('1:1');
			expect(formatSplitRatio(-2)).toBe('1:1');
		});
	});

	describe('resolveSplitBalances', () => {
		const baseSplit: SplitExecutedEvent = {
			keyId: 'test-key',
			ratio: 2,
			executedAt: Date.now(),
		};

		it('returns explicit preSplitBalance and postSplitBalance when both are present', () => {
			const split: SplitExecutedEvent = {
				...baseSplit,
				preSplitBalance: 10,
				postSplitBalance: 20,
			};
			const balances = resolveSplitBalances(split, 20);
			expect(balances).toEqual({ preSplitBalance: 10, postSplitBalance: 20 });
		});

		it('computes postSplitBalance from preSplitBalance and ratio', () => {
			const split: SplitExecutedEvent = {
				...baseSplit,
				preSplitBalance: 15,
			};
			const balances = resolveSplitBalances(split);
			expect(balances).toEqual({ preSplitBalance: 15, postSplitBalance: 30 });
		});

		it('computes preSplitBalance from postSplitBalance and ratio', () => {
			const split: SplitExecutedEvent = {
				...baseSplit,
				postSplitBalance: 40,
			};
			const balances = resolveSplitBalances(split);
			expect(balances).toEqual({ preSplitBalance: 20, postSplitBalance: 40 });
		});

		it('derives pre-split from active wallet holding when holding is post-split', () => {
			const balances = resolveSplitBalances(baseSplit, 50, true);
			expect(balances).toEqual({ preSplitBalance: 25, postSplitBalance: 50 });
		});

		it('derives post-split from active wallet holding when holding is pre-split', () => {
			const balances = resolveSplitBalances(baseSplit, 25, false);
			expect(balances).toEqual({ preSplitBalance: 25, postSplitBalance: 50 });
		});

		it('returns 0 for non-holders', () => {
			const balances = resolveSplitBalances(baseSplit, 0);
			expect(balances).toEqual({ preSplitBalance: 0, postSplitBalance: 0 });
		});
	});

	describe('session dismissal', () => {
		const keyId = 'creator-alpha';
		const executedAt = '2026-10-22T04:00:00.000Z';

		it('starts as not dismissed', () => {
			expect(isSplitDismissedForSession(keyId, executedAt)).toBe(false);
		});

		it('records dismissal in sessionStorage and returns true', () => {
			dismissSplitForSession(keyId, executedAt);
			expect(isSplitDismissedForSession(keyId, executedAt)).toBe(true);
		});

		it('clears dismissal with clearSplitDismissal', () => {
			dismissSplitForSession(keyId, executedAt);
			expect(isSplitDismissedForSession(keyId, executedAt)).toBe(true);
			clearSplitDismissal(keyId);
			expect(isSplitDismissedForSession(keyId, executedAt)).toBe(false);
		});
	});
});
