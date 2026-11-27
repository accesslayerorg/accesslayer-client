import { describe, expect, it } from 'vitest';
import {
	calculateSlippageBounds,
	validateSlippageTolerance,
	getSlippageWarning,
	isHighSlippage,
	isLowSlippage,
	SLIPPAGE_PRESETS,
	DEFAULT_SLIPPAGE,
	type SwapQuote,
} from '../slippage.utils';

describe('calculateSlippageBounds', () => {
	describe('Buy path', () => {
		it('calculates maxSpent and minReceived for buy quote with expectedCost and expectedAmount', () => {
			const quote: SwapQuote = {
				side: 'buy',
				expectedCost: 1000,
				expectedAmount: 10,
			};
			// 100 bps = 1%
			const bounds = calculateSlippageBounds(quote, 100);

			// maxSpent = 1000 * (1 + 0.01) = 1010
			expect(bounds.maxSpent).toBe(1010);
			// minReceived = 10 * (1 - 0.01) = 9.9
			expect(bounds.minReceived).toBeCloseTo(9.9);
			expect(bounds.toleranceBps).toBe(100);
			expect(bounds.tolerancePercent).toBe(1);
			expect(bounds.maxPriceStroops).toBe(1010);
		});

		it('calculates bounds using preset 0.5% (50 bps) for buy', () => {
			const quote: SwapQuote = {
				side: 'buy',
				totalCost: 2000,
				amount: 20,
			};
			const bounds = calculateSlippageBounds(quote, 50);

			// maxSpent = 2000 * (1 + 0.005) = 2010
			expect(bounds.maxSpent).toBe(2010);
			// minReceived = 20 * (1 - 0.005) = 19.9
			expect(bounds.minReceived).toBeCloseTo(19.9);
		});

		it('calculates bounds using preset 3% (300 bps) for buy', () => {
			const quote: SwapQuote = {
				side: 'buy',
				expectedCost: 500,
				expectedOutput: 5,
			};
			const bounds = calculateSlippageBounds(quote, 300);

			// maxSpent = 500 * (1 + 0.03) = 515
			expect(bounds.maxSpent).toBe(515);
			// minReceived = 5 * (1 - 0.03) = 4.85
			expect(bounds.minReceived).toBeCloseTo(4.85);
		});

		it('calculates expectedSpent from price and amount if totalCost is omitted for buy', () => {
			const quote: SwapQuote = {
				side: 'buy',
				price: 50,
				amount: 4,
			};
			const bounds = calculateSlippageBounds(quote, 100);

			// expectedSpent = 50 * 4 = 200, maxSpent = 200 * 1.01 = 202
			expect(bounds.maxSpent).toBe(202);
			// expectedReceived = 4, minReceived = 4 * 0.99 = 3.96
			expect(bounds.minReceived).toBeCloseTo(3.96);
		});

		it('handles 0 bps tolerance (exact bounds for buy)', () => {
			const quote: SwapQuote = {
				side: 'buy',
				expectedCost: 1000,
				expectedAmount: 10,
			};
			const bounds = calculateSlippageBounds(quote, 0);

			expect(bounds.maxSpent).toBe(1000);
			expect(bounds.minReceived).toBe(10);
		});
	});

	describe('Sell path', () => {
		it('calculates minReceived for sell quote with expectedProceeds', () => {
			const quote: SwapQuote = {
				side: 'sell',
				expectedProceeds: 1000,
				amount: 10,
			};
			// 100 bps = 1%
			const bounds = calculateSlippageBounds(quote, 100);

			// minReceived = 1000 * (1 - 0.01) = 990
			expect(bounds.minReceived).toBe(990);
			// maxSpent is the token quantity sold = 10
			expect(bounds.maxSpent).toBe(10);
			expect(bounds.minPriceStroops).toBe(990);
		});

		it('calculates bounds using preset 0.5% (50 bps) for sell', () => {
			const quote: SwapQuote = {
				side: 'sell',
				totalProceeds: 2000,
				amount: 20,
			};
			const bounds = calculateSlippageBounds(quote, 50);

			// minReceived = 2000 * (1 - 0.005) = 1990
			expect(bounds.minReceived).toBe(1990);
			expect(bounds.maxSpent).toBe(20);
		});

		it('calculates bounds using preset 3% (300 bps) for sell', () => {
			const quote: SwapQuote = {
				side: 'sell',
				expectedProceeds: 500,
				amount: 5,
			};
			const bounds = calculateSlippageBounds(quote, 300);

			// minReceived = 500 * (1 - 0.03) = 485
			expect(bounds.minReceived).toBe(485);
			expect(bounds.maxSpent).toBe(5);
		});

		it('calculates expectedProceeds from price and amount for sell', () => {
			const quote: SwapQuote = {
				side: 'sell',
				expectedPrice: 25,
				amount: 8,
			};
			const bounds = calculateSlippageBounds(quote, 100);

			// expectedProceeds = 25 * 8 = 200, minReceived = 200 * 0.99 = 198
			expect(bounds.minReceived).toBe(198);
			expect(bounds.maxSpent).toBe(8);
		});

		it('handles 0 bps tolerance (exact bounds for sell)', () => {
			const quote: SwapQuote = {
				side: 'sell',
				expectedProceeds: 1000,
				amount: 10,
			};
			const bounds = calculateSlippageBounds(quote, 0);

			expect(bounds.minReceived).toBe(1000);
			expect(bounds.maxSpent).toBe(10);
		});
	});

	describe('Numeric input support', () => {
		it('computes bounds when quote is a raw number', () => {
			const bounds = calculateSlippageBounds(100, 100);
			expect(bounds.minReceived).toBe(99);
			expect(bounds.maxSpent).toBe(101);
		});
	});

	describe('Edge cases and error handling', () => {
		it('rejects negative bps with an error', () => {
			expect(() =>
				calculateSlippageBounds({ side: 'buy', amount: 10 }, -10)
			).toThrow(/non-negative finite number/i);
		});

		it('rejects NaN or non-finite bps with an error', () => {
			expect(() =>
				calculateSlippageBounds({ side: 'buy', amount: 10 }, NaN)
			).toThrow(/non-negative finite number/i);
		});

		it('rejects invalid quote objects', () => {
			expect(() =>
				calculateSlippageBounds(null as unknown as SwapQuote, 100)
			).toThrow(/invalid swap quote/i);
		});
	});

	describe('Presets and constants', () => {
		it('defines preset options 0.5%, 1%, 3%', () => {
			expect(SLIPPAGE_PRESETS).toEqual([0.5, 1, 3]);
		});

		it('defines default slippage as 1%', () => {
			expect(DEFAULT_SLIPPAGE).toBe(1);
		});
	});

	describe('validateSlippageTolerance', () => {
		it('accepts valid percentages between 0.01% and 50%', () => {
			expect(validateSlippageTolerance(0.01)).toBeNull();
			expect(validateSlippageTolerance(0.5)).toBeNull();
			expect(validateSlippageTolerance(1)).toBeNull();
			expect(validateSlippageTolerance(3)).toBeNull();
			expect(validateSlippageTolerance(50)).toBeNull();
		});

		it('rejects negative percentages', () => {
			expect(validateSlippageTolerance(-0.5)).toMatch(/cannot be negative/i);
		});

		it('rejects values below 0.01%', () => {
			expect(validateSlippageTolerance(0.005)).toMatch(/at least 0\.01%/i);
			expect(validateSlippageTolerance(0)).toMatch(/at least 0\.01%/i);
		});

		it('rejects values above 50%', () => {
			expect(validateSlippageTolerance(50.1)).toMatch(/cannot exceed 50%/i);
			expect(validateSlippageTolerance(100)).toMatch(/cannot exceed 50%/i);
		});

		it('rejects null, undefined, and NaN', () => {
			expect(validateSlippageTolerance(null)).toMatch(/valid/i);
			expect(validateSlippageTolerance(undefined)).toMatch(/valid/i);
			expect(validateSlippageTolerance(NaN)).toMatch(/valid/i);
		});
	});

	describe('Warnings: high and low slippage', () => {
		it('triggers high tolerance warning above 5%', () => {
			expect(isHighSlippage(5.1)).toBe(true);
			expect(isHighSlippage(5)).toBe(false);
			expect(getSlippageWarning(6)).toMatch(/high slippage/i);
		});

		it('triggers low tolerance warning below 0.1%', () => {
			expect(isLowSlippage(0.05)).toBe(true);
			expect(isLowSlippage(0.1)).toBe(false);
			expect(getSlippageWarning(0.05)).toMatch(/low slippage/i);
		});

		it('returns null warning for standard tolerance (0.1% - 5%)', () => {
			expect(getSlippageWarning(0.5)).toBeNull();
			expect(getSlippageWarning(1)).toBeNull();
			expect(getSlippageWarning(3)).toBeNull();
			expect(getSlippageWarning(5)).toBeNull();
		});
	});
});
