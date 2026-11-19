import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api.service';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('axios', () => {
	const isAxiosError = (err: unknown): boolean =>
		err !== null &&
		typeof err === 'object' &&
		(err as Record<string, unknown>).isAxiosError === true;
	return {
		default: {
			create: vi.fn(() => ({
				get: mockGet,
				interceptors: {
					request: { use: vi.fn() },
					response: { use: vi.fn() },
				},
			})),
			isAxiosError,
		},
		isAxiosError,
	};
});

import {
	fetchLpPool,
	fetchLpPositions,
	normalizeLpPosition,
} from '../lpPositions.service';

const WALLET = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const KEY = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4';

const ok = <T>(data: T) => ({ data: { success: true, data, message: 'ok' } });

describe('lpPositionsService (#1030)', () => {
	beforeEach(() => mockGet.mockReset());

	it('fetches GET /lp/positions with the wallet query param', async () => {
		mockGet.mockResolvedValue(ok({ positions: [] }));
		await fetchLpPositions(WALLET);
		expect(mockGet).toHaveBeenCalledWith('/lp/positions', {
			params: { wallet: WALLET },
		});
	});

	it('normalises i128 string amounts to exact bigints', async () => {
		mockGet.mockResolvedValue(
			ok({
				positions: [
					{
						lpId: 7,
						keyId: KEY,
						keyName: 'Alpha Key',
						creatorId: 'alpha',
						contribution: '250000000',
						share: 2500,
						poolTotalLiquidity: '1000000000',
						pendingRewards: '12345',
						claimedRewards: '100',
						unlocksAt: '2030-01-01T00:00:00Z',
					},
				],
			})
		);

		const [position] = await fetchLpPositions(WALLET);
		expect(position).toEqual({
			lpId: '7',
			keyId: KEY,
			keyName: 'Alpha Key',
			creatorId: 'alpha',
			contributionStroops: 250_000_000n,
			shareBps: 2500,
			poolTotalLiquidityStroops: 1_000_000_000n,
			pendingRewardsStroops: 12_345n,
			claimedRewardsStroops: 100n,
			lock: {
				kind: 'until',
				unlocksAtMs: Date.parse('2030-01-01T00:00:00Z'),
			},
		});
	});

	it('accepts a bare array payload', async () => {
		mockGet.mockResolvedValue(
			ok([{ lpId: '1', keyId: KEY, contribution: '5' }])
		);
		const positions = await fetchLpPositions(WALLET);
		expect(positions).toHaveLength(1);
		expect(positions[0].keyName).toBe('CAAA…BSC4');
	});

	it('drops closed (zero contribution) and malformed positions', async () => {
		mockGet.mockResolvedValue(
			ok({
				positions: [
					{ lpId: '1', keyId: KEY, contribution: '0' },
					{ lpId: 'x', keyId: KEY, contribution: '10' },
					{ lpId: '3', contribution: '10' },
					{ lpId: '4', keyId: KEY, contribution: '1.5' },
					{ lpId: '5', keyId: KEY, contribution: '10' },
				],
			})
		);
		const positions = await fetchLpPositions(WALLET);
		expect(positions.map(p => p.lpId)).toEqual(['5']);
	});

	it('keeps a position whose rewards are unreadable, marking them unavailable', () => {
		const position = normalizeLpPosition({
			lpId: '1',
			keyId: KEY,
			contribution: '10',
			pendingRewards: 'n/a',
		});
		expect(position?.pendingRewardsStroops).toBeNull();
	});

	it('propagates API failures as ApiError', async () => {
		mockGet.mockRejectedValueOnce({
			isAxiosError: true,
			response: { status: 500, data: { success: false, message: 'boom' } },
			config: {},
			message: 'boom',
		});
		const err = await fetchLpPositions(WALLET).catch((e: unknown) => e);
		expect(err).toBeInstanceOf(ApiError);
		expect((err as ApiError).status).toBe(500);
	});

	it('fetches pool stats from GET /lp/pool/:keyId', async () => {
		mockGet.mockResolvedValue(
			ok({ keyId: KEY, totalLiquidity: '900', aprBps: 1250 })
		);
		await expect(fetchLpPool(KEY)).resolves.toEqual({
			keyId: KEY,
			totalLiquidityStroops: 900n,
			aprBps: 1250,
		});
		expect(mockGet).toHaveBeenCalledWith(`/lp/pool/${KEY}`);
	});

	it('reports a missing APR as unavailable rather than zero', async () => {
		mockGet.mockResolvedValue(ok({ keyId: KEY, totalLiquidity: '900' }));
		const pool = await fetchLpPool(KEY);
		expect(pool.aprBps).toBeNull();
	});
});
