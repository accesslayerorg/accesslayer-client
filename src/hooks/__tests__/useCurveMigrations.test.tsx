import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { useCurveMigrations } from '@/hooks/useCurveMigrations';
import { curveMigrationService } from '@/services/curveMigration.service';
import { queryKeys } from '@/lib/queryKeys';
import type { CurveMigration } from '@/types/curveMigration';

vi.mock('@/services/curveMigration.service', async importOriginal => {
	const original =
		await importOriginal<
			typeof import('@/services/curveMigration.service')
		>();
	return {
		...original,
		curveMigrationService: {
			...original.curveMigrationService,
			getMigrations: vi.fn(),
		},
	};
});

const mockGetMigrations = vi.mocked(curveMigrationService.getMigrations);

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

describe('useCurveMigrations', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		mockGetMigrations.mockReset();
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('fetches migrations for the key and partitions them', async () => {
		mockGetMigrations.mockResolvedValue([
			createMigration({ id: 'executed-1', status: 'executed', executedAt: '2026-01-01T00:00:00.000Z' }),
			createMigration({ id: 'pending-1' }),
			createMigration({ id: 'rejected-1', status: 'rejected' }),
		]);

		const { result } = renderHook(() => useCurveMigrations('creator-1'), {
			wrapper,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockGetMigrations).toHaveBeenCalledWith('creator-1');
		expect(result.current.pending.map(migration => migration.id)).toEqual([
			'pending-1',
		]);
		expect(result.current.executed.map(migration => migration.id)).toEqual([
			'executed-1',
		]);

		expect(
			queryClient
				.getQueryCache()
				.find({
					queryKey: queryKeys.creators.curveMigrations('creator-1'),
				})
		).toBeDefined();
	});

	it('does not fetch when the key id is empty or undefined', () => {
		const { result } = renderHook(() => useCurveMigrations(undefined), {
			wrapper,
		});

		expect(result.current.isFetching).toBe(false);
		expect(result.current.pending).toEqual([]);
		expect(result.current.executed).toEqual([]);
		expect(mockGetMigrations).not.toHaveBeenCalled();
	});

	it('exposes an error state without throwing when the query fails', async () => {
		mockGetMigrations.mockRejectedValue(new Error('network down'));

		const { result } = renderHook(() => useCurveMigrations('creator-1'), {
			wrapper,
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.pending).toEqual([]);
	});
});
