import { describe, expect, it } from 'vitest';
import {
	calculateConvictionBalances,
	calculateConvictionProjection,
	calculateMaxConviction,
	formatProjectedDuration,
	getMaxStakeForProposal,
} from '../conviction.utils';

describe('conviction.utils', () => {
	describe('calculateMaxConviction', () => {
		it('calculates asymptotic max conviction for alpha = 0.9', () => {
			// S = 100, alpha = 0.9 => 100 / (1 - 0.9) = 1000
			expect(calculateMaxConviction(100, 0.9)).toBeCloseTo(1000);
		});

		it('returns 0 for non-positive stake or invalid alpha', () => {
			expect(calculateMaxConviction(0, 0.9)).toBe(0);
			expect(calculateMaxConviction(-50, 0.9)).toBe(0);
			expect(calculateMaxConviction(100, 1)).toBe(0);
			expect(calculateMaxConviction(100, 0)).toBe(0);
		});
	});

	describe('calculateConvictionProjection', () => {
		it('returns isCrossed=true when current conviction is already above threshold', () => {
			const projection = calculateConvictionProjection(1200, 1000, 100, 0.9);
			expect(projection.isCrossed).toBe(true);
			expect(projection.isReachable).toBe(true);
			expect(projection.projectedSeconds).toBe(0);
			expect(projection.displayText).toContain('Threshold reached');
		});

		it('returns isReachable=false when total stake cannot reach the threshold', () => {
			// S = 50, alpha = 0.9 => max is 500, threshold is 1000
			const projection = calculateConvictionProjection(200, 1000, 50, 0.9);
			expect(projection.isCrossed).toBe(false);
			expect(projection.isReachable).toBe(false);
			expect(projection.projectedSeconds).toBeNull();
			expect(projection.displayText).toBe('Threshold unreachable with current stake');
		});

		it('calculates finite projection when threshold is reachable', () => {
			// S = 150, alpha = 0.9 => max is 1500, threshold is 1000, current is 200
			const projection = calculateConvictionProjection(200, 1000, 150, 0.9, 60);
			expect(projection.isCrossed).toBe(false);
			expect(projection.isReachable).toBe(true);
			expect(projection.projectedSeconds).toBeGreaterThan(0);
			expect(typeof projection.displayText).toBe('string');
			expect(projection.displayText).toMatch(/Estimated crossing/);
		});

		it('updates projection when stake changes or is withdrawn', () => {
			// High stake: 200 => max = 2000
			const projectionHigh = calculateConvictionProjection(100, 1000, 200, 0.9, 60);
			// Withdrawing half the stake: 100 => max = 1000
			const projectionLower = calculateConvictionProjection(100, 1000, 100, 0.9, 60);

			expect(projectionHigh.projectedSeconds).not.toBeNull();
			expect(projectionLower.projectedSeconds).not.toBeNull();
			// Lower stake takes longer to reach threshold
			expect(projectionLower.projectedSeconds!).toBeGreaterThan(
				projectionHigh.projectedSeconds!
			);
		});
	});

	describe('calculateConvictionBalances and allocation limits', () => {
		it('computes unallocated balance correctly across multiple proposals', () => {
			const total = 500;
			const allocations = { prop1: 150, prop2: 100, prop3: 50 };
			const result = calculateConvictionBalances(total, allocations);

			expect(result.totalStakeableBalance).toBe(500);
			expect(result.totalAllocatedStake).toBe(300);
			expect(result.unallocatedBalance).toBe(200);
		});

		it('ensures unallocated balance does not drop below 0 if over-allocated', () => {
			const total = 200;
			const allocations = [150, 100];
			const result = calculateConvictionBalances(total, allocations);
			expect(result.unallocatedBalance).toBe(0);
		});

		it('limits slider maximum to unallocated balance plus current proposal stake', () => {
			const unallocated = 200;
			const currentStake = 50;
			const maxForProp = getMaxStakeForProposal(unallocated, currentStake);
			// User can allocate up to 250 on this proposal (their 50 existing + 200 unallocated)
			expect(maxForProp).toBe(250);

			const maxWithNoExisting = getMaxStakeForProposal(unallocated, 0);
			expect(maxWithNoExisting).toBe(200);
		});
	});

	describe('formatProjectedDuration', () => {
		it('formats zero or negative as reached', () => {
			expect(formatProjectedDuration(0)).toBe('Threshold reached');
			expect(formatProjectedDuration(-5)).toBe('Threshold reached');
		});

		it('formats minutes', () => {
			expect(formatProjectedDuration(120)).toBe('Estimated crossing in ~2 mins');
		});

		it('formats hours', () => {
			expect(formatProjectedDuration(7200)).toBe('Estimated crossing in ~2 hours');
		});

		it('formats days', () => {
			expect(formatProjectedDuration(172800)).toBe('Estimated crossing in ~2 days');
		});
	});
});
