import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
	useKeyDiscovery,
	sortTrendingKeys,
	sortNewListings,
	DISCOVERY_POLL_INTERVAL_MS,
	TRENDING_KEYS_LIMIT,
	NEW_LISTINGS_LIMIT,
} from '../useKeyDiscovery';
import { courseService, type Course } from '@/services/course.service';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getCourses: vi.fn(),
	},
}));

const mockGetCourses = vi.mocked(courseService.getCourses);

function createMockCourse(id: string, overrides: Partial<Course> = {}): Course {
	return {
		id,
		title: `Creator ${id}`,
		description: `Description ${id}`,
		price: 10,
		instructorId: `inst_${id}`,
		category: 'Art',
		level: 'BEGINNER',
		volume24h: 10,
		change24h: 5,
		createdAt: '2026-01-01T00:00:00Z',
		...overrides,
	};
}

describe('useKeyDiscovery utils (#937)', () => {
	it('sorts trending keys by 24h volume descending and limits to 5', () => {
		const creators: Course[] = [
			createMockCourse('1', { volume24h: 10 }),
			createMockCourse('2', { volume24h: 50 }),
			createMockCourse('3', { volume24h: 5 }),
			createMockCourse('4', { volume24h: 100 }),
			createMockCourse('5', { volume24h: 20 }),
			createMockCourse('6', { volume24h: 75 }),
			createMockCourse('7', { volume24h: undefined }),
		];

		const trending = sortTrendingKeys(creators);
		expect(trending).toHaveLength(TRENDING_KEYS_LIMIT);
		expect(trending.map(c => c.id)).toEqual(['4', '6', '2', '5', '1']);
	});

	it('sorts new listings by createdAt descending and limits to 10', () => {
		const creators: Course[] = Array.from({ length: 15 }, (_, i) =>
			createMockCourse(`${i + 1}`, {
				createdAt: new Date(2026, 0, i + 1).toISOString(),
			})
		);

		const newListings = sortNewListings(creators);
		expect(newListings).toHaveLength(NEW_LISTINGS_LIMIT);
		expect(newListings[0].id).toBe('15');
		expect(newListings[9].id).toBe('6');
	});

	it('falls back to joinedAt or nextDropAt when createdAt is absent in new listings', () => {
		const creators: Course[] = [
			createMockCourse('old', { createdAt: '2026-01-01T00:00:00Z' }),
			createMockCourse('joinedLater', {
				createdAt: undefined,
				joinedAt: '2026-03-01T00:00:00Z',
			}),
			createMockCourse('dropLatest', {
				createdAt: undefined,
				nextDropAt: '2026-05-01T00:00:00Z',
			}),
		];

		const sorted = sortNewListings(creators);
		expect(sorted.map(c => c.id)).toEqual(['dropLatest', 'joinedLater', 'old']);
	});
});

describe('useKeyDiscovery hook (#937)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.clearAllMocks();
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});
	});

	const createWrapper = () => {
		return ({ children }: { children: React.ReactNode }) =>
			React.createElement(QueryClientProvider, { client: queryClient }, children);
	};

	it('fetches trending and new listings with 60s interval', async () => {
		const mockData: Course[] = [
			createMockCourse('1', { volume24h: 50, createdAt: '2026-01-02T00:00:00Z' }),
			createMockCourse('2', { volume24h: 100, createdAt: '2026-01-01T00:00:00Z' }),
		];

		mockGetCourses.mockResolvedValue(mockData);

		const { result } = renderHook(() => useKeyDiscovery(), {
			wrapper: createWrapper(),
		});

		expect(result.current.isLoading).toBe(true);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(mockGetCourses).toHaveBeenCalledWith({ sort: 'volume_desc' });
		expect(mockGetCourses).toHaveBeenCalledWith({ sort: 'newest' });

		expect(result.current.trendingKeys.map(c => c.id)).toEqual(['2', '1']);
		expect(result.current.newListings.map(c => c.id)).toEqual(['1', '2']);
		expect(DISCOVERY_POLL_INTERVAL_MS).toBe(60_000);
	});
});
