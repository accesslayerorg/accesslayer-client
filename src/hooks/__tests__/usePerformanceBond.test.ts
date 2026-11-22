import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { usePerformanceBond } from '../usePerformanceBond';
import { courseService, type PerformanceBond } from '@/services/course.service';

vi.mock('@/services/course.service', async () => {
	const actual = await vi.importActual<typeof import('@/services/course.service')>(
		'@/services/course.service'
	);
	return {
		...actual,
		courseService: {
			...actual.courseService,
			getPerformanceBond: vi.fn(),
		},
	};
});

const mockGetPerformanceBond = vi.mocked(courseService.getPerformanceBond);

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return ({ children }: { children: ReactNode }) =>
		React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('usePerformanceBond', () => {
	beforeEach(() => {
		mockGetPerformanceBond.mockReset();
	});

	it('fetches performance bond for a given key ID', async () => {
		const mockBond: PerformanceBond = {
			keyId: 'key-100',
			amountStroops: 5_000_000_000,
			state: 'staked',
			milestone: '500 Keys Sold',
		};
		mockGetPerformanceBond.mockResolvedValue(mockBond);

		const { result } = renderHook(() => usePerformanceBond('key-100'), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockGetPerformanceBond).toHaveBeenCalledWith('key-100');
		expect(result.current.data).toEqual(mockBond);
	});

	it('returns null when performance bond does not exist (404)', async () => {
		mockGetPerformanceBond.mockResolvedValue(null);

		const { result } = renderHook(() => usePerformanceBond('key-no-bond'), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toBeNull();
	});

	it('does not run query when keyId is empty', () => {
		const { result } = renderHook(() => usePerformanceBond(''), {
			wrapper: createWrapper(),
		});

		expect(result.current.fetchStatus).toBe('idle');
		expect(mockGetPerformanceBond).not.toHaveBeenCalled();
	});
});
