import { describe, expect, it } from 'vitest';
import {
	calculateDcaAveragePrice,
	calculateNextRunTime,
	calculateApprovedBudget,
	checkConsecutiveFailureAutoPause,
	recalculatePlanStats,
} from '@/utils/dca.utils';
import type { DcaExecutionRun } from '@/types/dca.types';

describe('DCA Utilities (#1470)', () => {
	describe('calculateDcaAveragePrice', () => {
		it('calculates average price as total spent divided by total quantity bought', () => {
			expect(calculateDcaAveragePrice(100, 10)).toBe(10);
			expect(calculateDcaAveragePrice(250, 20)).toBe(12.5);
			expect(calculateDcaAveragePrice(300, 15)).toBe(20);
		});

		it('handles zero quantity or invalid inputs gracefully', () => {
			expect(calculateDcaAveragePrice(100, 0)).toBe(0);
			expect(calculateDcaAveragePrice(0, 0)).toBe(0);
			expect(calculateDcaAveragePrice(-50, 10)).toBe(0);
			expect(calculateDcaAveragePrice(NaN, 5)).toBe(0);
		});
	});

	describe('calculateNextRunTime', () => {
		it('calculates daily next run (+1 day UTC)', () => {
			const base = new Date('2026-03-01T12:00:00Z');
			const next = calculateNextRunTime('daily', base);
			expect(next).toBe(new Date('2026-03-02T12:00:00Z').toISOString());
		});

		it('calculates weekly next run (+7 days UTC)', () => {
			const base = new Date('2026-03-01T12:00:00Z');
			const next = calculateNextRunTime('weekly', base);
			expect(next).toBe(new Date('2026-03-08T12:00:00Z').toISOString());
		});

		it('calculates monthly next run (+1 month UTC)', () => {
			const base = new Date('2026-03-01T12:00:00Z');
			const next = calculateNextRunTime('monthly', base);
			expect(next).toBe(new Date('2026-04-01T12:00:00Z').toISOString());
		});
	});

	describe('calculateApprovedBudget', () => {
		it('uses totalCap if provided', () => {
			const result = calculateApprovedBudget({
				amountPerPurchaseXlm: 25,
				frequency: 'daily',
				totalCapXlm: 250,
			});
			expect(result.approvedBudgetXlm).toBe(250);
			expect(result.estimatedRuns).toBe(10);
		});

		it('calculates based on frequency default if no cap or endDate', () => {
			const daily = calculateApprovedBudget({
				amountPerPurchaseXlm: 10,
				frequency: 'daily',
			});
			expect(daily.estimatedRuns).toBe(30);
			expect(daily.approvedBudgetXlm).toBe(300);

			const weekly = calculateApprovedBudget({
				amountPerPurchaseXlm: 10,
				frequency: 'weekly',
			});
			expect(weekly.estimatedRuns).toBe(12);
			expect(weekly.approvedBudgetXlm).toBe(120);
		});
	});

	describe('checkConsecutiveFailureAutoPause', () => {
		it('returns false when failures are below 3', () => {
			expect(checkConsecutiveFailureAutoPause(0)).toBe(false);
			expect(checkConsecutiveFailureAutoPause(1)).toBe(false);
			expect(checkConsecutiveFailureAutoPause(2)).toBe(false);
		});

		it('returns true when failures reach or exceed 3', () => {
			expect(checkConsecutiveFailureAutoPause(3)).toBe(true);
			expect(checkConsecutiveFailureAutoPause(4)).toBe(true);
		});
	});

	describe('recalculatePlanStats', () => {
		it('aggregates successful runs and tracks consecutive failures from the latest run', () => {
			const runs: DcaExecutionRun[] = [
				{
					id: 'r1',
					planId: 'p1',
					timestamp: '2026-03-01T00:00:00Z',
					status: 'success',
					quantity: 5,
					spentXlm: 50,
				},
				{
					id: 'r2',
					planId: 'p1',
					timestamp: '2026-03-02T00:00:00Z',
					status: 'success',
					quantity: 5,
					spentXlm: 60,
				},
				{
					id: 'r3',
					planId: 'p1',
					timestamp: '2026-03-03T00:00:00Z',
					status: 'skipped',
					skipReason: 'Insufficient balance',
				},
				{
					id: 'r4',
					planId: 'p1',
					timestamp: '2026-03-04T00:00:00Z',
					status: 'failed',
					skipReason: 'Slippage exceeded',
				},
			];

			const stats = recalculatePlanStats(runs);
			expect(stats.totalQuantityBought).toBe(10);
			expect(stats.totalInvestedXlm).toBe(110);
			expect(stats.averagePriceXlm).toBe(11);
			expect(stats.consecutiveFailures).toBe(2);
		});

		it('resets consecutive failures if the latest run succeeded', () => {
			const runs: DcaExecutionRun[] = [
				{ id: 'r1', planId: 'p1', timestamp: '2026-03-01T00:00:00Z', status: 'skipped', skipReason: 'x' },
				{ id: 'r2', planId: 'p1', timestamp: '2026-03-02T00:00:00Z', status: 'success', quantity: 2, spentXlm: 20 },
			];
			const stats = recalculatePlanStats(runs);
			expect(stats.consecutiveFailures).toBe(0);
		});
	});
});
