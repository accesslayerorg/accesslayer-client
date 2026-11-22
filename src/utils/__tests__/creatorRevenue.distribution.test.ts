import { beforeEach, describe, expect, it } from 'vitest';
import {
	DISTRIBUTION_TOP_HOLDERS_COUNT,
	MIN_DISTRIBUTION_AMOUNT_XLM,
	computeDistributionPreview,
	getDistributionAmountError,
	getEligibleDistributionHolders,
	loadCreatorDistributionHistory,
	parseDistributionAmount,
	saveCreatorDistributionHistory,
} from '../creatorRevenue.utils';
import type { RevenueDistributionRecord } from '@/types/creatorRevenue';
import type { KeyHolderEntry } from '@/services/course.service';

function holder(
	id: string,
	displayName: string,
	keyCount: number,
	walletAddress = `G${id}`
): KeyHolderEntry {
	return { id, displayName, walletAddress, keyCount };
}

describe('creatorRevenue distribution utils (#revenue-distribution)', () => {
	describe('parseDistributionAmount', () => {
		it('parses a finite numeric input', () => {
			expect(parseDistributionAmount('12.5')).toBe(12.5);
			expect(parseDistributionAmount(' 40 ')).toBe(40);
		});

		it('returns null for empty or non-numeric input', () => {
			expect(parseDistributionAmount('')).toBeNull();
			expect(parseDistributionAmount('   ')).toBeNull();
			expect(parseDistributionAmount('abc')).toBeNull();
		});
	});

	describe('getDistributionAmountError', () => {
		it('requires an amount', () => {
			expect(getDistributionAmountError('')).toBe(
				'Distribution amount is required'
			);
		});

		it('rejects non-numeric input', () => {
			expect(getDistributionAmountError('abc')).toBe('Enter a valid number');
		});

		it('enforces the minimum distribution amount', () => {
			expect(MIN_DISTRIBUTION_AMOUNT_XLM).toBe(1);
			expect(getDistributionAmountError('0.5')).toBe(
				`Minimum distribution is ${MIN_DISTRIBUTION_AMOUNT_XLM} XLM`
			);
			expect(getDistributionAmountError('0')).toBe(
				`Minimum distribution is ${MIN_DISTRIBUTION_AMOUNT_XLM} XLM`
			);
		});

		it('accepts amounts at or above the minimum', () => {
			expect(getDistributionAmountError('1')).toBeNull();
			expect(getDistributionAmountError('250.75')).toBeNull();
		});
	});

	describe('getEligibleDistributionHolders', () => {
		it('drops holders without keys and sorts by key count descending', () => {
			const eligible = getEligibleDistributionHolders([
				holder('a', 'Alice', 5),
				holder('b', 'Bob', 0),
				holder('c', 'Carol', 12),
			]);

			expect(eligible.map(h => h.id)).toEqual(['c', 'a']);
		});

		it('returns an empty array for missing input', () => {
			expect(getEligibleDistributionHolders(undefined)).toEqual([]);
			expect(getEligibleDistributionHolders(null)).toEqual([]);
		});
	});

	describe('computeDistributionPreview', () => {
		const holders = [
			holder('a', 'Alice', 30),
			holder('b', 'Bob', 10),
			holder('c', 'Carol', 5),
			holder('d', 'Dan', 5),
			holder('e', 'Eve', 5),
			holder('f', 'Fay', 5),
			holder('g', 'Gil', 5),
			holder('z', 'Zed', 0),
		];

		it('allocates the amount pro-rata by key count', () => {
			const preview = computeDistributionPreview(holders, 100);

			// Eligible keys: 30 + 10 + 5*5 = 65 (Zed holds none)
			const alice = preview.find(p => p.walletAddress === 'Ga');
			const bob = preview.find(p => p.walletAddress === 'Gb');

			expect(alice?.share).toBeCloseTo(30 / 65, 5);
			expect(alice?.estimatedAmount).toBeCloseTo((100 * 30) / 65, 1);
			expect(bob?.share).toBeCloseTo(10 / 65, 5);
			expect(bob?.estimatedAmount).toBeCloseTo((100 * 10) / 65, 1);
		});

		it('returns only the top holders, capped at the configured limit', () => {
			const preview = computeDistributionPreview(holders, 100);

			expect(preview).toHaveLength(DISTRIBUTION_TOP_HOLDERS_COUNT);
			expect(preview[0].walletAddress).toBe('Ga');
			expect(preview[1].walletAddress).toBe('Gb');
			// Holders with zero keys never appear
			expect(preview.some(p => p.walletAddress === 'Gz')).toBe(false);
		});

		it('returns an empty preview without a positive amount or holders', () => {
			expect(computeDistributionPreview(holders, 0)).toEqual([]);
			expect(computeDistributionPreview(holders, Number.NaN)).toEqual([]);
			expect(computeDistributionPreview([], 100)).toEqual([]);
		});
	});

	describe('distribution history persistence', () => {
		const store: Record<string, string> = {};
		const storage = {
			getItem: (key: string) => store[key] ?? null,
			setItem: (key: string, value: string) => {
				store[key] = value;
			},
		};

		beforeEach(() => {
			for (const key of Object.keys(store)) delete store[key];
		});

		it('saves and reloads records newest first', () => {
			const records: RevenueDistributionRecord[] = [
				{
					id: 'dist-1',
					creatorId: 'c1',
					amount: 25,
					timestamp: 1_700_000_000_000,
					holderCount: 4,
					status: 'confirmed',
				},
				{
					id: 'dist-2',
					creatorId: 'c1',
					amount: 50,
					timestamp: 1_700_000_060_000,
					holderCount: 6,
					status: 'confirmed',
				},
			];

			saveCreatorDistributionHistory('c1', records, storage);
			const loaded = loadCreatorDistributionHistory('c1', storage);

			expect(loaded.map(r => r.id)).toEqual(['dist-2', 'dist-1']);
			expect(loaded[0].holderCount).toBe(6);
		});

		it('returns an empty array when nothing was persisted', () => {
			expect(loadCreatorDistributionHistory('unknown', storage)).toEqual([]);
		});
	});
});
