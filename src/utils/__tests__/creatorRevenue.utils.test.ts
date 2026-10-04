import { describe, expect, it } from 'vitest';
import {
	calculateTotalEarnings,
	aggregateRevenueSummary,
	filterRevenueHistoryByTimeRange,
	hasClaimableProceeds,
	loadCreatorWithdrawalHistory,
	saveCreatorWithdrawalHistory,
	buildMockWithdrawalTxHash,
	generateMockRevenueHistory,
	getCreatorWithdrawalStorageKey,
} from '../creatorRevenue.utils';
import type {
	CreatorWithdrawalRecord,
	RevenueHistoryPoint,
} from '@/types/creatorRevenue';

describe('creatorRevenue.utils', () => {
	describe('calculateTotalEarnings', () => {
		it('sums royalties, subscription fees, and dividend deposits', () => {
			expect(calculateTotalEarnings(100, 50, 25)).toBe(175);
		});

		it('handles missing, null, negative, or undefined values gracefully', () => {
			expect(calculateTotalEarnings(null, undefined, 50)).toBe(50);
			expect(calculateTotalEarnings(-10, 20, 0)).toBe(20);
			expect(calculateTotalEarnings(NaN, 15, Infinity)).toBe(15);
		});
	});

	describe('aggregateRevenueSummary', () => {
		it('aggregates correctly per source from API payload', () => {
			const raw = {
				royaltiesEarned: 240.5,
				subscriptionFees: 120.0,
				dividendDeposits: 60.5,
				totalEarnings: 421.0,
				claimableProceeds: 150.0,
				totalWithdrawn: 271.0,
			};

			const summary = aggregateRevenueSummary('creator-1', raw);
			expect(summary.creatorId).toBe('creator-1');
			expect(summary.royaltiesEarned).toBe(240.5);
			expect(summary.subscriptionFees).toBe(120.0);
			expect(summary.dividendDeposits).toBe(60.5);
			expect(summary.totalEarnings).toBe(421.0);
			expect(summary.claimableProceeds).toBe(150.0);
			expect(summary.totalWithdrawn).toBe(271.0);
		});

		it('computes totalEarnings and claimableProceeds when missing from raw data', () => {
			const raw = {
				royaltiesEarned: 100,
				subscriptionFees: 50,
				dividendDeposits: 25,
				totalWithdrawn: 50,
			};

			const summary = aggregateRevenueSummary('creator-2', raw);
			expect(summary.totalEarnings).toBe(175);
			expect(summary.claimableProceeds).toBe(125);
		});

		it('returns safe zero defaults when raw is empty or undefined', () => {
			const summary = aggregateRevenueSummary('creator-3', undefined);
			expect(summary.royaltiesEarned).toBe(0);
			expect(summary.subscriptionFees).toBe(0);
			expect(summary.dividendDeposits).toBe(0);
			expect(summary.totalEarnings).toBe(0);
			expect(summary.claimableProceeds).toBe(0);
			expect(summary.totalWithdrawn).toBe(0);
		});
	});

	describe('hasClaimableProceeds', () => {
		it('returns true when proceeds > 0', () => {
			expect(hasClaimableProceeds(10)).toBe(true);
			expect(hasClaimableProceeds(0.01)).toBe(true);
		});

		it('returns false when proceeds <= 0 or non-finite', () => {
			expect(hasClaimableProceeds(0)).toBe(false);
			expect(hasClaimableProceeds(-5)).toBe(false);
			expect(hasClaimableProceeds(null)).toBe(false);
			expect(hasClaimableProceeds(undefined)).toBe(false);
		});
	});

	describe('filterRevenueHistoryByTimeRange', () => {
		const now = Date.now();
		const samplePoints: RevenueHistoryPoint[] = [
			{
				timestamp: new Date(now - 12 * 60 * 60 * 1000).toISOString(), // 12h ago
				royalties: 10,
				subscriptionFees: 5,
				dividendDeposits: 2,
				total: 17,
			},
			{
				timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3d ago
				royalties: 20,
				subscriptionFees: 10,
				dividendDeposits: 4,
				total: 34,
			},
			{
				timestamp: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15d ago
				royalties: 30,
				subscriptionFees: 15,
				dividendDeposits: 6,
				total: 51,
			},
			{
				timestamp: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60d ago
				royalties: 40,
				subscriptionFees: 20,
				dividendDeposits: 8,
				total: 68,
			},
		];

		it('filters correctly for 24h range', () => {
			const filtered = filterRevenueHistoryByTimeRange(samplePoints, '24h');
			expect(filtered.length).toBe(1);
			expect(filtered[0].total).toBe(17);
		});

		it('filters correctly for 7d range', () => {
			const filtered = filterRevenueHistoryByTimeRange(samplePoints, '7d');
			expect(filtered.length).toBe(2);
		});

		it('filters correctly for 30d range', () => {
			const filtered = filterRevenueHistoryByTimeRange(samplePoints, '30d');
			expect(filtered.length).toBe(3);
		});

		it('returns all points for all range in chronological order', () => {
			const filtered = filterRevenueHistoryByTimeRange(samplePoints, 'all');
			expect(filtered.length).toBe(4);
			// Chronological order: oldest first
			expect(filtered[0].total).toBe(68);
			expect(filtered[3].total).toBe(17);
		});
	});

	describe('generateMockRevenueHistory', () => {
		it('generates points with valid values per source across all time ranges', () => {
			(['24h', '7d', '30d', 'all'] as const).forEach(interval => {
				const points = generateMockRevenueHistory(interval);
				expect(points.length).toBeGreaterThan(0);
				points.forEach(pt => {
					expect(pt.royalties).toBeGreaterThan(0);
					expect(pt.subscriptionFees).toBeGreaterThan(0);
					expect(pt.dividendDeposits).toBeGreaterThan(0);
					expect(pt.total).toBeCloseTo(
						pt.royalties + pt.subscriptionFees + pt.dividendDeposits,
						1
					);
				});
			});
		});
	});

	describe('Withdrawal storage persistence', () => {
		const mockStorage = (() => {
			let store: Record<string, string> = {};
			return {
				getItem: (key: string) => store[key] ?? null,
				setItem: (key: string, val: string) => {
					store[key] = val;
				},
				clear: () => {
					store = {};
				},
			};
		})();

		it('saves and loads withdrawal history correctly', () => {
			mockStorage.clear();
			const records: CreatorWithdrawalRecord[] = [
				{
					id: 'wd-1',
					creatorId: 'c1',
					amount: 100,
					timestamp: 1700000000000,
					transactionHash: 'hash1',
					status: 'confirmed',
				},
				{
					id: 'wd-2',
					creatorId: 'c1',
					amount: 50,
					timestamp: 1700000050000,
					transactionHash: 'hash2',
					status: 'confirmed',
				},
			];

			saveCreatorWithdrawalHistory('c1', records, mockStorage);
			const loaded = loadCreatorWithdrawalHistory('c1', mockStorage);
			expect(loaded.length).toBe(2);
			// Newest first
			expect(loaded[0].id).toBe('wd-2');
			expect(loaded[1].id).toBe('wd-1');
		});

		it('returns empty array when key does not exist or payload is corrupted', () => {
			expect(loadCreatorWithdrawalHistory('unknown', mockStorage)).toEqual(
				[]
			);
			mockStorage.setItem(
				getCreatorWithdrawalStorageKey('corrupt'),
				'invalid-json'
			);
			expect(loadCreatorWithdrawalHistory('corrupt', mockStorage)).toEqual(
				[]
			);
		});
	});

	describe('buildMockWithdrawalTxHash', () => {
		it('returns a 64-character hex string', () => {
			const hash = buildMockWithdrawalTxHash();
			expect(hash).toHaveLength(64);
			expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
		});
	});
});
