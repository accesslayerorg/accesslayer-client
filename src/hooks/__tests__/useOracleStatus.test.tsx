import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOracleStatus } from '../useOracleStatus';
import { oracleService } from '@/services/oracle.service';

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe('useOracleStatus', () => {
	beforeEach(() => {
		oracleService.reset();
	});

	it('returns healthy status for fresh primary feed', async () => {
		oracleService.setMockStatus('XLM', {
			status: 'healthy',
			source: 'primary',
			updatedAt: Date.now() - 10_000,
		});

		const { result } = renderHook(() => useOracleStatus('XLM'), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.status).toBe('healthy');
		expect(result.current.isHealthy).toBe(true);
		expect(result.current.isFallback).toBe(false);
		expect(result.current.isStale).toBe(false);
	});

	it('returns fallback status when contract reports fallback source', async () => {
		oracleService.setMockStatus('XLM', {
			status: 'fallback',
			source: 'fallback',
			updatedAt: Date.now() - 10_000,
		});

		const { result } = renderHook(() => useOracleStatus('XLM'), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.status).toBe('fallback');
		expect(result.current.isFallback).toBe(true);
		expect(result.current.isStale).toBe(false);
	});

	it('returns stale status when contract price is outdated', async () => {
		oracleService.setMockStatus('XLM', {
			status: 'stale',
			updatedAt: Date.now() - 600_000,
		});

		const { result } = renderHook(() => useOracleStatus('XLM'), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.status).toBe('stale');
		expect(result.current.isStale).toBe(true);
		expect(result.current.staleReason).toContain('stale');
	});

	it('updates relative time dynamically', async () => {
		vi.useFakeTimers();

		oracleService.setMockStatus('XLM', {
			status: 'healthy',
			updatedAt: Date.now(),
		});

		const { result } = renderHook(() => useOracleStatus('XLM'), {
			wrapper: createWrapper(),
		});

		await vi.advanceTimersByTimeAsync(50);
		expect(result.current.relativeTime).toBe('just now');

		act(() => {
			vi.advanceTimersByTime(30_000);
		});

		expect(result.current.relativeTime).toBe('30s ago');

		vi.useRealTimers();
	});
});
