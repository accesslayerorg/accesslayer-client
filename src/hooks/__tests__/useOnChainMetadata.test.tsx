import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useOnChainMetadata } from '@/hooks/useOnChainMetadata';
import { creatorKeysContractService } from '@/services/creatorKeysContract.service';

const VALID_ADDRESS = 'GBZXN7GNHWLEK3FMEEUFKMUSQJWKMPB6HLZKYXFPOAMZ7B6YAS4RXZQA';

describe('useOnChainMetadata (#1033)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		vi.restoreAllMocks();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('fetches on-chain metadata successfully', async () => {
		vi.spyOn(creatorKeysContractService, 'getMetadata').mockResolvedValueOnce({
			name: 'Test Creator',
			symbol: 'TEST',
			description: 'Test Description',
			image: 'QmHash',
		});

		const { result } = renderHook(() => useOnChainMetadata(VALID_ADDRESS), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual({
			name: 'Test Creator',
			symbol: 'TEST',
			description: 'Test Description',
			image: 'QmHash',
		});
	});

	it('handles on-chain metadata failure (fallback ready)', async () => {
		vi.spyOn(creatorKeysContractService, 'getMetadata').mockRejectedValueOnce(
			new Error('RPC connection failed')
		);

		const { result } = renderHook(() => useOnChainMetadata(VALID_ADDRESS), { wrapper });

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error).toBeInstanceOf(Error);
	});
});
