import { describe, expect, it } from 'vitest';
import {
	canCancelAuction,
	describeAuctionState,
	getAuctionStatus,
	validateAuctionInputs,
} from '@/utils/auctionConfig.utils';

describe('getAuctionStatus / describeAuctionState (#816)', () => {
	it('is "Not configured" with no price or supply', () => {
		expect(getAuctionStatus({})).toBe('not_configured');
		expect(describeAuctionState({})).toBe('Not configured');
		expect(describeAuctionState({ auctionPrice: 5 })).toBe('Not configured');
		expect(describeAuctionState({ auctionSupply: 100 })).toBe('Not configured');
	});

	it('is "Active (X of Y sold)" when configured and not sold out', () => {
		const config = { auctionPrice: 5, auctionSupply: 100, auctionSold: 40 };
		expect(getAuctionStatus(config)).toBe('active');
		expect(describeAuctionState(config)).toBe('Active (40 of 100 sold)');
	});

	it('is "Active (0 of Y sold)" right after configuration', () => {
		const config = { auctionPrice: 5, auctionSupply: 100, auctionSold: 0 };
		expect(describeAuctionState(config)).toBe('Active (0 of 100 sold)');
	});

	it('is "Completed" once sold reaches supply', () => {
		const config = { auctionPrice: 5, auctionSupply: 100, auctionSold: 100 };
		expect(getAuctionStatus(config)).toBe('completed');
		expect(describeAuctionState(config)).toBe('Completed');
	});
});

describe('canCancelAuction (#816)', () => {
	it('is false when not configured', () => {
		expect(canCancelAuction({})).toBe(false);
	});

	it('is true when configured and nothing sold', () => {
		expect(
			canCancelAuction({ auctionPrice: 5, auctionSupply: 100, auctionSold: 0 })
		).toBe(true);
	});

	it('is false once any key has sold', () => {
		expect(
			canCancelAuction({ auctionPrice: 5, auctionSupply: 100, auctionSold: 1 })
		).toBe(false);
	});
});

describe('validateAuctionInputs (#816)', () => {
	it('accepts a positive price and a positive whole supply', () => {
		const result = validateAuctionInputs('12.5', '250');
		expect(result.isValid).toBe(true);
		expect(result.priceError).toBeNull();
		expect(result.supplyError).toBeNull();
	});

	it('rejects an empty, zero, negative or non-numeric price', () => {
		expect(validateAuctionInputs('', '10').priceError).not.toBeNull();
		expect(validateAuctionInputs('0', '10').priceError).not.toBeNull();
		expect(validateAuctionInputs('-3', '10').priceError).not.toBeNull();
		expect(validateAuctionInputs('abc', '10').priceError).not.toBeNull();
	});

	it('rejects a fractional or non-positive supply', () => {
		expect(validateAuctionInputs('5', '10.5').supplyError).not.toBeNull();
		expect(validateAuctionInputs('5', '0').supplyError).not.toBeNull();
		expect(validateAuctionInputs('5', '').supplyError).not.toBeNull();
	});
});
