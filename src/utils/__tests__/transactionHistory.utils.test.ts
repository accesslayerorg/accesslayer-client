import { describe, expect, it } from 'vitest';
import type { WalletTransaction } from '@/services/transactionHistory.service';
import {
	getTypesForFilter,
	matchesTransactionFilters,
	mergeTransactionPages,
	resolveDateRange,
	transactionsToCsv,
} from '@/utils/transactionHistory.utils';

const DAY = 24 * 60 * 60 * 1000;
// 15 Oct 2026, 15:30 local time.
const NOW = new Date(2026, 9, 15, 15, 30).getTime();

function tx(overrides: Partial<WalletTransaction> = {}): WalletTransaction {
	return {
		id: 'tx-1',
		type: 'buy',
		keyName: 'Lena Markov',
		amount: 12.5,
		direction: 'out',
		fee: 0.01,
		timestamp: NOW - 1000,
		txHash: 'abc123',
		...overrides,
	};
}

describe('getTypesForFilter', () => {
	it('returns no restriction for "all"', () => {
		expect(getTypesForFilter('all')).toBeUndefined();
	});

	it('groups stake and unstake under "stakes"', () => {
		expect(getTypesForFilter('stakes')).toEqual(['stake', 'unstake']);
	});

	it('maps plural filters to their single type', () => {
		expect(getTypesForFilter('referrals')).toEqual(['referral']);
		expect(getTypesForFilter('swaps')).toEqual(['swap']);
	});
});

describe('resolveDateRange', () => {
	it('returns an open range for "all"', () => {
		expect(resolveDateRange('all', { start: '', end: '' }, NOW)).toEqual({});
	});

	it('starts "today" at local midnight', () => {
		const range = resolveDateRange('today', { start: '', end: '' }, NOW);
		expect(range).toEqual({
			from: new Date(2026, 9, 15).getTime(),
			to: NOW,
		});
	});

	it('covers the trailing 7 and 30 days', () => {
		expect(resolveDateRange('7d', { start: '', end: '' }, NOW)).toEqual({
			from: NOW - 7 * DAY,
			to: NOW,
		});
		expect(resolveDateRange('30d', { start: '', end: '' }, NOW)).toEqual({
			from: NOW - 30 * DAY,
			to: NOW,
		});
	});

	it('spans whole local days for a custom range', () => {
		const range = resolveDateRange(
			'custom',
			{ start: '2026-10-01', end: '2026-10-03' },
			NOW
		);
		expect(range).toEqual({
			from: new Date(2026, 9, 1).getTime(),
			to: new Date(2026, 9, 3, 23, 59, 59, 999).getTime(),
		});
	});

	it('returns null for incomplete or inverted custom ranges', () => {
		expect(
			resolveDateRange('custom', { start: '2026-10-01', end: '' }, NOW)
		).toBeNull();
		expect(
			resolveDateRange(
				'custom',
				{ start: '2026-10-05', end: '2026-10-01' },
				NOW
			)
		).toBeNull();
	});
});

describe('matchesTransactionFilters', () => {
	it('filters by type group', () => {
		expect(
			matchesTransactionFilters(tx({ type: 'unstake' }), 'stakes', {})
		).toBe(true);
		expect(matchesTransactionFilters(tx({ type: 'buy' }), 'stakes', {})).toBe(
			false
		);
	});

	it('includes both range bounds', () => {
		const range = { from: 100, to: 200 };
		expect(
			matchesTransactionFilters(tx({ timestamp: 100 }), 'all', range)
		).toBe(true);
		expect(
			matchesTransactionFilters(tx({ timestamp: 200 }), 'all', range)
		).toBe(true);
		expect(
			matchesTransactionFilters(tx({ timestamp: 99 }), 'all', range)
		).toBe(false);
		expect(
			matchesTransactionFilters(tx({ timestamp: 201 }), 'all', range)
		).toBe(false);
	});
});

describe('mergeTransactionPages', () => {
	it('appends new rows and skips ids already present', () => {
		const merged = mergeTransactionPages(
			[tx({ id: 'a' }), tx({ id: 'b' })],
			[tx({ id: 'b' }), tx({ id: 'c' }), tx({ id: 'c' })]
		);
		expect(merged.map(t => t.id)).toEqual(['a', 'b', 'c']);
	});
});

describe('transactionsToCsv', () => {
	it('writes a header and one row per transaction', () => {
		const csv = transactionsToCsv([
			tx({ id: 'a', timestamp: Date.UTC(2026, 9, 15, 12) }),
			tx({
				id: 'b',
				type: 'referral',
				direction: 'in',
				keyName: 'Kai Osei',
				amount: 2,
				fee: 0,
				txHash: undefined,
				timestamp: Date.UTC(2026, 9, 14, 8),
			}),
		]);
		expect(csv.split('\r\n')).toEqual([
			'Date,Type,Key,Direction,Amount (XLM),Fee (XLM),Transaction hash',
			'2026-10-15T12:00:00.000Z,Buy,Lena Markov,Out,12.5,0.01,abc123',
			'2026-10-14T08:00:00.000Z,Referral payout,Kai Osei,In,2,0,',
		]);
	});

	it('quotes special characters and neutralises formulas', () => {
		const csv = transactionsToCsv([
			tx({ keyName: 'Smith, "The" Artist' }),
			tx({ id: 'x', keyName: '=HYPERLINK("evil")' }),
		]);
		const [, first, second] = csv.split('\r\n');
		expect(first).toContain('"Smith, ""The"" Artist"');
		expect(second).toContain(`"'=HYPERLINK(""evil"")"`);
	});
});
