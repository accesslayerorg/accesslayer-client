import { describe, expect, it } from 'vitest';
import {
	calculatePnLSummary,
	formatPnLDisplay,
	formatPnLPercentage,
	type HeldKeyPosition,
} from '@/utils/portfolioValue.utils';

const createPosition = (
	creatorId: string,
	quantity: number,
	priceStroops: number,
	overrides?: Partial<HeldKeyPosition>
): HeldKeyPosition => ({
	creatorId,
	quantity,
	priceStroops,
	price: priceStroops / 10_000_000,
	...overrides,
});

describe('calculatePnLSummary', () => {
	it('computes correct PnL for positive returns', () => {
		const positions = [
			createPosition('creator1', 10, 1_000_000), // 10 keys @ 0.1 XLM = 1 XLM
		];

		const result = calculatePnLSummary(positions);

		expect(result.status).toBe('ready');
		expect(result.currentValue).toBe(10_000_000); // 1 XLM in stroops
		expect(result.totalInvested).toBe(10_000_000);
		expect(result.unrealisedPnL).toBe(0);
		expect(result.pnlPercentage).toBe(0);
	});

	it('computes correct PnL for empty holdings', () => {
		const result = calculatePnLSummary([]);

		expect(result.status).toBe('ready');
		expect(result.totalInvested).toBe(0);
		expect(result.currentValue).toBe(0);
		expect(result.unrealisedPnL).toBe(0);
		expect(result.pnlPercentage).toBe(0);
	});

	it('returns loading status when prices are loading', () => {
		const positions = [
			createPosition('creator1', 10, 1_000_000, { isPriceLoading: true }),
		];

		const result = calculatePnLSummary(positions);

		expect(result.status).toBe('loading');
	});

	it('returns unavailable status when prices are missing', () => {
		const positions = [
			createPosition('creator1', 10, 0, { priceStroops: null, price: null }),
		];

		const result = calculatePnLSummary(positions);

		expect(result.status).toBe('unavailable');
	});

	it('filters out zero-quantity positions', () => {
		const positions = [
			createPosition('creator1', 0, 1_000_000),
			createPosition('creator2', 5, 2_000_000),
		];

		const result = calculatePnLSummary(positions);

		expect(result.status).toBe('ready');
		expect(result.currentValue).toBe(10_000_000); // Only creator2 counts
	});

	it('sums multiple positions correctly', () => {
		const positions = [
			createPosition('creator1', 10, 1_000_000), // 1 XLM
			createPosition('creator2', 5, 2_000_000), // 1 XLM
		];

		const result = calculatePnLSummary(positions);

		expect(result.status).toBe('ready');
		expect(result.currentValue).toBe(20_000_000); // 2 XLM
	});
});

describe('formatPnLDisplay', () => {
	it('formats positive values with plus sign', () => {
		expect(formatPnLDisplay(50_000_000)).toBe('+5.00 XLM');
	});

	it('formats negative values with minus sign', () => {
		expect(formatPnLDisplay(-20_000_000)).toBe('-2.00 XLM');
	});

	it('formats zero without sign', () => {
		expect(formatPnLDisplay(0)).toBe('0.00 XLM');
	});
});

describe('formatPnLPercentage', () => {
	it('formats positive percentage with plus sign', () => {
		expect(formatPnLPercentage(50)).toBe('+50.0%');
	});

	it('formats negative percentage with minus sign', () => {
		expect(formatPnLPercentage(-20)).toBe('-20.0%');
	});

	it('formats zero percentage without sign', () => {
		expect(formatPnLPercentage(0)).toBe('0%');
	});
});
