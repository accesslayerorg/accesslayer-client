import { describe, expect, it } from 'vitest';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';
import {
	buildPortfolioTableRows,
	defaultDirectionForSortKey,
	sortPortfolioTableRows,
} from '../portfolioTable.utils';

/** +100%: 10 keys bought at 0.1 XLM, now 0.2 XLM each. */
const GAIN: HeldKeyPosition = {
	creatorId: 'alpha',
	quantity: 10,
	averagePurchasePriceStroops: 1_000_000,
	priceStroops: 2_000_000,
};

/** -50%: 5 keys bought at 0.2 XLM, now 0.1 XLM each. */
const LOSS: HeldKeyPosition = {
	creatorId: 'beta',
	quantity: 5,
	averagePurchasePriceStroops: 2_000_000,
	priceStroops: 1_000_000,
};

/** No price → PnL withheld. */
const UNKNOWN: HeldKeyPosition = {
	creatorId: 'gamma',
	quantity: 1,
	averagePurchasePriceStroops: 1_000_000,
};

describe('buildPortfolioTableRows (#1116)', () => {
	it('pairs each position with its resolved PnL and display name', () => {
		const rows = buildPortfolioTableRows([GAIN, LOSS], {
			alpha: 'Zeta Key',
		});

		expect(rows).toHaveLength(2);

		const gain = rows.find(row => row.creatorId === 'alpha');
		expect(gain?.keyName).toBe('Zeta Key');
		expect(gain?.pnl.status).toBe('ready');
		expect(gain?.pnl.currentValueStroops).toBe(20_000_000);
		expect(gain?.pnl.unrealisedPnLStroops).toBe(10_000_000);
		expect(gain?.pnl.pnlPercentage).toBe(100);
	});

	it('falls back to the creator id when no display name is known', () => {
		const rows = buildPortfolioTableRows([LOSS]);
		expect(rows[0].keyName).toBe('beta');
	});

	it('marks positions without a price as unavailable with withheld PnL', () => {
		const rows = buildPortfolioTableRows([UNKNOWN]);
		expect(rows[0].pnl.status).toBe('unavailable');
		expect(rows[0].pnl.unrealisedPnLStroops).toBeNull();
		expect(rows[0].pnl.pnlPercentage).toBeNull();
	});
});

describe('sortPortfolioTableRows (#1116)', () => {
	const rows = buildPortfolioTableRows([UNKNOWN, GAIN, LOSS], {
		alpha: 'Zeta Key',
		beta: 'Alpha Key',
	});

	it('defaults to descending for numeric columns and ascending for names', () => {
		expect(defaultDirectionForSortKey('pnl_percent')).toBe('desc');
		expect(defaultDirectionForSortKey('current_value')).toBe('desc');
		expect(defaultDirectionForSortKey('key_name')).toBe('asc');
	});

	it('sorts by PnL % in both directions with unknown values last', () => {
		const desc = sortPortfolioTableRows(rows, 'pnl_percent', 'desc');
		expect(desc.map(row => row.creatorId)).toEqual(['alpha', 'beta', 'gamma']);

		const asc = sortPortfolioTableRows(rows, 'pnl_percent', 'asc');
		expect(asc.map(row => row.creatorId)).toEqual(['beta', 'alpha', 'gamma']);
	});

	it('sorts by current value in both directions with unknown values last', () => {
		const desc = sortPortfolioTableRows(rows, 'current_value', 'desc');
		expect(desc.map(row => row.creatorId)).toEqual(['alpha', 'beta', 'gamma']);

		const asc = sortPortfolioTableRows(rows, 'current_value', 'asc');
		expect(asc.map(row => row.creatorId)).toEqual(['beta', 'alpha', 'gamma']);
	});

	it('sorts by key name in both directions', () => {
		// Locale collation compares base letters first, so "gamma" sorts
		// between the A and Z names case-insensitively.
		const asc = sortPortfolioTableRows(rows, 'key_name', 'asc');
		expect(asc.map(row => row.keyName)).toEqual([
			'Alpha Key',
			'gamma',
			'Zeta Key',
		]);

		const desc = sortPortfolioTableRows(rows, 'key_name', 'desc');
		expect(desc.map(row => row.keyName)).toEqual([
			'Zeta Key',
			'gamma',
			'Alpha Key',
		]);
	});

	it('breaks ties on creator id and does not mutate the input', () => {
		const tied = buildPortfolioTableRows([
			{ ...GAIN, creatorId: 'zzz' },
			{ ...GAIN, creatorId: 'aaa' },
		]);
		const sorted = sortPortfolioTableRows(tied, 'pnl_percent', 'desc');
		expect(sorted.map(row => row.creatorId)).toEqual(['aaa', 'zzz']);
		expect(tied.map(row => row.creatorId)).toEqual(['zzz', 'aaa']);
	});
});
