import { describe, expect, it } from 'vitest';
import {
	computeRemainingStakeLockSeconds,
	computeStakedPositionValueStroops,
	computeStakingPortfolioValueStroops,
	formatClaimableReward,
	formatStakedQuantity,
	isStakePositionUnlocked,
} from '@/utils/stakingPositions.utils';
import type { StakingPosition } from '@/services/stakingPositions.service';

const unlocked = new Date('2026-01-01T00:00:00Z').getTime();
const future = new Date('2099-01-01T00:00:00Z').getTime();

function position(overrides: Partial<StakingPosition> = {}): StakingPosition {
	return {
		id: 'pos-1',
		keyId: 'creator-1',
		keyName: 'Alpha Key',
		stakedQuantity: 100,
		unlockLedger: 0,
		claimableReward: 0,
		priceStroops: null,
		price: null,
		...overrides,
	};
}

describe('stakingPositions.utils (#921)', () => {
	describe('isStakePositionUnlocked', () => {
		it('returns true when the unlock ledger has passed', () => {
			expect(
				isStakePositionUnlocked(
					{ unlockLedger: unlocked / 1000 },
					unlocked + 60_000
				)
			).toBe(true);
		});

		it('returns false while the lock is still active', () => {
			expect(
				isStakePositionUnlocked({ unlockLedger: future / 1000 }, unlocked)
			).toBe(false);
		});

		it('returns false when no unlock ledger is present', () => {
			expect(isStakePositionUnlocked({ unlockLedger: 0 }, unlocked)).toBe(
				false
			);
		});
	});

	describe('computeRemainingStakeLockSeconds', () => {
		it('returns the full remaining duration in seconds', () => {
			const remaining = computeRemainingStakeLockSeconds(
				{ unlockLedger: future / 1000 },
				unlocked
			);
			expect(remaining).toBe(Math.ceil((future - unlocked) / 1000));
		});

		it('returns 0 once the position is unlocked', () => {
			expect(
				computeRemainingStakeLockSeconds(
					{ unlockLedger: unlocked / 1000 },
					unlocked + 60_000
				)
			).toBe(0);
		});
	});

	describe('computeStakedPositionValueStroops', () => {
		it('values a position as bond-curve price × staked quantity', () => {
			const pos = position({
				stakedQuantity: 4,
				priceStroops: 2_500_000,
			});
			expect(computeStakedPositionValueStroops(pos)).toBe(10_000_000);
		});

		it('returns null when the price cannot be resolved', () => {
			expect(
				computeStakedPositionValueStroops(
					position({ priceStroops: null, price: null })
				)
			).toBeNull();
		});

		it('returns null when nothing is staked', () => {
			expect(
				computeStakedPositionValueStroops(
					position({ stakedQuantity: 0, priceStroops: 2_500_000 })
				)
			).toBeNull();
		});
	});

	describe('computeStakingPortfolioValueStroops', () => {
		it('sums the value across all active positions', () => {
			const positions = [
				position({
					id: 'pos-1',
					stakedQuantity: 2,
					priceStroops: 2_500_000,
				}),
				position({
					id: 'pos-2',
					keyId: 'creator-2',
					stakedQuantity: 1,
					priceStroops: 5_000_000,
				}),
			];
			expect(computeStakingPortfolioValueStroops(positions)).toBe(
				10_000_000
			);
		});

		it('returns 0 when there are no active positions', () => {
			expect(computeStakingPortfolioValueStroops([])).toBe(0);
			expect(
				computeStakingPortfolioValueStroops([
					position({ stakedQuantity: 0 }),
				])
			).toBe(0);
		});

		it('withholds the total when any position is missing a price', () => {
			const positions = [
				position({ id: 'pos-1', priceStroops: 2_500_000 }),
				position({ id: 'pos-2', priceStroops: null, price: null }),
			];
			expect(computeStakingPortfolioValueStroops(positions)).toBeNull();
		});
	});

	describe('formatters', () => {
		it('formats staked quantity with thousand separators', () => {
			expect(formatStakedQuantity(2500)).toBe('2,500 keys');
			expect(formatStakedQuantity(0.5)).toBe('0.5 keys');
		});

		it('formats claimable reward as XLM with 4 decimals', () => {
			expect(formatClaimableReward(2_500_000)).toBe('0.2500 XLM');
			expect(formatClaimableReward(0)).toBe('0.0000 XLM');
		});
	});
});
