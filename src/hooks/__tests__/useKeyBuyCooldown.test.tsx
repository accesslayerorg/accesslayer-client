import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useKeyBuyCooldown } from '@/hooks/useKeyBuyCooldown';
import { courseService } from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getKeyBuyCooldown: vi.fn(),
	},
}));

const mockGetKeyBuyCooldown = vi.mocked(courseService.getKeyBuyCooldown);

describe('useKeyBuyCooldown (#915)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		mockGetKeyBuyCooldown.mockReset();
	});

	afterEach(() => {
		queryClient.clear();
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('reads the cooldown expiry for the connected wallet and the key', async () => {
		const nextBuyAllowedAt = 1_700_000_272;
		mockGetKeyBuyCooldown.mockResolvedValue({
			keyId: 'key-1',
			wallet: 'wallet-1',
			nextBuyAllowedAt,
			cooldownLedgers: 12,
		});

		const { result } = renderHook(
			() => useKeyBuyCooldown('key-1', 'wallet-1'),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockGetKeyBuyCooldown).toHaveBeenCalledWith('key-1', 'wallet-1');
		expect(result.current.data?.nextBuyAllowedAt).toBe(nextBuyAllowedAt);

		const query = queryClient
			.getQueryCache()
			.find({ queryKey: queryKeys.creators.buyCooldown('key-1', 'wallet-1') });
		expect(query).toBeDefined();
		expect(query?.options.staleTime).toBe(15_000);
	});

	it('treats a null cooldown as a successful "no cooldown" answer', async () => {
		mockGetKeyBuyCooldown.mockResolvedValue(null);

		const { result } = renderHook(
			() => useKeyBuyCooldown('key-1', 'wallet-1'),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toBeNull();
		expect(result.current.isError).toBe(false);
	});

	it('does not fetch until a wallet is connected, then fetches on connect', async () => {
		mockGetKeyBuyCooldown.mockResolvedValue({ nextBuyAllowedAt: null });

		const { result, rerender } = renderHook(
			({ wallet }: { wallet: string | undefined }) =>
				useKeyBuyCooldown('key-1', wallet),
			{ wrapper, initialProps: { wallet: undefined as string | undefined } }
		);

		expect(result.current.fetchStatus).toBe('idle');
		expect(mockGetKeyBuyCooldown).not.toHaveBeenCalled();

		// Wallet connects while the key page is open.
		rerender({ wallet: 'wallet-1' });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(mockGetKeyBuyCooldown).toHaveBeenCalledWith('key-1', 'wallet-1');
	});

	it('reads again for a different wallet instead of reusing the previous cache entry', async () => {
		mockGetKeyBuyCooldown.mockResolvedValue({ nextBuyAllowedAt: 1_700_000_272 });

		const { result, rerender } = renderHook(
			({ wallet }: { wallet: string }) => useKeyBuyCooldown('key-1', wallet),
			{ wrapper, initialProps: { wallet: 'wallet-1' } }
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		rerender({ wallet: 'wallet-2' });

		await waitFor(() =>
			expect(mockGetKeyBuyCooldown).toHaveBeenCalledWith('key-1', 'wallet-2')
		);
		expect(
			queryClient
				.getQueryCache()
				.find({ queryKey: queryKeys.creators.buyCooldown('key-1', 'wallet-1') })
		).toBeDefined();
		expect(
			queryClient
				.getQueryCache()
				.find({ queryKey: queryKeys.creators.buyCooldown('key-1', 'wallet-2') })
		).toBeDefined();
	});

	it('does not fetch when the key id is empty', () => {
		renderHook(() => useKeyBuyCooldown('', 'wallet-1'), { wrapper });

		expect(mockGetKeyBuyCooldown).not.toHaveBeenCalled();
	});
});
