import { beforeEach, describe, expect, it } from 'vitest';
import {
	applyRevenueShareClaims,
	computeHolderProRataShare,
	loadRevenueShareClaims,
	mergeRevenueDistributions,
	mergeRevenueShareClaim,
	saveRevenueShareClaims,
	selectUnclaimedDistributions,
	totalClaimableShare,
} from '../revenueShare.utils';
import type { KeyHolderEntry } from '@/services/course.service';
import type {
	RevenueDistributionRecord,
} from '@/types/creatorRevenue';
import type { RevenueShareDistribution } from '@/types/revenueShare';

const HOLDERS: KeyHolderEntry[] = [
	{
		id: 'h1',
		displayName: 'Alice',
		walletAddress: '0xAAA',
		keyCount: 30,
	},
	{
		id: 'h2',
		displayName: 'Bob',
		walletAddress: '0xBBB',
		keyCount: 10,
	},
];

function distribution(
	overrides: Partial<RevenueShareDistribution> = {}
): RevenueShareDistribution {
	return {
		id: 'dist-1',
		creatorId: 'key-1',
		amount: 100,
		timestamp: 1_700_000_000_000,
		holderCount: 2,
		userShare: 25,
		claimed: false,
		receivedAmount: null,
		claimedAt: null,
		...overrides,
	};
}

describe('computeHolderProRataShare (#1223)', () => {
	it('computes the holder share from their key count', () => {
		// 30 / 40 * 100 = 75
		expect(computeHolderProRataShare(HOLDERS, '0xaaa', 100)).toBe(75);
	});

	it('matches the address case-insensitively', () => {
		expect(computeHolderProRataShare(HOLDERS, '0xAAA', 100)).toBe(75);
	});

	it('returns 0 for a wallet that holds no keys', () => {
		expect(computeHolderProRataShare(HOLDERS, '0xCCC', 100)).toBe(0);
	});

	it('returns 0 without a wallet, an amount, or holders', () => {
		expect(computeHolderProRataShare(HOLDERS, undefined, 100)).toBe(0);
		expect(computeHolderProRataShare(HOLDERS, '0xAAA', 0)).toBe(0);
		expect(computeHolderProRataShare([], '0xAAA', 100)).toBe(0);
		expect(computeHolderProRataShare(null, '0xAAA', 100)).toBe(0);
	});
});

describe('totalClaimableShare (#1223)', () => {
	it('sums the shares that are not claimed yet', () => {
		const total = totalClaimableShare([
			distribution({ id: 'a', userShare: 10 }),
			distribution({ id: 'b', userShare: 5, claimed: true }),
			distribution({ id: 'c', userShare: 2.5 }),
		]);

		expect(total).toBe(12.5);
	});

	it('is 0 when every distribution is claimed', () => {
		expect(
			totalClaimableShare([distribution({ claimed: true })])
		).toBe(0);
	});
});

describe('selectUnclaimedDistributions (#1223)', () => {
	it('returns the unclaimed distributions oldest first', () => {
		const selected = selectUnclaimedDistributions([
			distribution({ id: 'new', timestamp: 200 }),
			distribution({ id: 'old', timestamp: 100 }),
			distribution({ id: 'done', timestamp: 300, claimed: true }),
		]);

		expect(selected.map(entry => entry.id)).toEqual(['old', 'new']);
	});
});

describe('revenue share claim persistence (#1223)', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('round-trips the claims of a wallet', () => {
		saveRevenueShareClaims('key-1', '0xAAA', [
			{ distributionId: 'dist-1', receivedAmount: 25, claimedAt: 1_000 },
		]);

		const claims = loadRevenueShareClaims('key-1', '0xAAA');
		expect(claims).toHaveLength(1);
		expect(claims[0]).toEqual({
			distributionId: 'dist-1',
			receivedAmount: 25,
			claimedAt: 1_000,
		});
	});

	it('keeps the claims of different wallets apart', () => {
		saveRevenueShareClaims('key-1', '0xAAA', [
			{ distributionId: 'dist-1', receivedAmount: 25, claimedAt: 1_000 },
		]);

		expect(loadRevenueShareClaims('key-1', '0xBBB')).toEqual([]);
		expect(loadRevenueShareClaims('key-2', '0xAAA')).toEqual([]);
	});

	it('returns an empty list without a wallet', () => {
		expect(loadRevenueShareClaims('key-1', undefined)).toEqual([]);
	});

	it('replaces an earlier claim for the same distribution', () => {
		const merged = mergeRevenueShareClaim(
			[
				{ distributionId: 'dist-1', receivedAmount: 10, claimedAt: 1_000 },
				{ distributionId: 'dist-2', receivedAmount: 5, claimedAt: 2_000 },
			],
			{ distributionId: 'dist-1', receivedAmount: 25, claimedAt: 3_000 }
		);

		expect(merged).toHaveLength(2);
		expect(merged[0]).toEqual({
			distributionId: 'dist-1',
			receivedAmount: 25,
			claimedAt: 3_000,
		});
	});
});

describe('mergeRevenueDistributions (#1223)', () => {
	const localRecord: RevenueDistributionRecord = {
		id: 'dist-local',
		creatorId: 'key-1',
		amount: 60,
		timestamp: 1_700_000_000_000,
		holderCount: 3,
		status: 'confirmed',
	};

	it('lists the distributions the creator recorded locally', () => {
		const merged = mergeRevenueDistributions([], [localRecord]);

		expect(merged).toHaveLength(1);
		expect(merged[0].id).toBe('dist-local');
		expect(merged[0].amount).toBe(60);
		// The holder's own share is resolved from their key count.
		expect(merged[0].userShare).toBe(0);
		expect(merged[0].claimed).toBe(false);
	});

	it('prefers the server record when both know a distribution', () => {
		const merged = mergeRevenueDistributions(
			[distribution({ id: 'dist-local', amount: 99, userShare: 25 })],
			[localRecord]
		);

		expect(merged).toHaveLength(1);
		expect(merged[0].amount).toBe(99);
		expect(merged[0].userShare).toBe(25);
	});

	it('merges both sources newest first', () => {
		const merged = mergeRevenueDistributions(
			[distribution({ id: 'dist-remote', timestamp: 2_000 })],
			[localRecord]
		);

		expect(merged.map(entry => entry.id)).toEqual([
			'dist-remote',
			'dist-local',
		]);
	});
});

describe('applyRevenueShareClaims (#1223)', () => {
	it('marks a distribution claimed with the recorded amount and date', () => {
		const merged = applyRevenueShareClaims(
			[distribution({ id: 'dist-1' })],
			[{ distributionId: 'dist-1', receivedAmount: 25, claimedAt: 1_000 }]
		);

		expect(merged[0].claimed).toBe(true);
		expect(merged[0].receivedAmount).toBe(25);
		expect(merged[0].claimedAt).toBe(1_000);
	});

	it('keeps the server values for distributions it already reports claimed', () => {
		const merged = applyRevenueShareClaims(
			[
				distribution({
					id: 'dist-1',
					claimed: true,
					receivedAmount: 30,
					claimedAt: 500,
				}),
			],
			[{ distributionId: 'dist-1', receivedAmount: 25, claimedAt: 1_000 }]
		);

		expect(merged[0].receivedAmount).toBe(30);
		expect(merged[0].claimedAt).toBe(500);
	});

	it('leaves distributions without a local claim untouched', () => {
		const merged = applyRevenueShareClaims([distribution()], []);

		expect(merged[0].claimed).toBe(false);
		expect(merged[0].receivedAmount).toBeNull();
	});
});
