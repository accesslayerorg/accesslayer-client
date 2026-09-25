/**
 * Unit tests for useInfiniteCreatorMarketplace — cursor-based infinite
 * pagination over the creator key marketplace listing (#685).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useInfiniteCreatorMarketplace } from '../useInfiniteCreatorMarketplace';
import { courseService, type Course, type CoursesPage } from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';

vi.mock('@/services/course.service', async () => {
	const actual = await vi.importActual<typeof import('@/services/course.service')>(
		'@/services/course.service'
	);
	return {
		...actual,
		courseService: {
			getCoursesPage: vi.fn(),
		},
	};
});

const mockGetCoursesPage = vi.mocked(courseService.getCoursesPage);

function makeCreator(id: string): Course {
	return {
		id,
		title: `Creator ${id}`,
		description: 'desc',
		price: 0.1,
		instructorId: id,
		category: 'Art',
		level: 'BEGINNER',
	};
}

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return React.createElement(QueryClientProvider, { client: queryClient }, children);
	};
}

describe('useInfiniteCreatorMarketplace', () => {
	beforeEach(() => {
		mockGetCoursesPage.mockReset();
	});

	it('fetches only the first page on mount', async () => {
		const page1: CoursesPage = {
			items: [makeCreator('a'), makeCreator('b')],
			page: 1,
			hasMore: true,
		};
		mockGetCoursesPage.mockResolvedValue(page1);

		const { result } = renderHook(() => useInfiniteCreatorMarketplace(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isLoadingFirstPage).toBe(false));

		expect(mockGetCoursesPage).toHaveBeenCalledTimes(1);
		expect(mockGetCoursesPage).toHaveBeenCalledWith(1, undefined);
		expect(result.current.creators).toHaveLength(2);
		expect(result.current.hasMore).toBe(true);
	});

	it('fetches the next page when fetchNextPage is called, appending without duplicates', async () => {
		const page1: CoursesPage = {
			items: [makeCreator('a'), makeCreator('b')],
			page: 1,
			hasMore: true,
		};
		const page2: CoursesPage = {
			items: [makeCreator('b'), makeCreator('c')], // 'b' repeated across pages
			page: 2,
			hasMore: false,
		};
		mockGetCoursesPage.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

		const { result } = renderHook(() => useInfiniteCreatorMarketplace(), {
			wrapper: createWrapper(),
		});
		await waitFor(() => expect(result.current.isLoadingFirstPage).toBe(false));

		result.current.fetchNextPage();

		await waitFor(() => expect(mockGetCoursesPage).toHaveBeenCalledTimes(2));
		expect(mockGetCoursesPage).toHaveBeenNthCalledWith(2, 2, undefined);

		await waitFor(() =>
			expect(result.current.creators.map(c => c.id)).toEqual(['a', 'b', 'c'])
		);
		expect(result.current.hasMore).toBe(false);
	});

	it('stops fetching once the last page reports hasMore: false', async () => {
		mockGetCoursesPage.mockResolvedValue({
			items: [makeCreator('a')],
			page: 1,
			hasMore: false,
		});

		const { result } = renderHook(() => useInfiniteCreatorMarketplace(), {
			wrapper: createWrapper(),
		});
		await waitFor(() => expect(result.current.isLoadingFirstPage).toBe(false));

		expect(result.current.hasMore).toBe(false);
	});

	it('passes filter params through to every page request', async () => {
		mockGetCoursesPage.mockResolvedValue({
			items: [makeCreator('a')],
			page: 1,
			hasMore: false,
		});

		const params = { category: 'Art', limit: 10 };
		renderHook(() => useInfiniteCreatorMarketplace(params), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(mockGetCoursesPage).toHaveBeenCalledWith(1, params));
	});

	describe('stale-while-revalidate (#691)', () => {
		it('serves cached data instantly (no first-page loading state) on remount within 60s', async () => {
			mockGetCoursesPage.mockResolvedValue({
				items: [makeCreator('a')],
				page: 1,
				hasMore: false,
			});

			const queryClient = new QueryClient({
				defaultOptions: { queries: { retry: false } },
			});
			const wrapper = ({ children }: { children: React.ReactNode }) =>
				React.createElement(QueryClientProvider, { client: queryClient }, children);

			const first = renderHook(() => useInfiniteCreatorMarketplace(), { wrapper });
			await waitFor(() => expect(first.result.current.isLoadingFirstPage).toBe(false));
			first.unmount();

			mockGetCoursesPage.mockClear();

			const second = renderHook(() => useInfiniteCreatorMarketplace(), { wrapper });

			// Cached data must be available immediately -- never a spinner state
			// -- because the previous fetch is still within the 60s staleTime.
			expect(second.result.current.isLoadingFirstPage).toBe(false);
			expect(second.result.current.creators).toHaveLength(1);
			expect(mockGetCoursesPage).not.toHaveBeenCalled();
		});

		it('reports isRefreshing while silently refetching stale data in the background', async () => {
			mockGetCoursesPage.mockResolvedValue({
				items: [makeCreator('a')],
				page: 1,
				hasMore: false,
			});

			const queryClient = new QueryClient({
				defaultOptions: { queries: { retry: false } },
			});
			const wrapper = ({ children }: { children: React.ReactNode }) =>
				React.createElement(QueryClientProvider, { client: queryClient }, children);

			const { result } = renderHook(() => useInfiniteCreatorMarketplace(), { wrapper });
			await waitFor(() => expect(result.current.isLoadingFirstPage).toBe(false));

			expect(result.current.isRefreshing).toBe(false);

			// Slow down the refetch so the transient "refreshing" window is
			// actually observable instead of resolving synchronously.
			let resolveRefetch!: (page: CoursesPage) => void;
			mockGetCoursesPage.mockReturnValueOnce(
				new Promise(resolve => {
					resolveRefetch = resolve;
				})
			);

			// Force the cached entry to be considered stale, then trigger a
			// background refetch the way a remount-after-60s would.
			queryClient.invalidateQueries({ queryKey: queryKeys.creators.infiniteList(undefined) });

			await waitFor(() => expect(result.current.isRefreshing).toBe(true));
			// Cached data must remain visible throughout -- no spinner regression.
			expect(result.current.isLoadingFirstPage).toBe(false);
			expect(result.current.creators).toHaveLength(1);

			resolveRefetch({ items: [makeCreator('a')], page: 1, hasMore: false });
			await waitFor(() => expect(result.current.isRefreshing).toBe(false));
		});

		it('does not set isRefreshing during the initial load or next-page fetch', async () => {
			let resolveFirstPage!: (page: CoursesPage) => void;
			mockGetCoursesPage.mockReturnValueOnce(
				new Promise(resolve => {
					resolveFirstPage = resolve;
				})
			);

			const { result } = renderHook(() => useInfiniteCreatorMarketplace(), {
				wrapper: createWrapper(),
			});

			expect(result.current.isRefreshing).toBe(false);
			resolveFirstPage({ items: [makeCreator('a')], page: 1, hasMore: true });
			await waitFor(() => expect(result.current.isLoadingFirstPage).toBe(false));
			expect(result.current.isRefreshing).toBe(false);

			let resolveNextPage!: (page: CoursesPage) => void;
			mockGetCoursesPage.mockReturnValueOnce(
				new Promise(resolve => {
					resolveNextPage = resolve;
				})
			);

			result.current.fetchNextPage();
			await waitFor(() => expect(result.current.isFetchingNextPage).toBe(true));
			expect(result.current.isRefreshing).toBe(false);

			resolveNextPage({ items: [makeCreator('b')], page: 2, hasMore: false });
		});
	});
});
