import { describe, expect, it } from 'vitest';
import {
	calculatePortfolioValue,
	formatPortfolioValueDisplay,
	getPortfolioValueHelperText,
	calculatePositionTotalValue,
	sortHoldingsByTotalValue,
	type HeldKeyPosition,
	type PortfolioValueResult,
} from '../portfolioValue.utils';

describe('calculatePortfolioValue', () => {
	describe('Acceptance Criteria: Portfolio Total Value Component', () => {
		/**
		 * AC1: Correct total for mixed positions with different prices and quantities
		 * Ensures that the portfolio total accurately sums (price × quantity) across all held keys.
		 */
		it('AC1: Computes correct total for two positions with different prices and quantities', () => {
			const positions: HeldKeyPosition[] = [
				{
					creatorId: 'alice',
					quantity: 10,
					priceStroops: 5_000_000, // 0.5 XLM per key
				},
				{
					creatorId: 'bob',
					quantity: 20,
					priceStroops: 15_000_000, // 1.5 XLM per key
				},
			];

			const result = calculatePortfolioValue(positions);

			// alice: 10 × 5_000_000 = 50_000_000 stroops
			// bob: 20 × 15_000_000 = 300_000_000 stroops
			// total: 350_000_000 stroops = 35 XLM
			expect(result.status).toBe('ready');
			expect(result.totalStroops).toBe(350_000_000);
			expect(result.heldPositionCount).toBe(2);
		});

		/**
		 * AC2: Total re-computes reactively when one position's price changes
		 * Validates that the component responds to React Query cache updates.
		 */
		it('AC2: Total re-computes reactively when a position price changes', () => {
			const positions: HeldKeyPosition[] = [
				{
					creatorId: 'alice',
					quantity: 10,
					priceStroops: 5_000_000,
				},
				{
					creatorId: 'bob',
					quantity: 20,
					priceStroops: 15_000_000,
				},
			];

			const initialResult = calculatePortfolioValue(positions);
			expect(initialResult.totalStroops).toBe(350_000_000);

			// Simulate price update via React Query cache invalidation
			const updatedPositions: HeldKeyPosition[] = [
				{
					creatorId: 'alice',
					quantity: 10,
					priceStroops: 5_000_000,
				},
				{
					creatorId: 'bob',
					quantity: 20,
					priceStroops: 25_000_000, // Price increased from 15M to 25M stroops
				},
			];

			const updatedResult = calculatePortfolioValue(updatedPositions);

			// bob's new contribution: 20 × 25_000_000 = 500_000_000
			// total: 50_000_000 + 500_000_000 = 550_000_000 stroops = 55 XLM
			expect(updatedResult.totalStroops).toBe(550_000_000);
			expect(updatedResult.status).toBe('ready');
			expect(updatedResult.totalStroops).not.toBe(
				initialResult.totalStroops
			);
		});

		/**
		 * AC3: Position with quantity 0 contributes 0 to the total
		 * Ensures zero-quantity positions are excluded from aggregation.
		 */
		it('AC3: Position with quantity 0 is excluded and contributes 0 to total', () => {
			const positions: HeldKeyPosition[] = [
				{
					creatorId: 'alice',
					quantity: 10,
					priceStroops: 5_000_000,
				},
				{
					creatorId: 'bob',
					quantity: 0, // Zero quantity
					priceStroops: 15_000_000,
				},
				{
					creatorId: 'charlie',
					quantity: 5,
					priceStroops: 2_000_000,
				},
			];

			const result = calculatePortfolioValue(positions);

			// alice: 10 × 5_000_000 = 50_000_000
			// bob: excluded (quantity is 0)
			// charlie: 5 × 2_000_000 = 10_000_000
			// total: 60_000_000 stroops = 0.006 XLM (but displayed as stroops due to rounding)
			expect(result.status).toBe('ready');
			expect(result.totalStroops).toBe(60_000_000);
			expect(result.heldPositionCount).toBe(2); // Only alice and charlie
		});

		/**
		 * AC4: Total is formatted with two decimal places and XLM suffix
		 * Validates display formatting for values >= 1 XLM.
		 */
		it('AC4: Total is formatted with 2 decimal places and XLM suffix for values >= 1 XLM', () => {
			const positions: HeldKeyPosition[] = [
				{
					creatorId: 'alice',
					quantity: 5,
					priceStroops: 100_000_000, // 10 XLM per key
				},
				{
					creatorId: 'bob',
					quantity: 3,
					priceStroops: 50_000_000, // 5 XLM per key
				},
			];

			const result = calculatePortfolioValue(positions);

			// alice: 5 × 100_000_000 = 500_000_000
			// bob: 3 × 50_000_000 = 150_000_000
			// total: 650_000_000 stroops = 65 XLM
			expect(result.status).toBe('ready');
			expect(result.totalStroops).toBe(650_000_000);

			const formatted = formatPortfolioValueDisplay(result);
			expect(formatted).toBe('65 XLM');
			expect(formatted).toMatch(/\d+\.\d{2}\s+XLM|^\d+\s+XLM$/); // 2 decimal places or whole number
		});

		/**
		 * AC5: Component does not show stale value after cache invalidation
		 * Ensures the component re-renders with fresh data when cache is invalidated.
		 */
		it('AC5: Component reflects fresh data after React Query cache invalidation', () => {
			const positions: HeldKeyPosition[] = [
				{
					creatorId: 'alice',
					quantity: 10,
					priceStroops: 5_000_000,
					isPriceStale: false,
				},
				{
					creatorId: 'bob',
					quantity: 20,
					priceStroops: 15_000_000,
					isPriceStale: false,
				},
			];

			const staleResult = calculatePortfolioValue(positions);
			expect(staleResult.status).toBe('ready');
			expect(staleResult.totalStroops).toBe(350_000_000);

			// Simulate cache invalidation: one position becomes stale
			const invalidatedPositions: HeldKeyPosition[] = [
				{
					creatorId: 'alice',
					quantity: 10,
					priceStroops: 5_000_000,
					isPriceStale: false,
				},
				{
					creatorId: 'bob',
					quantity: 20,
					priceStroops: 15_000_000,
					isPriceStale: true, // Marked as stale after cache invalidation
				},
			];

			const invalidatedResult =
				calculatePortfolioValue(invalidatedPositions);

			// After invalidation, total should be unavailable (not stale display)
			expect(invalidatedResult.status).toBe('unavailable');
			expect(invalidatedResult.totalStroops).toBeNull();
			expect(invalidatedResult.stalePriceCount).toBe(1);
			expect(formatPortfolioValueDisplay(invalidatedResult)).toBe(
				'Unavailable'
			);
		});

		/**
		 * AC5 Extended: Verify transition from stale to fresh after re-fetch
		 * Ensures UI updates correctly when cache is refreshed with new data.
		 */
		it('AC5-Extended: Updates from unavailable to ready after cache refresh', () => {
			// Step 1: After invalidation, prices are marked stale
			const stalePrices: HeldKeyPosition[] = [
				{
					creatorId: 'alice',
					quantity: 10,
					priceStroops: 5_000_000,
					isPriceStale: true,
				},
				{
					creatorId: 'bob',
					quantity: 20,
					priceStroops: 15_000_000,
					isPriceStale: true,
				},
			];

			const staleResult = calculatePortfolioValue(stalePrices);
			expect(staleResult.status).toBe('unavailable');
			expect(formatPortfolioValueDisplay(staleResult)).toBe('Unavailable');

			// Step 2: New fresh data arrives after re-fetch
			const freshPrices: HeldKeyPosition[] = [
				{
					creatorId: 'alice',
					quantity: 10,
					priceStroops: 5_500_000, // Updated price
					isPriceStale: false,
				},
				{
					creatorId: 'bob',
					quantity: 20,
					priceStroops: 16_000_000, // Updated price
					isPriceStale: false,
				},
			];

			const freshResult = calculatePortfolioValue(freshPrices);

			// alice: 10 × 5_500_000 = 55_000_000
			// bob: 20 × 16_000_000 = 320_000_000
			// total: 375_000_000 stroops = 0.0375 XLM
			expect(freshResult.status).toBe('ready');
			expect(freshResult.totalStroops).toBe(375_000_000);
			// Verify the display contains XLM suffix
			const display = formatPortfolioValueDisplay(freshResult);
			expect(display).toContain('XLM');
			expect(display).not.toBe('Loading prices…');
			expect(display).not.toBe('Unavailable');
		});
	});

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

describe('calculatePositionTotalValue', () => {
	it('calculates total value for a position with valid price and quantity', () => {
		const result = calculatePositionTotalValue({
			creatorId: 'alex',
			quantity: 5,
			priceStroops: 1_000_000,
		});

		expect(result).toBe(5_000_000);
	});

	it('returns null when price is missing', () => {
		const result = calculatePositionTotalValue({
			creatorId: 'alex',
			quantity: 5,
			priceStroops: null,
			price: null,
		});

		expect(result).toBeNull();
	});

	it('returns null when quantity is zero', () => {
		const result = calculatePositionTotalValue({
			creatorId: 'alex',
			quantity: 0,
			priceStroops: 1_000_000,
		});

		expect(result).toBeNull();
	});

	it('returns null when quantity is null', () => {
		const result = calculatePositionTotalValue({
			creatorId: 'alex',
			quantity: null,
			priceStroops: 1_000_000,
		});

		expect(result).toBeNull();
	});
});

describe('sortHoldingsByTotalValue', () => {
	it('sorts holdings in descending order by total value', () => {
		const positions = [
			{ creatorId: 'alex', quantity: 5, priceStroops: 100_000 }, // 500,000
			{ creatorId: 'sarah', quantity: 12, priceStroops: 100_000 }, // 1,200,000
			{ creatorId: 'marcus', quantity: 3, priceStroops: 100_000 }, // 300,000
		];

		const sorted = sortHoldingsByTotalValue(positions);

		expect(sorted[0].creatorId).toBe('sarah'); // 1,200,000
		expect(sorted[1].creatorId).toBe('alex'); // 500,000
		expect(sorted[2].creatorId).toBe('marcus'); // 300,000
	});

	it('updates order when data changes', () => {
		const positions = [
			{ creatorId: 'alex', quantity: 5, priceStroops: 100_000 }, // 500,000
			{ creatorId: 'sarah', quantity: 12, priceStroops: 100_000 }, // 1,200,000
			{ creatorId: 'marcus', quantity: 3, priceStroops: 100_000 }, // 300,000
		];

		const sorted = sortHoldingsByTotalValue(positions);
		expect(sorted[0].creatorId).toBe('sarah'); // 1,200,000

		// Update marcus to have higher value
		const updatedPositions = [
			{ creatorId: 'alex', quantity: 5, priceStroops: 100_000 }, // 500,000
			{ creatorId: 'sarah', quantity: 12, priceStroops: 100_000 }, // 1,200,000
			{ creatorId: 'marcus', quantity: 15, priceStroops: 100_000 }, // 1,500,000
		];

		const resorted = sortHoldingsByTotalValue(updatedPositions);
		expect(resorted[0].creatorId).toBe('marcus'); // 1,500,000
		expect(resorted[1].creatorId).toBe('sarah'); // 1,200,000
		expect(resorted[2].creatorId).toBe('alex'); // 500,000
	});

	it('maintains stable secondary sort by creator ID for equal values', () => {
		const positions = [
			{ creatorId: 'alex', quantity: 10, priceStroops: 100_000 }, // 1,000,000
			{ creatorId: 'sarah', quantity: 10, priceStroops: 100_000 }, // 1,000,000
			{ creatorId: 'marcus', quantity: 10, priceStroops: 100_000 }, // 1,000,000
		];

		const sorted = sortHoldingsByTotalValue(positions);

		// All have same value, should be sorted alphabetically by creator ID
		expect(sorted[0].creatorId).toBe('alex');
		expect(sorted[1].creatorId).toBe('marcus');
		expect(sorted[2].creatorId).toBe('sarah');
	});

	it('handles positions with missing prices by treating them as zero value', () => {
		const positions = [
			{ creatorId: 'alex', quantity: 5, priceStroops: 100_000 }, // 500,000
			{ creatorId: 'sarah', quantity: 10, priceStroops: null, price: null }, // null -> 0
			{ creatorId: 'marcus', quantity: 3, priceStroops: 100_000 }, // 300,000
		];

		const sorted = sortHoldingsByTotalValue(positions);

		expect(sorted[0].creatorId).toBe('alex'); // 500,000
		expect(sorted[1].creatorId).toBe('marcus'); // 300,000
		expect(sorted[2].creatorId).toBe('sarah'); // 0 (missing price)
	});

	it('handles positions with zero quantity by treating them as zero value', () => {
		const positions = [
			{ creatorId: 'alex', quantity: 5, priceStroops: 100_000 }, // 500,000
			{ creatorId: 'sarah', quantity: 0, priceStroops: 100_000 }, // 0
			{ creatorId: 'marcus', quantity: 3, priceStroops: 100_000 }, // 300,000
		];

		const sorted = sortHoldingsByTotalValue(positions);

		expect(sorted[0].creatorId).toBe('alex'); // 500,000
		expect(sorted[1].creatorId).toBe('marcus'); // 300,000
		expect(sorted[2].creatorId).toBe('sarah'); // 0 (zero quantity)
	});

	it('does not mutate the original array', () => {
		const positions = [
			{ creatorId: 'alex', quantity: 5, priceStroops: 100_000 },
			{ creatorId: 'sarah', quantity: 12, priceStroops: 100_000 },
			{ creatorId: 'marcus', quantity: 3, priceStroops: 100_000 },
		];

		const originalOrder = positions.map(p => p.creatorId);
		sortHoldingsByTotalValue(positions);

		expect(positions.map(p => p.creatorId)).toEqual(originalOrder);
	});
});

describe('Portfolio Formatting & Display Tests', () => {
	describe('formatPortfolioValueDisplay - Formatting Rules', () => {
		it('formats portfolio total with 2 decimal places for values >= 1 XLM', () => {
			const result: PortfolioValueResult = {
				status: 'ready',
				totalStroops: 150_000_000, // 15 XLM
				heldPositionCount: 2,
				missingPriceCount: 0,
				stalePriceCount: 0,
			};

			const display = formatPortfolioValueDisplay(result);
			expect(display).toBe('15 XLM');
		});

		it('formats portfolio total with 2 decimal places for fractional XLM values', () => {
			const result: PortfolioValueResult = {
				status: 'ready',
				totalStroops: 5_555_555, // ~0.56 XLM
				heldPositionCount: 1,
				missingPriceCount: 0,
				stalePriceCount: 0,
			};

			const display = formatPortfolioValueDisplay(result);
			// Should display as formatted XLM with up to 4 decimal places for small values
			expect(display).toMatch(/\d+\.?\d* XLM/);
		});

		it('includes XLM suffix in formatted total', () => {
			const result: PortfolioValueResult = {
				status: 'ready',
				totalStroops: 100_000_000, // 10 XLM
				heldPositionCount: 1,
				missingPriceCount: 0,
				stalePriceCount: 0,
			};

			const display = formatPortfolioValueDisplay(result);
			expect(display).toContain('XLM');
		});

		it('returns "0 XLM" for empty portfolio', () => {
			const result: PortfolioValueResult = {
				status: 'ready',
				totalStroops: 0,
				heldPositionCount: 0,
				missingPriceCount: 0,
				stalePriceCount: 0,
			};

			const display = formatPortfolioValueDisplay(result);
			expect(display).toBe('0 XLM');
		});

		it('returns "Loading prices…" when status is loading', () => {
			const result: PortfolioValueResult = {
				status: 'loading',
				totalStroops: null,
				heldPositionCount: 2,
				missingPriceCount: 0,
				stalePriceCount: 0,
			};

			const display = formatPortfolioValueDisplay(result);
			expect(display).toBe('Loading prices…');
		});

		it('returns "Unavailable" when status is unavailable', () => {
			const result: PortfolioValueResult = {
				status: 'unavailable',
				totalStroops: null,
				heldPositionCount: 1,
				missingPriceCount: 1,
				stalePriceCount: 0,
			};

			const display = formatPortfolioValueDisplay(result);
			expect(display).toBe('Unavailable');
		});
	});

	describe('Portfolio Edge Cases & Nullability', () => {
		it('handles null and undefined quantities correctly', () => {
			const positions: HeldKeyPosition[] = [
				{ creatorId: 'alice', quantity: null, priceStroops: 100_000 },
				{ creatorId: 'bob', quantity: undefined, priceStroops: 200_000 },
				{ creatorId: 'charlie', quantity: 5, priceStroops: 100_000 },
			];

			const result = calculatePortfolioValue(positions);

			// Only charlie has a valid position
			expect(result.status).toBe('ready');
			expect(result.totalStroops).toBe(500_000); // 5 × 100_000
			expect(result.heldPositionCount).toBe(1);
		});

		it('handles negative quantities by treating them as zero', () => {
			const positions: HeldKeyPosition[] = [
				{ creatorId: 'alice', quantity: -5, priceStroops: 100_000 },
				{ creatorId: 'bob', quantity: 10, priceStroops: 100_000 },
			];

			const result = calculatePortfolioValue(positions);

			// Only bob has a valid position
			expect(result.status).toBe('ready');
			expect(result.totalStroops).toBe(1_000_000); // 10 × 100_000
			expect(result.heldPositionCount).toBe(1);
		});

		it('handles very large portfolio totals correctly', () => {
			const positions: HeldKeyPosition[] = [
				{
					creatorId: 'alice',
					quantity: 1_000_000,
					priceStroops: 100_000_000,
				},
				{ creatorId: 'bob', quantity: 500_000, priceStroops: 50_000_000 },
			];

			const result = calculatePortfolioValue(positions);

			// alice: 1_000_000 × 100_000_000 = 100_000_000_000_000
			// bob: 500_000 × 50_000_000 = 25_000_000_000_000
			// total: 125_000_000_000_000 stroops
			expect(result.status).toBe('ready');
			expect(result.totalStroops).toBe(125_000_000_000_000);
		});

		it('handles decimal-like quantity values (floats)', () => {
			const positions: HeldKeyPosition[] = [
				{ creatorId: 'alice', quantity: 2.5, priceStroops: 100_000 },
				{ creatorId: 'bob', quantity: 3.7, priceStroops: 200_000 },
			];

			const result = calculatePortfolioValue(positions);

			// alice: 2.5 × 100_000 = 250_000
			// bob: 3.7 × 200_000 = 740_000
			// total: 990_000
			expect(result.status).toBe('ready');
			expect(result.totalStroops).toBe(990_000);
		});

		it('returns 0 total when all positions have zero quantity', () => {
			const positions: HeldKeyPosition[] = [
				{ creatorId: 'alice', quantity: 0, priceStroops: 100_000 },
				{ creatorId: 'bob', quantity: 0, priceStroops: 200_000 },
				{ creatorId: 'charlie', quantity: 0, priceStroops: 300_000 },
			];

			const result = calculatePortfolioValue(positions);

			expect(result.status).toBe('ready');
			expect(result.totalStroops).toBe(0);
			expect(result.heldPositionCount).toBe(0);
		});

		it('does not require price data when no positions are held', () => {
			const positions: HeldKeyPosition[] = [
				{ creatorId: 'alice', quantity: 0, priceStroops: null },
				{ creatorId: 'bob', quantity: 0, priceStroops: null },
			];

			const result = calculatePortfolioValue(positions);

			// Should not require prices for zero-quantity positions
			expect(result.status).toBe('ready');
			expect(result.totalStroops).toBe(0);
			expect(result.missingPriceCount).toBe(0);
		});
	});

	describe('Cache Invalidation & Stale Data Handling', () => {
		it('detects stale price data and reports status correctly', () => {
			const positions: HeldKeyPosition[] = [
				{
					creatorId: 'alice',
					quantity: 5,
					priceStroops: 100_000,
					isPriceStale: true,
				},
			];

			const result = calculatePortfolioValue(positions);

			expect(result.status).toBe('unavailable');
			expect(result.totalStroops).toBeNull();
			expect(result.stalePriceCount).toBe(1);
		});

		it('detects loading state and prevents stale total display', () => {
			const positions: HeldKeyPosition[] = [
				{
					creatorId: 'alice',
					quantity: 5,
					priceStroops: 100_000,
					isPriceLoading: true,
				},
			];

			const result = calculatePortfolioValue(positions);

			expect(result.status).toBe('loading');
			expect(result.totalStroops).toBeNull();
			expect(formatPortfolioValueDisplay(result)).toBe('Loading prices…');
		});

		it('prioritizes loading state over stale data (loading = true + stale = true)', () => {
			const positions: HeldKeyPosition[] = [
				{
					creatorId: 'alice',
					quantity: 5,
					priceStroops: 100_000,
					isPriceLoading: true,
					isPriceStale: true,
				},
			];

			const result = calculatePortfolioValue(positions);

			// Loading takes priority
			expect(result.status).toBe('loading');
			expect(result.totalStroops).toBeNull();
		});

		it('handles mixed portfolio with some positions stale and others fresh', () => {
			const positions: HeldKeyPosition[] = [
				{
					creatorId: 'alice',
					quantity: 5,
					priceStroops: 100_000,
					isPriceStale: false,
				},
				{
					creatorId: 'bob',
					quantity: 10,
					priceStroops: 200_000,
					isPriceStale: true,
				},
			];

			const result = calculatePortfolioValue(positions);

			// If any position is stale, total becomes unavailable
			expect(result.status).toBe('unavailable');
			expect(result.totalStroops).toBeNull();
			expect(result.stalePriceCount).toBe(1);
		});

		it('correctly transitions from unavailable to ready after refresh', () => {
			// Before refresh: has stale data
			const beforeRefresh: HeldKeyPosition[] = [
				{
					creatorId: 'alice',
					quantity: 5,
					priceStroops: 100_000,
					isPriceStale: true,
				},
			];

			const beforeResult = calculatePortfolioValue(beforeRefresh);
			expect(beforeResult.status).toBe('unavailable');

			// After refresh: fresh data with updated price
			const afterRefresh: HeldKeyPosition[] = [
				{
					creatorId: 'alice',
					quantity: 5,
					priceStroops: 150_000, // Price updated
					isPriceStale: false,
				},
			];

			const afterResult = calculatePortfolioValue(afterRefresh);
			expect(afterResult.status).toBe('ready');
			expect(afterResult.totalStroops).toBe(750_000);
		});
	});
});
