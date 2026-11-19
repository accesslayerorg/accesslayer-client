import { describe, expect, it } from 'vitest';
import {
	buildReferralEarningsRows,
	buildReferralLink,
	buildTelegramShareUrl,
	countReferralTiers,
	resolveReferralTier,
	truncateWalletAddress,
	aggregateReferralEarnings,
	REFERRAL_TIERS,
} from '../referral.utils';
import type { ReferredWallet } from '@/services/referral.service';

function makeWallet(overrides: Partial<ReferredWallet> = {}): ReferredWallet {
	return {
		address: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567abcdefghijklmnopqrstuv',
		joinedAt: '2026-01-01T00:00:00.000Z',
		status: 'rewarded',
		...overrides,
	};
}

describe('resolveReferralTier (#1119)', () => {
	it('reads a valid tier off the wallet', () => {
		expect(resolveReferralTier(makeWallet({ tier: 2 }))).toBe(2);
		expect(resolveReferralTier(makeWallet({ tier: 3 }))).toBe(3);
	});

	it('defaults to Tier 1 when the tier is missing', () => {
		expect(resolveReferralTier(makeWallet())).toBe(1);
		expect(resolveReferralTier(undefined)).toBe(1);
		expect(resolveReferralTier(null)).toBe(1);
	});

	it('falls back to Tier 1 for out-of-range or invalid tiers', () => {
		expect(resolveReferralTier(makeWallet({ tier: 0 }))).toBe(1);
		expect(resolveReferralTier(makeWallet({ tier: 4 }))).toBe(1);
		expect(resolveReferralTier(makeWallet({ tier: -2 }))).toBe(1);
		expect(resolveReferralTier(makeWallet({ tier: Number.NaN }))).toBe(1);
	});

	it('rounds fractional tiers to the nearest integer', () => {
		expect(resolveReferralTier(makeWallet({ tier: 2.4 }))).toBe(2);
	});
});

describe('countReferralTiers (#1119)', () => {
	it('counts wallets per tier', () => {
		const counts = countReferralTiers([
			makeWallet({ address: 'A', tier: 1 }),
			makeWallet({ address: 'B', tier: 1 }),
			makeWallet({ address: 'C', tier: 2 }),
			makeWallet({ address: 'D', tier: 3 }),
			makeWallet({ address: 'E' }), // missing tier → Tier 1
		]);

		expect(counts).toEqual({ 1: 3, 2: 1, 3: 1 });
		expect(REFERRAL_TIERS).toEqual([1, 2, 3]);
	});

	it('returns zeroed counts for an empty list', () => {
		expect(countReferralTiers([])).toEqual({ 1: 0, 2: 0, 3: 0 });
	});

	it('ignores null entries', () => {
		expect(countReferralTiers([null, undefined])).toEqual({
			1: 0,
			2: 0,
			3: 0,
		});
	});
});

describe('truncateWalletAddress (#1119)', () => {
	it('keeps the first four and last four characters', () => {
		expect(truncateWalletAddress('GABCDEFGHIZKLMNOPQRSTU')).toBe(
			'GABC…RSTU'
		);
	});

	it('returns short addresses unchanged', () => {
		expect(truncateWalletAddress('SHORT')).toBe('SHORT');
		expect(truncateWalletAddress('1234567890')).toBe('1234567890');
	});

	it('returns an empty string for blank input', () => {
		expect(truncateWalletAddress('')).toBe('');
		expect(truncateWalletAddress('   ')).toBe('');
		expect(truncateWalletAddress(null)).toBe('');
	});
});

describe('buildReferralEarningsRows (#1119)', () => {
	it('builds rows only for wallets that earned a reward', () => {
		const rows = buildReferralEarningsRows([
			makeWallet({
				address: 'GEARNED',
				rewardXlm: 1.5,
				firstTradeAt: '2026-02-01T00:00:00.000Z',
				tier: 2,
			}),
			makeWallet({ address: 'GNOTRADED', rewardXlm: null }),
			makeWallet({ address: 'GZERO', rewardXlm: 0 }),
		]);

		expect(rows).toHaveLength(1);
		expect(rows[0]).toEqual(
			expect.objectContaining({
				sourceWallet: 'GEARNED',
				tier: 2,
				amountXlm: 1.5,
				date: '2026-02-01T00:00:00.000Z',
			})
		);
	});

	it('sorts rows by date descending (newest earning first)', () => {
		const rows = buildReferralEarningsRows([
			makeWallet({
				address: 'GOLD',
				rewardXlm: 1,
				firstTradeAt: '2026-01-15T00:00:00.000Z',
			}),
			makeWallet({
				address: 'NEWEST',
				rewardXlm: 2,
				firstTradeAt: '2026-03-01T00:00:00.000Z',
			}),
			makeWallet({
				address: 'MIDDLE',
				rewardXlm: 3,
				firstTradeAt: '2026-02-01T00:00:00.000Z',
			}),
		]);

		expect(rows.map(row => row.sourceWallet)).toEqual([
			'NEWEST',
			'MIDDLE',
			'GOLD',
		]);
	});

	it('falls back to the join date when no first trade exists', () => {
		const rows = buildReferralEarningsRows([
			makeWallet({ address: 'GJOINED', rewardXlm: 1, joinedAt: '2026-05-05T00:00:00.000Z' }),
		]);

		expect(rows[0].date).toBe('2026-05-05T00:00:00.000Z');
	});

	it('marks claimed earnings', () => {
		const rows = buildReferralEarningsRows([
			makeWallet({ address: 'GCLAIMED', rewardXlm: 1, rewardClaimed: true }),
			makeWallet({ address: 'GPENDING', rewardXlm: 1, rewardClaimed: false }),
		]);

		expect(rows.map(row => row.claimed)).toEqual([true, false]);
	});
});

describe('buildTelegramShareUrl (#1119)', () => {
	it('builds a pre-filled t.me share URL with encoded params', () => {
		const link = 'https://app.test/?ref=GABC&x=1';
		const url = buildTelegramShareUrl(link, 'Join AccessLayer');

		expect(url).toBe(
			`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join AccessLayer')}`
		);
	});

	it('defaults the caption to the standard referral share text', () => {
		const link = 'https://app.test/?ref=GABC';
		const url = buildTelegramShareUrl(link);

		expect(url).toContain(
			encodeURIComponent(
				`Join AccessLayer with my link and start trading creator keys: ${link}`
			)
		);
	});
});

describe('buildReferralLink (#1119)', () => {
	it('appends the referral query parameter to the origin', () => {
		expect(
			buildReferralLink({ wallet: 'GABC', origin: 'https://app.test' })
		).toBe('https://app.test/?ref=GABC');
	});

	it('returns an empty string without a wallet', () => {
		expect(buildReferralLink({ wallet: '' })).toBe('');
	});
});

describe('aggregateReferralEarnings claimability (#1119)', () => {
	it('flags a claimable balance only when pending XLM is positive', () => {
		expect(
			aggregateReferralEarnings({ wallet: 'GABC', pendingXlm: 2 }).hasClaimable
		).toBe(true);
		expect(
			aggregateReferralEarnings({ wallet: 'GABC', pendingXlm: 0 }).hasClaimable
		).toBe(false);
		expect(aggregateReferralEarnings(null).hasClaimable).toBe(false);
	});
});
