import { describe, expect, it } from 'vitest';
import {
	formatLeaderboardScore,
	generateMockKeyHolderLeaderboard,
	LEADERBOARD_METRIC_TABS,
} from '../keyHolderLeaderboard.utils';

describe('keyHolderLeaderboard.utils', () => {
	describe('formatLeaderboardScore', () => {
		it('formats volume score with XLM suffix and 2 decimals', () => {
			expect(formatLeaderboardScore(1500, 'volume')).toBe('1,500.00 XLM');
			expect(formatLeaderboardScore(1234.5, 'volume')).toBe('1,234.50 XLM');
		});

		it('formats PnL score with sign and percentage', () => {
			expect(formatLeaderboardScore(25.4, 'pnl')).toBe('+25.40%');
			expect(formatLeaderboardScore(-12.8, 'pnl')).toBe('-12.80%');
			expect(formatLeaderboardScore(0, 'pnl')).toBe('+0.00%');
		});

		it('formats holding days score with days unit', () => {
			expect(formatLeaderboardScore(42, 'holding_days')).toBe('42 days');
			expect(formatLeaderboardScore(1, 'holding_days')).toBe('1 day');
		});
	});

	describe('generateMockKeyHolderLeaderboard', () => {
		it('generates deterministic entries for volume metric', () => {
			const result = generateMockKeyHolderLeaderboard('key-1', {
				metric: 'volume',
				limit: 10,
			});
			expect(result.entries).toHaveLength(10);
			expect(result.entries[0].rank).toBe(1);
			expect(result.entries[0].score).toBeGreaterThan(result.entries[1].score);
			expect(result.hasMore).toBe(true);
		});

		it('generates entries for pnl and holding_days metrics', () => {
			const pnlResult = generateMockKeyHolderLeaderboard('key-1', {
				metric: 'pnl',
				limit: 5,
			});
			expect(pnlResult.entries).toHaveLength(5);
			expect(pnlResult.entries[0].formattedScore).toContain('%');

			const daysResult = generateMockKeyHolderLeaderboard('key-1', {
				metric: 'holding_days',
				limit: 5,
			});
			expect(daysResult.entries).toHaveLength(5);
			expect(daysResult.entries[0].formattedScore).toContain('days');
		});

		it('handles cursor pagination correctly', () => {
			const page1 = generateMockKeyHolderLeaderboard('key-1', {
				metric: 'volume',
				limit: 5,
			});
			expect(page1.entries[0].rank).toBe(1);
			expect(page1.nextCursor).toBe('5');

			const page2 = generateMockKeyHolderLeaderboard('key-1', {
				metric: 'volume',
				limit: 5,
				cursor: page1.nextCursor ?? undefined,
			});
			expect(page2.entries[0].rank).toBe(6);
		});

		it('simulates user rank when userWallet is provided', () => {
			const customWallet = 'GUSERWALLETOUTSIDETOP10XXXXXXXX';
			const result = generateMockKeyHolderLeaderboard('key-1', {
				metric: 'volume',
				limit: 10,
				userWallet: customWallet,
			});
			expect(result.userRank).not.toBeNull();
			expect(result.userRank?.walletAddress).toBe(customWallet);
			expect(result.userRank?.rank).toBeGreaterThan(10);
		});
	});

	describe('LEADERBOARD_METRIC_TABS', () => {
		it('defines volume, pnl, and holding_days tabs', () => {
			const ids = LEADERBOARD_METRIC_TABS.map(t => t.id);
			expect(ids).toEqual(['volume', 'pnl', 'holding_days']);
		});
	});
});
