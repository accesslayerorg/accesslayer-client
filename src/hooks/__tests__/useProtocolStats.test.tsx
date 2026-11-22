import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import {
	useProtocolStats,
	PROTOCOL_STATS_QUERY_KEY,
} from '@/hooks/useProtocolStats';
import {
	protocolService,
	type ProtocolStats,
} from '@/services/protocol.service';

vi.mock('@/services/protocol.service', () => ({
	protocolService: {
		getProtocolStats: vi.fn(),
	},
}));

const mockGetProtocolStats = vi.mocked(protocolService.getProtocolStats);

describe('useProtocolStats', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});
		mockGetProtocolStats.mockReset();
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('fetches protocol stats and configures staleTime and refetchInterval to 5 minutes', async () => {
		const mockStats: ProtocolStats = {
			totalVolume: 1250000,
			activeKeys: 450,
			totalHolders: 12400,
			trades24h: 3890,
			volumeChange24h: 12.5,
			tradesChange24h: -3.2,
		};

		mockGetProtocolStats.mockResolvedValue(mockStats);

		const { result } = renderHook(() => useProtocolStats(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual(mockStats);
		expect(mockGetProtocolStats).toHaveBeenCalledTimes(1);

		const query = queryClient
			.getQueryCache()
			.find({ queryKey: PROTOCOL_STATS_QUERY_KEY });
		expect(query?.options.staleTime).toBe(300_000);
		expect(query?.options.refetchInterval).toBe(300_000);
	});

	it('handles query errors cleanly', async () => {
		mockGetProtocolStats.mockRejectedValue(new Error('Network error'));

		const { result } = renderHook(() => useProtocolStats(), { wrapper });

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error?.message).toBe('Network error');
	});
});
