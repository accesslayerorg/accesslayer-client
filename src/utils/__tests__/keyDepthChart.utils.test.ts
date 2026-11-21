import { describe, expect, it } from 'vitest';
import {
	buildDepthChartModel,
	formatDepthPrice,
	formatDepthPriceTick,
} from '../keyDepthChart.utils';
import type { KeyDepthSnapshot } from '@/services/keyDepth.service';

const SNAPSHOT: KeyDepthSnapshot = {
	bids: [
		{ price: 1.05, volume: 10 },
		{ price: 1.0, volume: 20 },
		{ price: 0.95, volume: 30 },
	],
	asks: [
		{ price: 1.15, volume: 5 },
		{ price: 1.2, volume: 15 },
	],
	midPrice: null,
	spread: null,
};

describe('buildDepthChartModel (#1220)', () => {
	it('returns an empty model for a missing snapshot', () => {
		const model = buildDepthChartModel(null);

		expect(model.points).toEqual([]);
		expect(model.bestBid).toBeNull();
		expect(model.bestAsk).toBeNull();
		expect(model.midPrice).toBeNull();
		expect(model.spread).toBeNull();
	});

	it('returns an empty model when the book has no levels', () => {
		const model = buildDepthChartModel({
			bids: [],
			asks: [],
			midPrice: null,
			spread: null,
		});

		expect(model.points).toEqual([]);
		expect(model.maxCumulativeVolume).toBe(0);
	});

	it('cumulates bid volume from the best bid downwards', () => {
		const model = buildDepthChartModel(SNAPSHOT);

		const bids = model.points.filter(point => point.side === 'bid');
		expect(bids.map(point => [point.price, point.bidVolume])).toEqual([
			[1.05, 10],
			[1.0, 30],
			[0.95, 60],
		]);
		expect(bids.every(point => point.askVolume === null)).toBe(true);
	});

	it('cumulates ask volume from the best ask upwards', () => {
		const model = buildDepthChartModel(SNAPSHOT);

		const asks = model.points.filter(point => point.side === 'ask');
		expect(asks.map(point => [point.price, point.askVolume])).toEqual([
			[1.15, 5],
			[1.2, 20],
		]);
		expect(asks.every(point => point.bidVolume === null)).toBe(true);
	});

	it('keeps the level volume next to the cumulative volume', () => {
		const model = buildDepthChartModel(SNAPSHOT);

		const bestBid = model.points.find(point => point.price === 1.05);
		expect(bestBid?.bidAmount).toBe(10);
		expect(bestBid?.bidVolume).toBe(10);

		const bestAsk = model.points.find(point => point.price === 1.15);
		expect(bestAsk?.askAmount).toBe(5);
		expect(bestAsk?.askVolume).toBe(5);
	});

	it('orders the plotted levels by ascending price', () => {
		const model = buildDepthChartModel(SNAPSHOT);
		const prices = model.points.map(point => point.price);

		expect(prices).toEqual([...prices].sort((a, b) => a - b));
		expect(prices).toEqual([0.95, 1.0, 1.05, 1.15, 1.2]);
	});

	it('resolves the best bid, best ask and mid price', () => {
		const model = buildDepthChartModel(SNAPSHOT);

		expect(model.bestBid).toBe(1.05);
		expect(model.bestAsk).toBe(1.15);
		expect(model.midPrice).toBe(1.1);
	});

	it('derives the spread from the best bid and ask', () => {
		const model = buildDepthChartModel(SNAPSHOT);

		expect(model.spread).toBeCloseTo(0.1, 10);
		expect(model.spreadPercent).toBeCloseTo((0.1 / 1.1) * 100, 10);
	});

	it('prefers the derived spread over a server-provided one', () => {
		const model = buildDepthChartModel({
			...SNAPSHOT,
			midPrice: 99,
			spread: 42,
		});

		expect(model.midPrice).toBe(1.1);
		expect(model.spread).toBeCloseTo(0.1, 10);
	});

	it('falls back to the server mid price when one side of the book is empty', () => {
		const model = buildDepthChartModel({
			bids: SNAPSHOT.bids,
			asks: [],
			midPrice: 1.07,
			spread: null,
		});

		expect(model.bestAsk).toBeNull();
		expect(model.midPrice).toBe(1.07);
		expect(model.spread).toBeNull();
	});

	it('totals the volume resting on each side', () => {
		const model = buildDepthChartModel(SNAPSHOT);

		expect(model.totalBidVolume).toBe(60);
		expect(model.totalAskVolume).toBe(20);
		expect(model.maxCumulativeVolume).toBe(60);
	});

	it('centres the domain on the mid price so the marker sits mid-chart', () => {
		const model = buildDepthChartModel(SNAPSHOT);
		const [min, max] = model.domain;

		expect((min + max) / 2).toBeCloseTo(model.midPrice ?? 0, 10);
		// The wider ladder gets the extra room.
		expect(min).toBeCloseTo(0.95, 10);
		expect(max).toBeCloseTo(1.25, 10);
	});

	it('keeps a usable domain for a single price level', () => {
		const model = buildDepthChartModel({
			bids: [{ price: 2, volume: 1 }],
			asks: [],
			midPrice: null,
			spread: null,
		});

		const [min, max] = model.domain;
		expect(max).toBeGreaterThan(min);
		expect((min + max) / 2).toBeCloseTo(2, 10);
	});

	it('ignores levels without volume or a usable price', () => {
		const model = buildDepthChartModel({
			bids: [
				{ price: 1.05, volume: 10 },
				{ price: 1.0, volume: 0 },
				{ price: 0, volume: 5 },
			],
			asks: [],
			midPrice: null,
			spread: null,
		});

		expect(model.points).toHaveLength(1);
		expect(model.points[0].price).toBe(1.05);
	});
});

describe('formatDepthPrice (#1220)', () => {
	it('formats prices with two decimals from one XLM up', () => {
		expect(formatDepthPrice(1.5)).toBe('1.50 XLM');
		expect(formatDepthPrice(12)).toBe('12.00 XLM');
	});

	it('keeps four decimals for sub-XLM prices', () => {
		expect(formatDepthPrice(0.1234)).toBe('0.1234 XLM');
	});

	it('falls back to a placeholder for missing prices', () => {
		expect(formatDepthPrice(null)).toBe('—');
		expect(formatDepthPrice(undefined)).toBe('—');
		expect(formatDepthPrice(Number.NaN)).toBe('—');
	});
});

describe('formatDepthPriceTick (#1220)', () => {
	it('omits the currency suffix', () => {
		expect(formatDepthPriceTick(1.5)).toBe('1.50');
		expect(formatDepthPriceTick(0.1234)).toBe('0.1234');
	});

	it('returns an empty string for missing prices', () => {
		expect(formatDepthPriceTick(null)).toBe('');
	});
});
