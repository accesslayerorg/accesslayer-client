import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../api.service';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('axios', () => ({
	default: {
		create: vi.fn(() => ({
			get: mockGet,
			post: vi.fn(),
			interceptors: {
				request: { use: vi.fn() },
				response: { use: vi.fn() },
			},
		})),
		isAxiosError: (err: unknown): boolean =>
			err !== null &&
			typeof err === 'object' &&
			(err as Record<string, unknown>).isAxiosError === true,
	},
}));

import { keyDepthService, normalizeKeyDepth } from '../keyDepth.service';

describe('keyDepthService (#1220)', () => {
	beforeEach(() => {
		mockGet.mockReset();
	});

	it('requests 20 levels from the depth endpoint', async () => {
		mockGet.mockResolvedValueOnce({
			data: { success: true, data: { bids: [], asks: [] } },
		});

		await keyDepthService.getKeyDepth('key-1');

		expect(mockGet).toHaveBeenCalledWith('/keys/key-1/depth', {
			params: { levels: 20 },
		});
	});

	it('honours an explicit level count', async () => {
		mockGet.mockResolvedValueOnce({
			data: { success: true, data: { bids: [], asks: [] } },
		});

		await keyDepthService.getKeyDepth('key-1', 50);

		expect(mockGet).toHaveBeenCalledWith('/keys/key-1/depth', {
			params: { levels: 50 },
		});
	});

	it('sorts the ladders with the best price first', async () => {
		mockGet.mockResolvedValueOnce({
			data: {
				success: true,
				data: {
					bids: [
						{ price: 0.9, volume: 5 },
						{ price: 1.1, volume: 7 },
					],
					asks: [
						{ price: 1.4, volume: 3 },
						{ price: 1.2, volume: 6 },
					],
				},
			},
		});

		const snapshot = await keyDepthService.getKeyDepth('key-1');

		expect(snapshot.bids.map(level => level.price)).toEqual([1.1, 0.9]);
		expect(snapshot.asks.map(level => level.price)).toEqual([1.2, 1.4]);
	});

	it('handles server errors and wraps them in ApiError', async () => {
		mockGet.mockRejectedValueOnce({
			isAxiosError: true,
			response: { status: 500, data: { success: false, message: 'Server error' } },
			message: 'Server error',
		});

		await expect(keyDepthService.getKeyDepth('key-1')).rejects.toThrow(ApiError);
	});
});

describe('normalizeKeyDepth (#1220)', () => {
	it('reads the ladders from a plain payload', () => {
		const snapshot = normalizeKeyDepth({
			bids: [{ price: 1.05, amount: 10 }],
			asks: [{ price: 1.15, amount: 4 }],
		});

		expect(snapshot.bids).toEqual([{ price: 1.05, volume: 10 }]);
		expect(snapshot.asks).toEqual([{ price: 1.15, volume: 4 }]);
	});

	it('reads a price-keyed ladder', () => {
		const snapshot = normalizeKeyDepth({
			bids: { '1.05': 10, '1': 20 },
			asks: {},
		});

		expect(snapshot.bids).toEqual([
			{ price: 1.05, volume: 10 },
			{ price: 1, volume: 20 },
		]);
	});

	it('converts stroop-denominated prices to XLM', () => {
		const snapshot = normalizeKeyDepth({
			bids: [{ priceStroops: 10_500_000, volume: 3 }],
			asks: [],
		});

		expect(snapshot.bids[0].price).toBeCloseTo(1.05, 10);
	});

	it('reads a payload nested under depth', () => {
		const snapshot = normalizeKeyDepth({
			depth: {
				bids: [{ price: 1.05, volume: 2 }],
				asks: [{ price: 1.1, volume: 1 }],
			},
		});

		expect(snapshot.bids).toHaveLength(1);
		expect(snapshot.asks).toHaveLength(1);
	});

	it('drops levels without a usable price', () => {
		const snapshot = normalizeKeyDepth({
			bids: [
				{ price: 0, volume: 5 },
				{ price: 1.05, volume: 2 },
			],
			asks: [],
		});

		expect(snapshot.bids).toHaveLength(1);
	});

	it('keeps the server-reported mid price and spread', () => {
		const snapshot = normalizeKeyDepth({
			bids: [],
			asks: [],
			midPrice: 1.02,
			spread: 0.04,
		});

		expect(snapshot.midPrice).toBe(1.02);
		expect(snapshot.spread).toBe(0.04);
	});

	it('returns empty ladders for an unexpected payload', () => {
		const snapshot = normalizeKeyDepth(null);

		expect(snapshot.bids).toEqual([]);
		expect(snapshot.asks).toEqual([]);
		expect(snapshot.midPrice).toBeNull();
	});
});
