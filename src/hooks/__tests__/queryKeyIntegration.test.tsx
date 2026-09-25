import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { queryKeys } from '@/lib/queryKeys';
import { useCreatorList, useCreatorDetail } from '../useCreators';
import { useWalletHoldings, useWalletActivity } from '../useWallet';

describe('queryKeyIntegration', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('useCreatorList uses the correct query key constant', () => {
		const params = { page: 1 };
		renderHook(() => useCreatorList(params), { wrapper });

		const cache = queryClient.getQueryCache().getAll();
		expect(cache).toHaveLength(1);
		expect(cache[0].queryKey).toEqual(queryKeys.creators.list(params));
	});

	it('useCreatorDetail uses the correct query key constant', () => {
		renderHook(() => useCreatorDetail('creator-1'), { wrapper });

		const cache = queryClient.getQueryCache().getAll();
		expect(cache).toHaveLength(1);
		expect(cache[0].queryKey).toEqual(queryKeys.creators.detail('creator-1'));
	});

	it('useWalletHoldings uses the correct query key constant', () => {
		renderHook(() => useWalletHoldings('0x123'), { wrapper });

		const cache = queryClient.getQueryCache().getAll();
		expect(cache).toHaveLength(1);
		expect(cache[0].queryKey).toEqual(queryKeys.wallet.holdings('0x123'));
	});

	it('useWalletActivity uses the correct query key constant', () => {
		renderHook(() => useWalletActivity('0x123'), { wrapper });

		const cache = queryClient.getQueryCache().getAll();
		expect(cache).toHaveLength(1);
		expect(cache[0].queryKey).toEqual(queryKeys.wallet.activity('0x123'));
	});
});
