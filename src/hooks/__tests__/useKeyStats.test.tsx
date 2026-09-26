import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
	useKeyStats,
	KEY_STATS_REFRESH_INTERVAL_MS,
} from '@/hooks/useKeyStats';
import { courseService, type KeyStats } from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getKeyStats: vi.fn(),
	},
}));

const mockGetKeyStats = vi.mocked(courseService.getKeyStats);

const baseStats: KeyStats = {
	supply: 120,
	holderCount: 48,
	volume24h: 350_000_000,
	totalVolume: 9_870_000_000,
	twap1h: 21_000_000,
	twap24h: 19_500_000,
};

describe('useKeyStats', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		mockGetKeyStats.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
		queryClient.clear();
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('fetches stats for the key and configures a 30 second refresh', async () => {
		mockGetKeyStats.mockResolvedValue(baseStats);

		const { result } = renderHook(() => useKeyStats('key-1'), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual(baseStats);
		expect(mockGetKeyStats).toHaveBeenCalledWith('key-1');

		const query = queryClient
			.getQueryCache()
			.find({ queryKey: queryKeys.creators.stats('key-1') });
		expect(KEY_STATS_REFRESH_INTERVAL_MS).toBe(30_000);
		expect(query?.options.staleTime).toBe(30_000);
		expect(query?.options.refetchInterval).toBe(30_000);
	});

	it('refetches after 30 seconds and keeps previous data while refreshing', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		mockGetKeyStats.mockResolvedValueOnce(baseStats);

		const { result } = renderHook(() => useKeyStats('key-1'), { wrapper });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		const updated = { ...baseStats, holderCount: 49 };
		let resolveRefetch!: (value: KeyStats) => void;
		mockGetKeyStats.mockReturnValueOnce(
			new Promise<KeyStats>(resolve => {
				resolveRefetch = resolve;
			})
		);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(30_000);
		});

		expect(mockGetKeyStats).toHaveBeenCalledTimes(2);
		// Background refresh must not drop existing data (no skeleton flash).
		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toEqual(baseStats);

		await act(async () => {
			resolveRefetch(updated);
		});
		await waitFor(() => expect(result.current.data).toEqual(updated));
	});

	it('does not fetch when the key id is empty', () => {
		renderHook(() => useKeyStats(''), { wrapper });
		expect(mockGetKeyStats).not.toHaveBeenCalled();
	});

	it('surfaces errors', async () => {
		mockGetKeyStats.mockRejectedValue(new Error('Network error'));

		const { result } = renderHook(() => useKeyStats('key-1'), { wrapper });

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe('Network error');
	});
});
