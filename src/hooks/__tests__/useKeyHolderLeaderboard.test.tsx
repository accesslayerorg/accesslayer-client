import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { useKeyHolderLeaderboard } from '../useKeyHolderLeaderboard';

const createWrapper = () => {
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
};

describe('useKeyHolderLeaderboard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches leaderboard entries for default volume metric', async () => {
		const { result } = renderHook(
			() => useKeyHolderLeaderboard('test-key', { metric: 'volume' }),
			{ wrapper: createWrapper() }
		);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.entries.length).toBeGreaterThanOrEqual(10);
		expect(result.current.entries[0].rank).toBe(1);
		expect(result.current.hasNextPage).toBe(true);
	});

	it('fetches next page when fetchNextPage is invoked', async () => {
		const { result } = renderHook(
			() =>
				useKeyHolderLeaderboard('test-key', {
					metric: 'volume',
					pageSize: 5,
				}),
			{ wrapper: createWrapper() }
		);

		await waitFor(() => {
			expect(result.current.entries.length).toBe(5);
		});

		await act(async () => {
			await result.current.fetchNextPage();
		});

		await waitFor(() => {
			expect(result.current.entries.length).toBe(10);
		});
	});

	it('identifies when connected user is in top 10', async () => {
		const topWallet =
			'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFIZGK63PZZVVJAB7';
		const { result } = renderHook(
			() =>
				useKeyHolderLeaderboard('test-key', {
					metric: 'volume',
					userWallet: topWallet,
				}),
			{ wrapper: createWrapper() }
		);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.isUserInTop10).toBe(true);
		expect(result.current.userRank).not.toBeNull();
		expect(result.current.userRank?.walletAddress).toBe(topWallet);
	});

	it('identifies when connected user is outside top 10', async () => {
		const outsideWallet = 'GUSEROUTSIDETOP10XXXXXXXXXXXXXXXXXXXX';
		const { result } = renderHook(
			() =>
				useKeyHolderLeaderboard('test-key', {
					metric: 'volume',
					userWallet: outsideWallet,
				}),
			{ wrapper: createWrapper() }
		);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.isUserInTop10).toBe(false);
		expect(result.current.userRank).not.toBeNull();
		expect(result.current.userRank?.rank).toBeGreaterThan(10);
	});
});
