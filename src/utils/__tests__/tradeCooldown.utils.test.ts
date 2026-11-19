import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
	formatTradeCooldownTooltip,
	getCooldownRemainingSeconds,
	isActiveCooldown,
	type TradeCooldownStatus,
} from '../tradeCooldown.utils';

describe('tradeCooldown.utils (#998)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('isActiveCooldown', () => {
		it('is true for a future seconds-epoch timestamp', () => {
			const nowSec = 1700000000;
			vi.setSystemTime(nowSec * 1000);

			expect(
				isActiveCooldown({
					creatorId: 'c1',
					nextBuyAllowedAt: nowSec + 10,
					cooldownDurationSeconds: 60,
				})
			).toBe(true);
		});

		it('is true for a future ms-epoch or ISO timestamp', () => {
			const nowSec = 1700000000;
			vi.setSystemTime(nowSec * 1000);

			expect(
				isActiveCooldown({
					creatorId: 'c1',
					nextBuyAllowedAt: (nowSec + 10) * 1000,
				})
			).toBe(true);
			expect(
				isActiveCooldown({
					creatorId: 'c1',
					nextBuyAllowedAt: new Date((nowSec + 10) * 1000).toISOString(),
				})
			).toBe(true);
		});

		it('is false once the timestamp has passed', () => {
			const nowSec = 1700000000;
			vi.setSystemTime(nowSec * 1000);

			expect(
				isActiveCooldown({ creatorId: 'c1', nextBuyAllowedAt: nowSec - 1 })
			).toBe(false);
		});

		it('is false for null/undefined status or missing timestamp', () => {
			expect(isActiveCooldown(null)).toBe(false);
			expect(isActiveCooldown(undefined)).toBe(false);
			expect(isActiveCooldown({ creatorId: 'c1', nextBuyAllowedAt: null })).toBe(
				false
			);
			expect(isActiveCooldown({ creatorId: 'c1' })).toBe(false);
		});

		it('is false for an unparseable string timestamp', () => {
			expect(
				isActiveCooldown({ creatorId: 'c1', nextBuyAllowedAt: 'not-a-date' })
			).toBe(false);
		});
	});

	describe('getCooldownRemainingSeconds', () => {
		it('returns the whole seconds remaining until the timestamp', () => {
			const nowSec = 1700000000;
			vi.setSystemTime(nowSec * 1000);

			expect(
				getCooldownRemainingSeconds({ nextBuyAllowedAt: nowSec + 272 })
			).toBe(272);
		});

		it('supports ms epochs and ISO strings', () => {
			const nowSec = 1700000000;
			vi.setSystemTime(nowSec * 1000);

			expect(
				getCooldownRemainingSeconds({ nextBuyAllowedAt: (nowSec + 60) * 1000 })
			).toBe(60);
			expect(
				getCooldownRemainingSeconds({
					nextBuyAllowedAt: new Date((nowSec + 60) * 1000).toISOString(),
				})
			).toBe(60);
		});

		it('clamps to 0 for past timestamps and unparseable input', () => {
			const nowSec = 1700000000;
			vi.setSystemTime(nowSec * 1000);

			expect(
				getCooldownRemainingSeconds({ nextBuyAllowedAt: nowSec - 100 })
			).toBe(0);
			expect(getCooldownRemainingSeconds({ nextBuyAllowedAt: 'garbage' })).toBe(
				0
			);
		});
	});

	describe('formatTradeCooldownTooltip', () => {
		it('explains the remaining time and the creator-set policy', () => {
			expect(formatTradeCooldownTooltip(120, 300)).toBe(
				'You can trade this key again in 2m 00s. This key enforces a 5m 00s cooldown between trades, set by the creator.'
			);
		});

		it('falls back to a generic policy line when the duration is unknown', () => {
			expect(formatTradeCooldownTooltip(45, null)).toBe(
				'You can trade this key again in 45s. This cooldown is set by the creator.'
			);
			expect(formatTradeCooldownTooltip(45, undefined)).toBe(
				'You can trade this key again in 45s. This cooldown is set by the creator.'
			);
		});

		it('still explains the policy when no time remains', () => {
			expect(formatTradeCooldownTooltip(0, 60)).toBe(
				'Trading is temporarily locked. This key enforces a 1m 00s cooldown between trades, set by the creator.'
			);
		});

		it('ignores invalid policy durations', () => {
			expect(formatTradeCooldownTooltip(30, 0)).toBe(
				'You can trade this key again in 30s. This cooldown is set by the creator.'
			);
			expect(formatTradeCooldownTooltip(30, Number.NaN)).toBe(
				'You can trade this key again in 30s. This cooldown is set by the creator.'
			);
		});
	});

	describe('isActiveCooldown typing', () => {
		it('narrows a status to an ActiveTradeCooldown', () => {
			const nowSec = 1700000000;
			vi.setSystemTime(nowSec * 1000);

			const status: TradeCooldownStatus = {
				creatorId: 'c1',
				nextBuyAllowedAt: nowSec + 5,
				cooldownDurationSeconds: 60,
			};

			if (isActiveCooldown(status)) {
				expect(status.nextBuyAllowedAt).toBe(nowSec + 5);
			} else {
				throw new Error('expected an active cooldown');
			}
		});
	});
});
