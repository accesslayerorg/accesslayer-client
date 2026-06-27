import { describe, expect, it } from 'vitest';
import {
	calculatePortfolioValue,
	formatPortfolioValueDisplay,
	getPortfolioValueHelperText,
} from '../portfolioValue.utils';

describe('calculatePortfolioValue', () => {
	it('sums each held key quantity against its current price', () => {
		const result = calculatePortfolioValue([
			{ creatorId: 'alex', quantity: 3, priceStroops: 500_000 },
			{ creatorId: 'sarah', quantity: 2, priceStroops: 1_200_000 },
		]);

		expect(result).toMatchObject({
			status: 'ready',
			totalStroops: 3_900_000,
			heldPositionCount: 2,
		});
		expect(formatPortfolioValueDisplay(result)).toBe('0.39 XLM');
		expect(getPortfolioValueHelperText(result)).toBe(
			'Across 2 held creator positions.'
		);
	});

	it('returns a zero total for zero holdings without requiring price data', () => {
		const result = calculatePortfolioValue([
			{ creatorId: 'alex', quantity: 0, priceStroops: null },
			{ creatorId: 'sarah', quantity: -1, priceStroops: 1_200_000 },
		]);

		expect(result).toMatchObject({
			status: 'ready',
			totalStroops: 0,
			heldPositionCount: 0,
		});
		expect(formatPortfolioValueDisplay(result)).toBe('0 XLM');
		expect(getPortfolioValueHelperText(result)).toBe(
			'No held creator keys yet.'
		);
	});

	it('shows loading instead of a partial total while prices refresh', () => {
		const result = calculatePortfolioValue([
			{ creatorId: 'alex', quantity: 3, priceStroops: 500_000 },
			{
				creatorId: 'sarah',
				quantity: 2,
				priceStroops: 1_200_000,
				isPriceLoading: true,
			},
		]);

		expect(result).toMatchObject({
			status: 'loading',
			totalStroops: null,
			heldPositionCount: 2,
		});
		expect(formatPortfolioValueDisplay(result)).toBe('Loading prices…');
	});

	it('marks totals unavailable when a held position is missing price data', () => {
		const result = calculatePortfolioValue([
			{ creatorId: 'alex', quantity: 3, priceStroops: 500_000 },
			{ creatorId: 'marcus', quantity: 1, priceStroops: null, price: null },
		]);

		expect(result).toMatchObject({
			status: 'unavailable',
			totalStroops: null,
			missingPriceCount: 1,
		});
		expect(formatPortfolioValueDisplay(result)).toBe('Unavailable');
		expect(getPortfolioValueHelperText(result)).toBe(
			'One or more held positions is missing current price data.'
		);
	});

	it('marks totals unavailable when a held position has stale price data', () => {
		const result = calculatePortfolioValue([
			{
				creatorId: 'alex',
				quantity: 3,
				priceStroops: 500_000,
				isPriceStale: true,
			},
		]);

		expect(result).toMatchObject({
			status: 'unavailable',
			totalStroops: null,
			stalePriceCount: 1,
		});
		expect(getPortfolioValueHelperText(result)).toBe(
			'One or more held positions has stale price data. Refresh prices to show the total.'
		);
	});
});
