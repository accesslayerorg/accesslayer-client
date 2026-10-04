import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
	useKeyUniqueTraders,
	KEY_UNIQUE_TRADERS_REFRESH_INTERVAL_MS,
} from '@/hooks/useKeyUniqueTraders';
import {
	courseService,
	type KeyUniqueTraders,
} from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getKeyUniqueTraders: vi.fn(),
	},
}));

const mockGet = vi.mocked(courseService.getKeyUniqueTraders);

const base: KeyUniqueTraders = { uniqueTraders: 20, uniqueTraders24hAgo: 18 };

describe('useKeyUniqueTraders', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		mockGet.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
		queryClient.clear();
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('fetches the count for the key and refreshes every 5 minutes', async () => {
		mockGet.mockResolvedValue(base);

		const { result } = renderHook(() => useKeyUniqueTraders('key-1'), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual(base);
		expect(mockGet).toHaveBeenCalledWith('key-1');

		const query = queryClient
			.getQueryCache()
			.find({ queryKey: queryKeys.creators.uniqueTraders('key-1') });
		expect(KEY_UNIQUE_TRADERS_REFRESH_INTERVAL_MS).toBe(300_000);
		expect(query?.options.staleTime).toBe(300_000);
		expect(query?.options.refetchInterval).toBe(300_000);
	});

	it('refetches after 5 minutes and keeps previous data while refreshing', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		mockGet.mockResolvedValueOnce(base);

		const { result } = renderHook(() => useKeyUniqueTraders('key-1'), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		const updated = { ...base, uniqueTraders: 21 };
		let resolveRefetch!: (value: KeyUniqueTraders) => void;
		mockGet.mockReturnValueOnce(
			new Promise<KeyUniqueTraders>(resolve => {
				resolveRefetch = resolve;
			})
		);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(300_000);
		});

		expect(mockGet).toHaveBeenCalledTimes(2);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toEqual(base);

		await act(async () => {
			resolveRefetch(updated);
		});
		await waitFor(() => expect(result.current.data).toEqual(updated));
	});

	it('does not fetch when the key id is empty', () => {
		renderHook(() => useKeyUniqueTraders(''), { wrapper });
		expect(mockGet).not.toHaveBeenCalled();
	});
});
