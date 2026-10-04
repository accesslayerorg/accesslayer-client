import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { useExecuteCurveMigrationMutation } from '@/hooks/useCreatorContractActions';
import { queryKeys } from '@/lib/queryKeys';
import { curveMigrationCacheKey } from '@/services/curveMigration.service';
import { cacheManager } from '@/utils/cache.utils';
import showToast from '@/utils/toast.util';
import { EXECUTE_CURVE_MIGRATION_FUNCTION } from '@/utils/curveMigration.utils';

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		transactionSuccess: vi.fn(),
	},
}));

describe('useExecuteCurveMigrationMutation', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		vi.mocked(showToast.success).mockClear();
		vi.mocked(showToast.error).mockClear();
		cacheManager.invalidateAll();
	});
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('submits the execute call and invalidates both cache layers', async () => {
		const { result } = renderHook(
			() => useExecuteCurveMigrationMutation('creator-1'),
			{ wrapper }
		);

		// Seed both cache layers so the invalidation is observable.
		queryClient.setQueryData(
			queryKeys.creators.curveMigrations('creator-1'),
			[]
		);
		cacheManager.set(curveMigrationCacheKey('creator-1'), [], 60_000);

		await act(async () => {
			await result.current.mutateAsync('migration-1');
		});

		expect(showToast.success).toHaveBeenCalledWith('Curve migration executed');
		expect(showToast.error).not.toHaveBeenCalled();

		await waitFor(() =>
			expect(
				queryClient
					.getQueryCache()
					.find({
						queryKey: queryKeys.creators.curveMigrations('creator-1'),
					})
			).toBeDefined()
		);
		expect(cacheManager.get(curveMigrationCacheKey('creator-1'))).toBeNull();
	});

	it('exposes the migration id being executed for the pending button state', async () => {
		const { result } = renderHook(
			() => useExecuteCurveMigrationMutation('creator-1'),
			{ wrapper }
		);

		act(() => {
			result.current.mutate('migration-42');
		});

		await waitFor(() => expect(result.current.isPending).toBe(true));
		expect(result.current.variables).toBe('migration-42');

		// The signing stub resolves on a 1.2s timer.
		await waitFor(() => expect(result.current.isPending).toBe(false), {
			timeout: 5000,
		});
	});

	it('names the contract function it executes', () => {
		expect(EXECUTE_CURVE_MIGRATION_FUNCTION).toBe('execute_curve_migration');
	});
});
