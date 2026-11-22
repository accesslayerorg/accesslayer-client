import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGet, mockPost } = vi.hoisted(() => ({
	mockGet: vi.fn(),
	mockPost: vi.fn(),
}));

vi.mock('axios', () => ({
	default: {
		create: vi.fn(() => ({
			get: mockGet,
			post: mockPost,
			interceptors: {
				request: { use: vi.fn() },
				response: { use: vi.fn() },
			},
		})),
		isAxiosError: (error: unknown): boolean =>
			error !== null &&
			typeof error === 'object' &&
			(error as Record<string, unknown>).isAxiosError === true,
	},
}));

import {
	curveMigrationCacheKey,
	curveMigrationService,
} from '@/services/curveMigration.service';
import { cacheManager } from '@/utils/cache.utils';
import { ApiError } from '@/services/api.service';
import type { CurveMigration } from '@/types/curveMigration';

function fakeApiResponse<T>(data: T) {
	return { data: { success: true, data, message: 'ok' } };
}

function createMigration(overrides: Partial<CurveMigration> = {}): CurveMigration {
	return {
		id: 'migration-1',
		keyId: 'creator-1',
		title: 'Tighten the curve',
		status: 'pending',
		currentParams: { basePriceStroops: 10_000_000, growthFactor: 1.01, milestones: [] },
		proposedParams: { basePriceStroops: 20_000_000, growthFactor: 1.02, milestones: [] },
		timelockEndsAt: '2026-09-27T12:00:00.000Z',
		forVotes: 60,
		againstVotes: 20,
		quorumBps: 4000,
		totalCirculatingSupply: 100,
		totalVotingWeight: 80,
		...overrides,
	};
}

describe('curveMigrationService', () => {
	beforeEach(() => {
		mockGet.mockReset();
		mockPost.mockReset();
		cacheManager.invalidateAll();
	});

	it('requests migrations for a key and caches them', async () => {
		const migrations = [createMigration()];
		mockGet.mockResolvedValueOnce(fakeApiResponse(migrations));

		await expect(
			curveMigrationService.getMigrations('creator-1')
		).resolves.toEqual(migrations);
		expect(mockGet).toHaveBeenCalledWith('/curve-migrations', {
			params: { keyId: 'creator-1' },
		});

		// Second call is served from the cache rather than another request.
		await expect(
			curveMigrationService.getMigrations('creator-1')
		).resolves.toEqual(migrations);
		expect(mockGet).toHaveBeenCalledTimes(1);
	});

	it('refetches once the cache entry is invalidated', async () => {
		mockGet.mockResolvedValue(fakeApiResponse([createMigration()]));

		await curveMigrationService.getMigrations('creator-1');
		cacheManager.invalidate(curveMigrationCacheKey('creator-1'));
		await curveMigrationService.getMigrations('creator-1');

		expect(mockGet).toHaveBeenCalledTimes(2);
	});

	it('surfaces API errors as ApiError', async () => {
		mockGet.mockRejectedValueOnce(
			Object.assign(new Error('Not found'), {
				isAxiosError: true,
				response: { status: 404, data: { message: 'Key not found' } },
			})
		);

		const error = await curveMigrationService
			.getMigrations('missing')
			.catch((raw: unknown) => raw);

		expect(error).toBeInstanceOf(ApiError);
	});

	it('posts the execute call for a migration', async () => {
		mockPost.mockResolvedValueOnce(
			fakeApiResponse({ transactionHash: '0xdeadbeef' })
		);

		await expect(
			curveMigrationService.executeMigration('migration-1')
		).resolves.toEqual({ transactionHash: '0xdeadbeef' });
		expect(mockPost).toHaveBeenCalledWith(
			'/curve-migrations/migration-1/execute',
			{}
		);
	});

	it('surfaces execute failures as ApiError', async () => {
		mockPost.mockRejectedValueOnce(
			Object.assign(new Error('Server error'), {
				isAxiosError: true,
				response: { status: 500, data: { message: 'Execute failed' } },
			})
		);

		const error = await curveMigrationService
			.executeMigration('migration-1')
			.catch((raw: unknown) => raw);

		expect(error).toBeInstanceOf(ApiError);
	});
});
