import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React, { type ReactNode } from 'react';
import { useTradeMutation, type TradeVariables } from '../useWallet';

vi.mock('@/utils/toast.util', () => ({
	default: {
		error: vi.fn(),
		transactionSuccess: vi.fn(),
	},
}));

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return {
		wrapper: ({ children }: { children: ReactNode }) =>
			React.createElement(
				QueryClientProvider,
				{ client: queryClient },
				children
			),
		queryClient,
	};
};

describe('useTradeMutation transaction failure logging', () => {
	let debugSpy: ReturnType<typeof vi.spyOn>;
	const originalEnv = process.env.NODE_ENV;

	beforeEach(() => {
		process.env.NODE_ENV = 'production';
		debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
	});

	afterEach(() => {
		debugSpy.mockRestore();
		process.env.NODE_ENV = originalEnv;
	});

	it('emits structured log on transaction failure with all required fields', async () => {
		const { wrapper, queryClient } = createWrapper();
		const address = 'GWALLET1234567890ABCDEFGHIJ';
		const { result } = renderHook(() => useTradeMutation(address), {
			wrapper,
		});

		const variables: TradeVariables = {
			creatorId: 'creator-123',
			amount: 5,
			priceStroops: 1_000_000,
			price: 0.1,
		};

		// Trigger mutation failure by throwing an error
		const error = new Error('Insufficient funds');
		vi.spyOn(queryClient, 'cancelQueries').mockRejectedValueOnce(error);

		result.current.mutate(variables);

		await waitFor(() => {
			expect(debugSpy).toHaveBeenCalledWith(
				'[transaction-failed]',
				expect.objectContaining({
					error_code: expect.any(String),
					creator_id: 'creator-123',
					action: 'buy',
					quantity: 5,
					wallet_address: expect.any(String),
					failed_at: expect.any(String),
				})
			);
		});
	});

	it('truncates wallet address to first 4 + last 4 characters', async () => {
		const { wrapper, queryClient } = createWrapper();
		const address = 'GWALLET1234567890ABCDEFGHIJ';
		const { result } = renderHook(() => useTradeMutation(address), {
			wrapper,
		});

		const variables: TradeVariables = {
			creatorId: 'creator-456',
			amount: 2,
			priceStroops: 500_000,
			price: 0.05,
		};

		const error = new Error('Network timeout');
		vi.spyOn(queryClient, 'cancelQueries').mockRejectedValueOnce(error);

		result.current.mutate(variables);

		await waitFor(() => {
			const calls = debugSpy.mock.calls;
			const failureLog = calls.find(
				call => call[0] === '[transaction-failed]'
			);
			expect(failureLog).toBeDefined();

			const logData = failureLog?.[1] as Record<string, unknown>;
			expect(logData.wallet_address).toBe('GWAL...GHIJ');
		});
	});

	it('correctly identifies action as sell for negative amount', async () => {
		const { wrapper, queryClient } = createWrapper();
		const { result } = renderHook(
			() => useTradeMutation('GWALLET1234567890ABCDEFGHIJ'),
			{ wrapper }
		);

		const variables: TradeVariables = {
			creatorId: 'creator-789',
			amount: -3,
			priceStroops: 1_500_000,
			price: 0.15,
		};

		const error = new Error('Wallet locked');
		vi.spyOn(queryClient, 'cancelQueries').mockRejectedValueOnce(error);

		result.current.mutate(variables);

		await waitFor(() => {
			const calls = debugSpy.mock.calls;
			const failureLog = calls.find(
				call => call[0] === '[transaction-failed]'
			);
			const logData = failureLog?.[1] as Record<string, unknown>;

			expect(logData.action).toBe('sell');
			expect(logData.quantity).toBe(3);
		});
	});

	it('captures error name or message as error_code', async () => {
		const { wrapper, queryClient } = createWrapper();
		const { result } = renderHook(
			() => useTradeMutation('GWALLET1234567890ABCDEFGHIJ'),
			{ wrapper }
		);

		const variables: TradeVariables = {
			creatorId: 'creator-999',
			amount: 1,
			priceStroops: 2_000_000,
			price: 0.2,
		};

		class CustomError extends Error {
			constructor(message: string) {
				super(message);
				this.name = 'SignatureRejected';
			}
		}

		const error = new CustomError('User declined signature');
		vi.spyOn(queryClient, 'cancelQueries').mockRejectedValueOnce(error);

		result.current.mutate(variables);

		await waitFor(() => {
			const calls = debugSpy.mock.calls;
			const failureLog = calls.find(
				call => call[0] === '[transaction-failed]'
			);
			const logData = failureLog?.[1] as Record<string, unknown>;

			expect(logData.error_code).toBe('SignatureRejected');
		});
	});

	it('does not emit log in test environment', async () => {
		process.env.NODE_ENV = 'test';
		debugSpy.mockClear();

		const { wrapper, queryClient } = createWrapper();
		const { result } = renderHook(
			() => useTradeMutation('GWALLET1234567890ABCDEFGHIJ'),
			{ wrapper }
		);

		const variables: TradeVariables = {
			creatorId: 'creator-test',
			amount: 1,
			priceStroops: 1_000_000,
			price: 0.1,
		};

		const error = new Error('Test error');
		vi.spyOn(queryClient, 'cancelQueries').mockRejectedValueOnce(error);

		result.current.mutate(variables);

		await waitFor(
			() => {
				const failureLogs = debugSpy.mock.calls.filter(
					call => call[0] === '[transaction-failed]'
				);
				expect(failureLogs).toHaveLength(0);
			},
			{ timeout: 2000 }
		);
	});

	it('includes failed_at timestamp in ISO format', async () => {
		const { wrapper, queryClient } = createWrapper();
		const { result } = renderHook(
			() => useTradeMutation('GWALLET1234567890ABCDEFGHIJ'),
			{ wrapper }
		);

		const variables: TradeVariables = {
			creatorId: 'creator-timestamp',
			amount: 1,
			priceStroops: 1_000_000,
			price: 0.1,
		};

		const error = new Error('Timestamp test');
		vi.spyOn(queryClient, 'cancelQueries').mockRejectedValueOnce(error);

		result.current.mutate(variables);

		await waitFor(() => {
			const calls = debugSpy.mock.calls;
			const failureLog = calls.find(
				call => call[0] === '[transaction-failed]'
			);
			const logData = failureLog?.[1] as Record<string, unknown>;

			expect(logData.failed_at).toMatch(
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
			);
		});
	});

	it('handles non-Error rejection reasons as string', async () => {
		const { wrapper, queryClient } = createWrapper();
		const { result } = renderHook(
			() => useTradeMutation('GWALLET1234567890ABCDEFGHIJ'),
			{ wrapper }
		);

		const variables: TradeVariables = {
			creatorId: 'creator-string-error',
			amount: 1,
			priceStroops: 1_000_000,
			price: 0.1,
		};

		vi.spyOn(queryClient, 'cancelQueries').mockRejectedValueOnce(
			'String error'
		);

		result.current.mutate(variables);

		await waitFor(() => {
			const calls = debugSpy.mock.calls;
			const failureLog = calls.find(
				call => call[0] === '[transaction-failed]'
			);
			const logData = failureLog?.[1] as Record<string, unknown>;

			expect(logData.error_code).toBe('String error');
		});
	});
});
