import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTradeCooldown } from '../useTradeCooldown';
import { courseService } from '@/services/course.service';

vi.mock('@/services/course.service', async importOriginal => {
	const original =
		await importOriginal<typeof import('@/services/course.service')>();
	return {
		...original,
		courseService: {
			...original.courseService,
			getTradeCooldownStatus: vi.fn(),
		},
	};
});

describe('useTradeCooldown', () => {
	let queryClient: QueryClient;
	const nowSec = 1700000000;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(nowSec * 1000);
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
	});

	afterEach(() => vi.useRealTimers());

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('ticks down and cleans up the interval', async () => {
		vi.mocked(courseService.getTradeCooldownStatus).mockResolvedValue({
			keyId: 'key-1',
			nextBuyAllowedAt: nowSec + 3,
			cooldownDurationSeconds: 3,
		});

		const { result, unmount } = renderHook(
			() => useTradeCooldown('key-1', 'wallet-1'),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.remainingSeconds).toBe(3));
		act(() => vi.advanceTimersByTime(1000));
		expect(result.current.remainingSeconds).toBe(2);
		act(() => vi.advanceTimersByTime(2000));
		expect(result.current.isCoolingDown).toBe(false);
		unmount();
	});

	it('returns no cooldown for a zero duration', async () => {
		vi.mocked(courseService.getTradeCooldownStatus).mockResolvedValue({
			keyId: 'key-1',
			nextBuyAllowedAt: nowSec + 60,
			cooldownDurationSeconds: 0,
		});

		const { result } = renderHook(
			() => useTradeCooldown('key-1', 'wallet-1'),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.isCoolingDown).toBe(false);
	});

	it('recalculates when the wallet changes', async () => {
		vi.mocked(courseService.getTradeCooldownStatus)
			.mockResolvedValueOnce({
				keyId: 'key-1',
				nextBuyAllowedAt: nowSec + 30,
				cooldownDurationSeconds: 30,
			})
			.mockResolvedValueOnce({
				keyId: 'key-1',
				nextBuyAllowedAt: null,
				cooldownDurationSeconds: 30,
			});

		const { result, rerender } = renderHook(
			({ wallet }) => useTradeCooldown('key-1', wallet),
			{ wrapper, initialProps: { wallet: 'wallet-1' } }
		);

		await waitFor(() => expect(result.current.remainingSeconds).toBe(30));
		rerender({ wallet: 'wallet-2' });
		await waitFor(() => expect(result.current.isCoolingDown).toBe(false));
	});
});
