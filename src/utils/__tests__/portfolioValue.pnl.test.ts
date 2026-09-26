import { describe, expect, it } from 'vitest';
import {
	calculatePnLSummary,
	calculatePositionPnL,
	formatPnLDisplay,
	formatPnLPercentage,
	getPnLTone,
	getPnLToneChipClassName,
	getPnLToneClassName,
	resolveAveragePurchasePriceStroops,
	resolveCurrentSellPriceStroops,
	type HeldKeyPosition,
} from '@/utils/portfolioValue.utils';

const STROOPS = 10_000_000;

const createPosition = (
	creatorId: string,
	quantity: number,
	priceStroops: number,
	overrides?: Partial<HeldKeyPosition>
): HeldKeyPosition => ({
	creatorId,
	quantity,
	priceStroops,
	price: priceStroops / STROOPS,
	...overrides,
});

describe('resolveCurrentSellPriceStroops', () => {
	it('uses the reported live curve price when the curve shape is unknown', () => {
		expect(
			resolveCurrentSellPriceStroops({
				priceStroops: 500_000,
				currentSupply: 120,
			})
		).toBe(500_000);
	});

	it('evaluates the bonding curve when curve parameters and supply are known', () => {
		// Linear curve: 1 XLM base growing 1% per key.
		// At supply 100 => 10_000_000 * (1 + 0.01 * 100) = 20_000_000 stroops.
		expect(
			resolveCurrentSellPriceStroops({
				currentSupply: 100,
				curveBasePriceStroops: STROOPS,
				curveGrowthFactor: 1.01,
			})
		).toBe(20_000_000);
	});

	it('tracks supply movement so the sell price follows the curve', () => {
		const curveFields = {
			curveBasePriceStroops: STROOPS,
			curveGrowthFactor: 1.01,
		};

		expect(
			resolveCurrentSellPriceStroops({ ...curveFields, currentSupply: 10 })
		).toBe(11_000_000);
		expect(
			resolveCurrentSellPriceStroops({ ...curveFields, currentSupply: 50 })
		).toBe(15_000_000);
	});

	it('ignores an unusable supply and falls back to the reported price', () => {
		expect(
			resolveCurrentSellPriceStroops({
				priceStroops: 700_000,
				currentSupply: -5,
				curveBasePriceStroops: STROOPS,
				curveGrowthFactor: 1.01,
			})
		).toBe(700_000);
	});

	it('accepts creatorShareSupply as an alias for currentSupply', () => {
		expect(
			resolveCurrentSellPriceStroops({
				priceStroops: 700_000,
				creatorShareSupply: 40,
				curveBasePriceStroops: STROOPS,
				curveGrowthFactor: 1.01,
			})
		).toBe(14_000_000);
	});

	it('returns null when no price can be resolved', () => {
		expect(resolveCurrentSellPriceStroops({ priceStroops: null })).toBeNull();
		expect(resolveCurrentSellPriceStroops({})).toBeNull();
	});
});

describe('resolveAveragePurchasePriceStroops', () => {
	it('prefers the server-provided cost basis', () => {
		const position = createPosition('creator1', 4, 1_000_000, {
			averagePurchasePriceStroops: 250_000,
		});

		expect(resolveAveragePurchasePriceStroops(position, 900_000)).toBe(
			250_000
		);
	});

	it('falls back to the locally tracked cost basis', () => {
		const position = createPosition('creator1', 4, 1_000_000);

		expect(resolveAveragePurchasePriceStroops(position, 900_000)).toBe(
			900_000
		);
	});

	it('seeds from the current sell price when no cost basis is known', () => {
		const position = createPosition('creator1', 4, 1_000_000);

		expect(resolveAveragePurchasePriceStroops(position, null)).toBe(
			1_000_000
		);
		expect(resolveAveragePurchasePriceStroops(position, 0)).toBe(1_000_000);
	});

	it('returns null when neither a cost basis nor a price exists', () => {
		expect(
			resolveAveragePurchasePriceStroops({ creatorId: 'c1', quantity: 2 })
		).toBeNull();
	});
});

describe('calculatePositionPnL', () => {
	it('computes unrealised P&L as current value less cost basis', () => {
		// 10 keys bought at 0.05 XLM, now worth 0.12 XLM each.
		const position = createPosition('creator1', 10, 1_200_000, {
			averagePurchasePriceStroops: 500_000,
		});

		const pnl = calculatePositionPnL(position);

		expect(pnl.status).toBe('ready');
		expect(pnl.costBasisStroops).toBe(5_000_000);
		expect(pnl.currentValueStroops).toBe(12_000_000);
		expect(pnl.unrealisedPnLStroops).toBe(7_000_000);
		expect(pnl.pnlPercentage).toBeCloseTo(140, 5);
	});

	it('reports a loss when the curve price falls below the average purchase price', () => {
		const position = createPosition('creator1', 3, 400_000, {
			averagePurchasePriceStroops: 1_000_000,
		});

		const pnl = calculatePositionPnL(position);

		expect(pnl.costBasisStroops).toBe(3_000_000);
		expect(pnl.currentValueStroops).toBe(1_200_000);
		expect(pnl.unrealisedPnLStroops).toBe(-1_800_000);
		expect(pnl.pnlPercentage).toBeCloseTo(-60, 5);
	});

	it('reports zero P&L at break-even', () => {
		const position = createPosition('creator1', 5, 800_000, {
			averagePurchasePriceStroops: 800_000,
		});

		const pnl = calculatePositionPnL(position);

		expect(pnl.unrealisedPnLStroops).toBe(0);
		expect(pnl.pnlPercentage).toBe(0);
	});

	it('withholds the P&L when the position has no cost basis', () => {
		const pnl = calculatePositionPnL(createPosition('creator1', 5, 800_000));

		expect(pnl.status).toBe('ready');
		expect(pnl.currentValueStroops).toBe(4_000_000);
		expect(pnl.costBasisStroops).toBeNull();
		expect(pnl.unrealisedPnLStroops).toBeNull();
		expect(pnl.pnlPercentage).toBeNull();
	});

	it('rejects a malformed cost basis rather than reporting negative invested', () => {
		const pnl = calculatePositionPnL(
			createPosition('creator1', 5, 800_000, {
				averagePurchasePriceStroops: Number.NaN,
			})
		);

		expect(pnl.averagePurchasePriceStroops).toBeNull();
		expect(pnl.unrealisedPnLStroops).toBeNull();
	});

	it('values the current amount on the bonding curve sell price', () => {
		const pnl = calculatePositionPnL(
			createPosition('creator1', 4, 500_000, {
				currentSupply: 100,
				curveBasePriceStroops: STROOPS,
				curveGrowthFactor: 1.01,
				averagePurchasePriceStroops: STROOPS,
			})
		);

		// Curve sell price at supply 100 is 2 XLM, so 4 keys are worth 8 XLM.
		expect(pnl.currentPriceStroops).toBe(20_000_000);
		expect(pnl.currentValueStroops).toBe(80_000_000);
		expect(pnl.costBasisStroops).toBe(40_000_000);
		expect(pnl.unrealisedPnLStroops).toBe(40_000_000);
		expect(pnl.pnlPercentage).toBeCloseTo(100, 5);
	});

	it('reports loading while the price is refreshing', () => {
		const pnl = calculatePositionPnL(
			createPosition('creator1', 5, 800_000, { isPriceLoading: true })
		);

		expect(pnl.status).toBe('loading');
		expect(pnl.unrealisedPnLStroops).toBeNull();
	});

	it('reports unavailable when the price is missing', () => {
		const pnl = calculatePositionPnL({
			creatorId: 'creator1',
			quantity: 5,
			priceStroops: null,
			price: null,
			averagePurchasePriceStroops: 100_000,
		});

		expect(pnl.status).toBe('unavailable');
		expect(pnl.unrealisedPnLStroops).toBeNull();
	});

	it('reports unavailable for an empty position', () => {
		const pnl = calculatePositionPnL(
			createPosition('creator1', 0, 800_000, {
				averagePurchasePriceStroops: 1,
			})
		);

		expect(pnl.status).toBe('unavailable');
		expect(pnl.quantity).toBe(0);
	});
});

describe('getPnLTone', () => {
	it('maps gains to positive, losses to negative and the rest to neutral', () => {
		expect(getPnLTone(1)).toBe('positive');
		expect(getPnLTone(-1)).toBe('negative');
		expect(getPnLTone(0)).toBe('neutral');
		expect(getPnLTone(null)).toBe('neutral');
		expect(getPnLTone(Number.NaN)).toBe('neutral');
	});

	it('exposes green for positive and red for negative values', () => {
		expect(getPnLToneClassName(5)).toContain('emerald');
		expect(getPnLToneClassName(-5)).toContain('red');
		expect(getPnLToneChipClassName(5)).toContain('emerald');
		expect(getPnLToneChipClassName(-5)).toContain('red');
	});
});

describe('calculatePnLSummary', () => {
	it('aggregates a gain across a single position', () => {
		const positions = [
			createPosition('creator1', 10, 1_000_000, {
				averagePurchasePriceStroops: 500_000,
			}),
		];

		const result = calculatePnLSummary(positions);

		expect(result.status).toBe('ready');
		expect(result.totalInvested).toBe(5_000_000);
		expect(result.currentValue).toBe(10_000_000);
		expect(result.unrealisedPnL).toBe(5_000_000);
		expect(result.pnlPercentage).toBeCloseTo(100, 5);
		expect(result.costBasisPositionCount).toBe(1);
		expect(result.heldPositionCount).toBe(1);
	});

	it('aggregates gains and losses from mixed positions into a single total', () => {
		const positions = [
			// +5 XLM
			createPosition('creator1', 10, 1_000_000, {
				averagePurchasePriceStroops: 500_000,
			}),
			// -1.8 XLM
			createPosition('creator2', 3, 400_000, {
				averagePurchasePriceStroops: 1_000_000,
			}),
		];

		const result = calculatePnLSummary(positions);

		expect(result.totalInvested).toBe(8_000_000);
		expect(result.currentValue).toBe(11_200_000);
		expect(result.unrealisedPnL).toBe(3_200_000);
		expect(result.pnlPercentage).toBeCloseTo(40, 5);
		expect(result.costBasisPositionCount).toBe(2);
	});

	it('computes correct PnL for empty holdings', () => {
		const result = calculatePnLSummary([]);

		expect(result.status).toBe('ready');
		expect(result.totalInvested).toBe(0);
		expect(result.currentValue).toBe(0);
		expect(result.unrealisedPnL).toBe(0);
		expect(result.pnlPercentage).toBe(0);
	});

	it('returns loading status when prices are loading', () => {
		const positions = [
			createPosition('creator1', 10, 1_000_000, { isPriceLoading: true }),
		];

		const result = calculatePnLSummary(positions);

		expect(result.status).toBe('loading');
		expect(result.heldPositionCount).toBe(1);
	});

	it('returns unavailable status when prices are missing', () => {
		const positions = [
			createPosition('creator1', 10, 0, { priceStroops: null, price: null }),
		];

		const result = calculatePnLSummary(positions);

		expect(result.status).toBe('unavailable');
	});

	it('filters out zero-quantity positions', () => {
		const positions = [
			createPosition('creator1', 0, 1_000_000, {
				averagePurchasePriceStroops: 1_000_000,
			}),
			createPosition('creator2', 5, 2_000_000, {
				averagePurchasePriceStroops: 1_000_000,
			}),
		];

		const result = calculatePnLSummary(positions);

		expect(result.status).toBe('ready');
		expect(result.heldPositionCount).toBe(1);
		expect(result.costBasisPositionCount).toBe(1);
		expect(result.currentValue).toBe(10_000_000);
	});

	it('sums multiple positions correctly', () => {
		const positions = [
			createPosition('creator1', 10, 1_000_000, {
				averagePurchasePriceStroops: 1_000_000,
			}),
			createPosition('creator2', 5, 2_000_000, {
				averagePurchasePriceStroops: 2_000_000,
			}),
		];

		const result = calculatePnLSummary(positions);

		expect(result.status).toBe('ready');
		expect(result.currentValue).toBe(20_000_000); // 2 XLM
		expect(result.totalInvested).toBe(20_000_000);
		expect(result.unrealisedPnL).toBe(0);
	});

	it('excludes positions without a cost basis from the P&L totals', () => {
		const positions = [
			createPosition('creator1', 10, 1_000_000, {
				averagePurchasePriceStroops: 500_000,
			}),
			createPosition('creator2', 4, 2_000_000),
		];

		const result = calculatePnLSummary(positions);

		expect(result.heldPositionCount).toBe(2);
		expect(result.costBasisPositionCount).toBe(1);
		expect(result.currentValue).toBe(10_000_000);
		expect(result.totalInvested).toBe(5_000_000);
		expect(result.unrealisedPnL).toBe(5_000_000);
	});

	it('reports zero totals when no position has a cost basis', () => {
		const result = calculatePnLSummary([
			createPosition('creator1', 10, 1_000_000),
		]);

		expect(result.status).toBe('ready');
		expect(result.totalInvested).toBe(0);
		expect(result.currentValue).toBe(0);
		expect(result.unrealisedPnL).toBe(0);
		expect(result.costBasisPositionCount).toBe(0);
	});
});

describe('formatPnLDisplay', () => {
	it('formats positive values with plus sign', () => {
		expect(formatPnLDisplay(50_000_000)).toBe('+5.00 XLM');
	});

	it('formats negative values with minus sign', () => {
		expect(formatPnLDisplay(-20_000_000)).toBe('-2.00 XLM');
	});

	it('formats zero without sign', () => {
		expect(formatPnLDisplay(0)).toBe('0.00 XLM');
	});
});

describe('formatPnLPercentage', () => {
	it('formats positive percentage with plus sign', () => {
		expect(formatPnLPercentage(50)).toBe('+50.0%');
	});

	it('formats negative percentage with minus sign', () => {
		expect(formatPnLPercentage(-20)).toBe('-20.0%');
	});

	it('formats zero percentage without sign', () => {
		expect(formatPnLPercentage(0)).toBe('0%');
	});
});
