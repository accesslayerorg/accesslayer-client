import { describe, expect, it } from 'vitest';
import {
	computeEstimatedApy,
	hasStakingActivity,
} from '@/utils/stakingRewards.utils';

describe('computeEstimatedApy (#817)', () => {
	it('annualises the recent fee inflow over the pool balance as a percentage', () => {
		// 50 * 12 / 6000 * 100 = 10
		expect(
			computeEstimatedApy({ recentFeeInflow: 50, stakingPoolBalance: 6000 })
		).toBeCloseTo(10, 10);
	});

	it('returns null when the pool balance is zero', () => {
		expect(
			computeEstimatedApy({ recentFeeInflow: 50, stakingPoolBalance: 0 })
		).toBeNull();
	});

	it('returns null when the pool balance is missing', () => {
		expect(computeEstimatedApy({ recentFeeInflow: 50 })).toBeNull();
	});

	it('treats a missing or negative fee inflow as zero APY', () => {
		expect(
			computeEstimatedApy({ stakingPoolBalance: 6000 })
		).toBe(0);
		expect(
			computeEstimatedApy({ recentFeeInflow: -20, stakingPoolBalance: 6000 })
		).toBe(0);
	});

	it('never returns Infinity or NaN for non-finite inputs', () => {
		expect(
			computeEstimatedApy({
				recentFeeInflow: Number.POSITIVE_INFINITY,
				stakingPoolBalance: Number.NaN,
			})
		).toBeNull();
	});
});

describe('hasStakingActivity (#817)', () => {
	it('is true when keys are staked', () => {
		expect(hasStakingActivity({ totalStaked: 3, stakingPoolBalance: 0 })).toBe(true);
	});

	it('is true when the pool holds a balance even with nothing staked', () => {
		expect(hasStakingActivity({ totalStaked: 0, stakingPoolBalance: 12 })).toBe(true);
	});

	it('is false when nothing is staked and the pool is empty', () => {
		expect(hasStakingActivity({ totalStaked: 0, stakingPoolBalance: 0 })).toBe(false);
		expect(hasStakingActivity({})).toBe(false);
	});
});
