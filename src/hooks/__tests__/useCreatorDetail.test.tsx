/**
 * Creator detail refresh cadence tests (#1121).
 *
 * The key detail query polls every 30 seconds so the UI detects an admin
 * freeze (or an unfreeze) without requiring a page reload.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
	useCreatorDetail,
	CREATOR_DETAIL_REFRESH_INTERVAL_MS,
} from '@/hooks/useCreators';
import { courseService } from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getCourse: vi.fn(),
	},
}));

const mockGetCourse = vi.mocked(courseService.getCourse);

describe('useCreatorDetail', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		mockGetCourse.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
		queryClient.clear();
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	const baseCourse = {
		id: 'creator-1',
		title: 'Alex Rivers',
		description: 'Digital Artist & Illustrator',
		price: 0.1,
		instructorId: 'inst-1',
		category: 'Art',
		level: 'BEGINNER' as const,
	};

	it('fetches the key and configures a 30 second refresh', async () => {
		mockGetCourse.mockResolvedValue(baseCourse);

		const { result } = renderHook(() => useCreatorDetail('creator-1'), {
			wrapper,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data?.id).toBe('creator-1');
		expect(mockGetCourse).toHaveBeenCalledWith('creator-1');

		const query = queryClient
			.getQueryCache()
			.find({ queryKey: queryKeys.creators.detail('creator-1') });
		expect(CREATOR_DETAIL_REFRESH_INTERVAL_MS).toBe(30_000);
		expect(query?.options.staleTime).toBe(30_000);
		expect(query?.options.refetchInterval).toBe(30_000);
	});

	it('refetches after 30 seconds to pick up freeze changes', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		mockGetCourse.mockResolvedValue(baseCourse);

		const { result } = renderHook(() => useCreatorDetail('creator-1'), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(mockGetCourse).toHaveBeenCalledTimes(1);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(30_000);
		});

		expect(mockGetCourse).toHaveBeenCalledTimes(2);
	});

	it('does not fetch when the key id is empty', () => {
		renderHook(() => useCreatorDetail(''), { wrapper });
		expect(mockGetCourse).not.toHaveBeenCalled();
	});
});
