import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWalletHoldings } from '@/services/wallet.service';
import { useWalletHoldings } from '../useWallet';

vi.mock('@/services/wallet.service', () => ({
	fetchWalletHoldings: vi.fn(),
}));

const mockFetchWalletHoldings = vi.mocked(fetchWalletHoldings);

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return function Wrapper({ children }: { children: React.ReactNode }) {
		return React.createElement(
			QueryClientProvider,
			{ client: queryClient },
			children
		);
	};
}

describe('useWalletHoldings', () => {
	beforeEach(() => {
		mockFetchWalletHoldings.mockReset();
	});

	it('fetches holdings for the supplied wallet address', async () => {
		const holdings = [
			{
				creatorId: 'creator-1',
				quantity: 4,
				priceStroops: 2_500_000,
				price: null,
			},
		];
		mockFetchWalletHoldings.mockResolvedValue(holdings);

		const { result } = renderHook(() => useWalletHoldings('wallet-1'), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockFetchWalletHoldings).toHaveBeenCalledTimes(1);
		expect(mockFetchWalletHoldings).toHaveBeenCalledWith('wallet-1');
		expect(result.current.data).toEqual(holdings);
	});

	it('does not fetch when no address is available', async () => {
		const { result } = renderHook(() => useWalletHoldings(''), {
			wrapper: createWrapper(),
		});

		expect(result.current.fetchStatus).toBe('idle');
		expect(mockFetchWalletHoldings).not.toHaveBeenCalled();
	});
});
