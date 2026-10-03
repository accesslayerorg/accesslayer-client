import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
	useTradeCooldownStatus,
	invalidateTradeCooldownStatus,
	resolveActiveTradeCooldown,
} from '../useTradeCooldownStatus';
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

const mockGetTradeCooldownStatus = vi.mocked(
	courseService.getTradeCooldownStatus
);

describe('useTradeCooldownStatus (#998)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		mockGetTradeCooldownStatus.mockReset();
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('fetches the cooldown status on mount', async () => {
		mockGetTradeCooldownStatus.mockResolvedValue({
			keyId: 'creator-1',
			nextBuyAllowedAt: Math.floor(Date.now() / 1000) + 60,
			cooldownDurationSeconds: 300,
		});

		const { result } = renderHook(
			() => useTradeCooldownStatus('creator-1'),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockGetTradeCooldownStatus).toHaveBeenCalledWith('creator-1');
		expect(result.current.data?.nextBuyAllowedAt).toBeDefined();
	});

	it('is disabled for an empty key id', () => {
		renderHook(() => useTradeCooldownStatus(''), { wrapper });

		expect(mockGetTradeCooldownStatus).not.toHaveBeenCalled();
	});

	it('treats a 404 (no cooldown endpoint) as null rather than an error', async () => {
		mockGetTradeCooldownStatus.mockResolvedValue(null);

		const { result } = renderHook(
			() => useTradeCooldownStatus('creator-1'),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toBeNull();
	});

	it('invalidateTradeCooldownStatus drops the cache so the status refetches', async () => {
		mockGetTradeCooldownStatus.mockResolvedValue({
			keyId: 'creator-1',
			nextBuyAllowedAt: null,
		});

		const { result } = renderHook(
			() => useTradeCooldownStatus('creator-1'),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(mockGetTradeCooldownStatus).toHaveBeenCalledTimes(1);

		act(() => {
			invalidateTradeCooldownStatus(queryClient, 'creator-1');
		});

		await waitFor(() =>
			expect(mockGetTradeCooldownStatus).toHaveBeenCalledTimes(2)
		);
	}, 10_000);

	describe('resolveActiveTradeCooldown', () => {
		const nowSec = Math.floor(Date.now() / 1000);

		it('returns the active cooldown from the status', () => {
			// As returned by the hook: TradeCooldownInfo normalised with the
			// queried key id as creatorId.
			const status = {
				creatorId: 'creator-1',
				keyId: 'creator-1',
				nextBuyAllowedAt: nowSec + 30,
				cooldownDurationSeconds: 120,
			};

			expect(resolveActiveTradeCooldown(status)).toEqual({
				creatorId: 'creator-1',
				nextBuyAllowedAt: nowSec + 30,
				cooldownDurationSeconds: 120,
			});
		});

		it('returns null when the status reports no cooldown', () => {
			expect(
				resolveActiveTradeCooldown({
					keyId: 'creator-1',
					nextBuyAllowedAt: null,
				})
			).toBeNull();
			expect(resolveActiveTradeCooldown(null)).toBeNull();
			expect(resolveActiveTradeCooldown(undefined)).toBeNull();
		});

		it('falls back to a position-level nextBuyAllowedAt when the status is empty', () => {
			const cooldown = resolveActiveTradeCooldown(
				null,
				nowSec + 45
			);

			expect(cooldown).not.toBeNull();
			expect(cooldown?.nextBuyAllowedAt).toBe(nowSec + 45);
		});

		it('ignores expired fallback timestamps', () => {
			expect(resolveActiveTradeCooldown(null, nowSec - 5)).toBeNull();
		});
	});
});
