/**
 * Warn-level log when an optimistic rollback cannot find its snapshot (#674).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useTradeMutation, type TradeVariables } from '../useWallet';
import { queryKeys } from '@/lib/queryKeys';

vi.mock('@/utils/toast.util', () => ({
	default: {
		message: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		transactionSuccess: vi.fn(),
	},
}));

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return {
		wrapper: function Wrapper({ children }: { children: React.ReactNode }) {
			return React.createElement(
				QueryClientProvider,
				{ client: queryClient },
				children
			);
		},
		queryClient,
	};
}

const address = 'GWALLET';

const BUY_VARIABLES: TradeVariables = {
	creatorId: 'creator-a',
	amount: 2,
	priceStroops: 500_000,
	price: 0.05,
};

const SELL_VARIABLES: TradeVariables = {
	creatorId: 'creator-b',
	amount: -2,
	priceStroops: 500_000,
	price: 0.05,
};

describe('useTradeMutation rollback snapshot-missing warning (#674)', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;
	const originalEnv = process.env.NODE_ENV;

	beforeEach(() => {
		process.env.NODE_ENV = 'development';
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
		process.env.NODE_ENV = originalEnv;
	});

	it('emits a warn log with all required fields when onMutate fails to capture a snapshot', async () => {
		const { wrapper, queryClient } = createWrapper();
		vi.spyOn(queryClient, 'cancelQueries').mockRejectedValueOnce(
			new Error('cancelQueries failed')
		);

		const { result } = renderHook(() => useTradeMutation(address), { wrapper });

		result.current.mutate(BUY_VARIABLES);

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(warnSpy).toHaveBeenCalledWith(
			'[optimistic-rollback]',
			expect.objectContaining({
				cache_key: JSON.stringify(queryKeys.wallet.holdings(address)),
				action: 'buy',
				creator_id: 'creator-a',
				reason: 'snapshot_missing',
				failed_at: expect.any(String),
			})
		);
	});

	it('identifies action as sell for a negative trade amount', async () => {
		const { wrapper, queryClient } = createWrapper();
		vi.spyOn(queryClient, 'cancelQueries').mockRejectedValueOnce(
			new Error('cancelQueries failed')
		);

		const { result } = renderHook(() => useTradeMutation(address), { wrapper });

		result.current.mutate(SELL_VARIABLES);

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(warnSpy).toHaveBeenCalledWith(
			'[optimistic-rollback]',
			expect.objectContaining({ action: 'sell', creator_id: 'creator-b' })
		);
	});

	it('includes failed_at as an ISO timestamp', async () => {
		const { wrapper, queryClient } = createWrapper();
		vi.spyOn(queryClient, 'cancelQueries').mockRejectedValueOnce(
			new Error('cancelQueries failed')
		);

		const { result } = renderHook(() => useTradeMutation(address), { wrapper });

		result.current.mutate(BUY_VARIABLES);

		await waitFor(() => expect(result.current.isError).toBe(true));

		const call = warnSpy.mock.calls.find(c => c[0] === '[optimistic-rollback]');
		const log = call?.[1] as Record<string, unknown>;
		expect(log.failed_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
	});

	it('does not warn when onMutate captures a snapshot normally', async () => {
		const { wrapper, queryClient } = createWrapper();
		queryClient.setQueryData(queryKeys.wallet.holdings(address), [
			{ creatorId: 'creator-a', quantity: 1, priceStroops: null, price: null, pending: false },
		]);

		const { result } = renderHook(() => useTradeMutation(address), { wrapper });

		result.current.mutate(BUY_VARIABLES);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('does not emit the warn log in test environment', async () => {
		process.env.NODE_ENV = 'test';
		warnSpy.mockClear();

		const { wrapper, queryClient } = createWrapper();
		vi.spyOn(queryClient, 'cancelQueries').mockRejectedValueOnce(
			new Error('cancelQueries failed')
		);

		const { result } = renderHook(() => useTradeMutation(address), { wrapper });

		result.current.mutate(BUY_VARIABLES);

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(warnSpy).not.toHaveBeenCalled();
	});
});
