import { describe, expect, it } from 'vitest';
import {
	computeMinimumNextBid,
	DEFAULT_AUCTION_MIN_INCREMENT,
	findWalletBestBid,
	formatAuctionBidAmount,
	getAuctionCountdownState,
	getAuctionPhaseStatus,
	isWalletLeadingAuction,
	rankAuctionBids,
	resolveAuctionMinIncrement,
	resolveHighestBid,
	shortenWalletAddress,
	validateAuctionBid,
} from '@/utils/auctionBid.utils';
import type { AuctionBidEntry } from '@/services/course.service';

describe('getAuctionPhaseStatus (#924, #1164)', () => {
	it('returns inactive when no auction parameters are present', () => {
		expect(getAuctionPhaseStatus({})).toBe('inactive');
		expect(
			getAuctionPhaseStatus({
				auctionPrice: 0,
				auctionSupply: 0,
				auctionEndsAt: null,
			})
		).toBe('inactive');
	});

	it('returns active during pre-launch bidding window', () => {
		const future = new Date(Date.now() + 3600 * 1000).toISOString();
		expect(
			getAuctionPhaseStatus({
				auctionPrice: 5,
				auctionSupply: 100,
				auctionEndsAt: future,
			})
		).toBe('active');
	});

	it('returns ended when auction is explicitly settled (#1164)', () => {
		const future = new Date(Date.now() + 3600 * 1000).toISOString();
		expect(
			getAuctionPhaseStatus({
				auctionPrice: 5,
				auctionSupply: 100,
				auctionEndsAt: future,
				auctionSettled: true,
			})
		).toBe('ended');
	});

	it('returns ended when sold count reaches or exceeds supply', () => {
		expect(
			getAuctionPhaseStatus({
				auctionPrice: 5,
				auctionSupply: 50,
				auctionSold: 50,
			})
		).toBe('ended');
	});

	it('returns ended when auction closing timestamp has elapsed', () => {
		const past = new Date(Date.now() - 1000).toISOString();
		expect(
			getAuctionPhaseStatus({
				auctionPrice: 5,
				auctionEndsAt: past,
			})
		).toBe('ended');
	});
});

describe('computeMinimumNextBid & increments (#924, #1164)', () => {
	it('resolves fallback increment when unspecified', () => {
		expect(resolveAuctionMinIncrement(null)).toBe(
			DEFAULT_AUCTION_MIN_INCREMENT
		);
		expect(resolveAuctionMinIncrement(0.1)).toBe(0.1);
	});

	it('returns starting price when no bids have been placed', () => {
		expect(
			computeMinimumNextBid({
				highestBid: null,
				minIncrement: 0.25,
				startingPrice: 10,
			})
		).toBe(10);
	});

	it('returns highestBid + minIncrement when a bid exists', () => {
		expect(
			computeMinimumNextBid({
				highestBid: 12.5,
				minIncrement: 0.5,
				startingPrice: 10,
			})
		).toBe(13.0);
	});
});

describe('validateAuctionBid (#924, #1164)', () => {
	const ctx = {
		highestBid: 10,
		minIncrement: 1,
		startingPrice: 5,
	};
	// Minimum next bid is 11

	it('rejects empty input with Required code', () => {
		const res = validateAuctionBid('   ', ctx);
		expect(res.isValid).toBe(false);
		expect(res.errorCode).toBe('Required');
		expect(res.error).toBe('Enter a bid amount');
		expect(res.value).toBeNull();
	});

	it('rejects non-numeric or non-positive input with InvalidAmount code', () => {
		expect(validateAuctionBid('abc', ctx)).toEqual({
			isValid: false,
			errorCode: 'InvalidAmount',
			error: 'Enter a bid greater than 0',
			value: null,
		});
		expect(validateAuctionBid('-5', ctx)).toEqual({
			isValid: false,
			errorCode: 'InvalidAmount',
			error: 'Enter a bid greater than 0',
			value: null,
		});
		expect(validateAuctionBid('0', ctx)).toEqual({
			isValid: false,
			errorCode: 'InvalidAmount',
			error: 'Enter a bid greater than 0',
			value: null,
		});
	});

	it('rejects bid below minimum with BelowMinimum error code and formatted message', () => {
		const res = validateAuctionBid('10.5', ctx);
		expect(res.isValid).toBe(false);
		expect(res.errorCode).toBe('BelowMinimum');
		expect(res.error).toContain('BelowMinimum');
		expect(res.error).toContain('11 XLM');
		expect(res.value).toBeNull();
	});

	it('accepts valid bid equal to or higher than minimum', () => {
		const resEqual = validateAuctionBid('11', ctx);
		expect(resEqual.isValid).toBe(true);
		expect(resEqual.errorCode).toBeNull();
		expect(resEqual.error).toBeNull();
		expect(resEqual.value).toBe(11);

		const resHigher = validateAuctionBid('15.75', ctx);
		expect(resHigher.isValid).toBe(true);
		expect(resHigher.value).toBe(15.75);
	});
});

describe('Leaderboard and wallet helpers (#924, #1164)', () => {
	const sampleBids: AuctionBidEntry[] = [
		{
			id: 'b1',
			bidderAddress:
				'GA1111111111111111111111111111111111111111111111111111111111',
			amount: 10,
			placedAt: new Date(Date.now() - 3000).toISOString(),
		},
		{
			id: 'b2',
			bidderAddress:
				'GB2222222222222222222222222222222222222222222222222222222222',
			amount: 25,
			placedAt: new Date(Date.now() - 2000).toISOString(),
		},
		{
			id: 'b3',
			bidderAddress:
				'GA1111111111111111111111111111111111111111111111111111111111',
			amount: 20,
			placedAt: new Date(Date.now() - 1000).toISOString(),
		},
	];

	it('ranks bids in descending order by amount', () => {
		const ranked = rankAuctionBids(sampleBids);
		expect(ranked.map(b => b.amount)).toEqual([25, 20, 10]);
	});

	it('finds best bid for a given wallet address', () => {
		const best = findWalletBestBid(
			sampleBids,
			'ga1111111111111111111111111111111111111111111111111111111111'
		);
		expect(best?.id).toBe('b3');
		expect(best?.amount).toBe(20);
	});

	it('correctly determines whether a wallet is leading the auction', () => {
		expect(
			isWalletLeadingAuction(
				sampleBids,
				'GB2222222222222222222222222222222222222222222222222222222222'
			)
		).toBe(true);
		expect(
			isWalletLeadingAuction(
				sampleBids,
				'GA1111111111111111111111111111111111111111111111111111111111'
			)
		).toBe(false);
		expect(isWalletLeadingAuction(sampleBids, 'GCOTHER')).toBe(false);
	});

	it('resolves highest bid from history or fallback', () => {
		expect(resolveHighestBid(sampleBids, 15)).toBe(25);
		expect(resolveHighestBid([], 15)).toBe(15);
		expect(resolveHighestBid(null, null)).toBeNull();
	});

	it('shortens wallet addresses with ellipsis', () => {
		expect(
			shortenWalletAddress(
				'GB2222222222222222222222222222222222222222222222222222222222'
			)
		).toBe('GB2222…2222');
		expect(shortenWalletAddress('short')).toBe('short');
	});

	it('formats bid amounts cleanly in XLM', () => {
		expect(formatAuctionBidAmount(12.5)).toBe('12.5 XLM');
	});
});

describe('getAuctionCountdownState (#924, #1164)', () => {
	it('handles missing timestamp gracefully', () => {
		expect(getAuctionCountdownState(null)).toEqual({
			isEnded: false,
			label: null,
			remainingMs: 0,
		});
	});

	it('reports remaining time until end timestamp', () => {
		const now = Date.now();
		const end = new Date(now + 65_000).toISOString();
		const state = getAuctionCountdownState(end, now);
		expect(state.isEnded).toBe(false);
		expect(state.remainingMs).toBe(65_000);
		expect(state.label).toContain('1m');
	});

	it('reports isEnded true when timestamp has passed', () => {
		const now = Date.now();
		const end = new Date(now - 1_000).toISOString();
		const state = getAuctionCountdownState(end, now);
		expect(state.isEnded).toBe(true);
		expect(state.remainingMs).toBe(0);
	});
});
