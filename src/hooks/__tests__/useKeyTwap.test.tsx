import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useKeyTwap } from '../useKeyTwap';
import { courseService } from '@/services/course.service';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getKeyTwap: vi.fn(),
	},
}));

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe('useKeyTwap (#931)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should query for 24h TWAP by default with 60s staleTime and 60s refetchInterval', async () => {
		vi.mocked(courseService.getKeyTwap).mockResolvedValueOnce({
			priceStroops: 12_500_000,
			window: '24h',
		});

		const { result } = renderHook(() => useKeyTwap('creator-1'), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(courseService.getKeyTwap).toHaveBeenCalledWith('creator-1', '24h');
		expect(result.current.data?.priceStroops).toBe(12_500_000);
	});

	it('should query for 1h TWAP when specified', async () => {
		vi.mocked(courseService.getKeyTwap).mockResolvedValueOnce({
			priceStroops: 13_000_000,
			window: '1h',
		});

		const { result } = renderHook(() => useKeyTwap('creator-1', '1h'), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(courseService.getKeyTwap).toHaveBeenCalledWith('creator-1', '1h');
		expect(result.current.data?.priceStroops).toBe(13_000_000);
	});

	it('should not query when keyId is empty', () => {
		renderHook(() => useKeyTwap(''), {
			wrapper: createWrapper(),
		});

		expect(courseService.getKeyTwap).not.toHaveBeenCalled();
	});
});
