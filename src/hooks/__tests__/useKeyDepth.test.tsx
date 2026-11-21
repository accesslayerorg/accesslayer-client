import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
	useKeyDepth,
	KEY_DEPTH_REFRESH_INTERVAL_MS,
} from '@/hooks/useKeyDepth';
import { fetchKeyDepth, type KeyDepthSnapshot } from '@/services/keyDepth.service';
import { queryKeys } from '@/lib/queryKeys';

vi.mock('@/services/keyDepth.service', () => ({
	fetchKeyDepth: vi.fn(),
	KEY_DEPTH_LEVELS: 20,
}));

const mockFetchKeyDepth = vi.mocked(fetchKeyDepth);

const baseSnapshot: KeyDepthSnapshot = {
	bids: [{ price: 1.05, volume: 10 }],
	asks: [{ price: 1.15, volume: 5 }],
	midPrice: null,
	spread: null,
};

describe('useKeyDepth (#1220)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		mockFetchKeyDepth.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
		queryClient.clear();
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('fetches the depth for the key and configures a 5 second refresh', async () => {
		mockFetchKeyDepth.mockResolvedValue(baseSnapshot);

		const { result } = renderHook(() => useKeyDepth('key-1'), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual(baseSnapshot);
		expect(mockFetchKeyDepth).toHaveBeenCalledWith('key-1', 20);

		const query = queryClient
			.getQueryCache()
			.find({ queryKey: queryKeys.creators.depth('key-1', 20) });
		expect(KEY_DEPTH_REFRESH_INTERVAL_MS).toBe(5_000);
		expect(query?.options.staleTime).toBe(5_000);
		expect(query?.options.refetchInterval).toBe(5_000);
	});

	it('refetches after 5 seconds and keeps previous data while refreshing', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		mockFetchKeyDepth.mockResolvedValueOnce(baseSnapshot);

		const { result } = renderHook(() => useKeyDepth('key-1'), { wrapper });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		const updated: KeyDepthSnapshot = {
			...baseSnapshot,
			bids: [{ price: 1.06, volume: 12 }],
		};
		let resolveRefetch!: (value: KeyDepthSnapshot) => void;
		mockFetchKeyDepth.mockReturnValueOnce(
			new Promise<KeyDepthSnapshot>(resolve => {
				resolveRefetch = resolve;
			})
		);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(5_000);
		});

		expect(mockFetchKeyDepth).toHaveBeenCalledTimes(2);
		// Background refresh must not drop existing data (no skeleton flash).
		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toEqual(baseSnapshot);

		await act(async () => {
			resolveRefetch(updated);
		});
		await waitFor(() => expect(result.current.data).toEqual(updated));
	});

	it('does not fetch when the key id is empty', () => {
		renderHook(() => useKeyDepth(''), { wrapper });
		expect(mockFetchKeyDepth).not.toHaveBeenCalled();
	});

	it('surfaces errors', async () => {
		mockFetchKeyDepth.mockRejectedValue(new Error('Network error'));

		const { result } = renderHook(() => useKeyDepth('key-1'), { wrapper });

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe('Network error');
	});
});
