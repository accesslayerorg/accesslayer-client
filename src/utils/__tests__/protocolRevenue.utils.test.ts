import { describe, expect, it } from 'vitest';
import {
	buildMockTransactionHash,
	computeRevenueShare,
	computeTotalClaimable,
	getClaimHistoryStorageKey,
	hasClaimableRevenue,
	loadClaimHistory,
	saveClaimHistory,
	type RevenueClaimRecord,
} from '@/utils/protocolRevenue.utils';

function makeStorage(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial));
	return {
		getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
		setItem: (key: string, value: string) => {
			data.set(key, value);
		},
	};
}

describe('computeRevenueShare (#920)', () => {
	it('computes a pro-rata share of the fee pool', () => {
		// 10 / 100 * 500 = 50
		expect(
			computeRevenueShare({ userStaked: 10, totalStaked: 100, feePool: 500 })
		).toBeCloseTo(50, 10);
	});

	it('returns 0 for missing or empty inputs', () => {
		expect(computeRevenueShare({})).toBe(0);
		expect(
			computeRevenueShare({ userStaked: 10, totalStaked: 0, feePool: 500 })
		).toBe(0);
		expect(
			computeRevenueShare({ userStaked: -5, totalStaked: 100, feePool: 500 })
		).toBe(0);
	});

	it('never returns Infinity or NaN', () => {
		expect(
			computeRevenueShare({
				userStaked: Number.POSITIVE_INFINITY,
				totalStaked: 100,
				feePool: 500,
			})
		).toBe(0);
		expect(
			computeRevenueShare({
				userStaked: 10,
				totalStaked: Number.NaN,
				feePool: 500,
			})
		).toBe(0);
	});
});

describe('computeTotalClaimable / hasClaimableRevenue (#920)', () => {
	it('sums per-position amounts ignoring invalid entries', () => {
		expect(computeTotalClaimable([1.5, null, undefined, 2.5, -1])).toBeCloseTo(
			4,
			10
		);
		expect(computeTotalClaimable([])).toBe(0);
	});

	it('reports claimability only when the total is positive', () => {
		expect(hasClaimableRevenue(4)).toBe(true);
		expect(hasClaimableRevenue(0)).toBe(false);
		expect(hasClaimableRevenue(null)).toBe(false);
	});
});

describe('claim history storage (#920)', () => {
	it('builds a wallet-scoped storage key', () => {
		expect(getClaimHistoryStorageKey('0xabc')).toBe(
			'accesslayer:claim_history:0xabc'
		);
	});

	it('round-trips records newest-first and rejects corrupt payloads', () => {
		const storage = makeStorage();
		const records: RevenueClaimRecord[] = [
			{
				id: 'a',
				amount: 1,
				timestamp: 1000,
				transactionHash: 'hash-a',
			},
			{
				id: 'b',
				amount: 2,
				timestamp: 2000,
				transactionHash: 'hash-b',
			},
		];
		saveClaimHistory('0xabc', records, storage);
		expect(loadClaimHistory('0xabc', storage).map(r => r.id)).toEqual([
			'b',
			'a',
		]);

		const corrupt = makeStorage({
			[getClaimHistoryStorageKey('0xabc')]: 'not-json',
		});
		expect(loadClaimHistory('0xabc', corrupt)).toEqual([]);
	});

	it('builds a 64-char hex mock transaction hash', () => {
		expect(buildMockTransactionHash()).toMatch(/^[0-9a-f]{64}$/);
	});
});
