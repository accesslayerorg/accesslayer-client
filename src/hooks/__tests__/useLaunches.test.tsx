import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLaunches } from '@/hooks/useLaunches';
import { courseService, type Course } from '@/services/course.service';

const { nowRef } = vi.hoisted(() => ({ nowRef: { value: 0 } }));

vi.mock('@/hooks/useNowMs', () => ({ useNowMs: () => nowRef.value }));
vi.mock('@/services/course.service', () => ({
	courseService: { getCourses: vi.fn() },
}));

const getCourses = vi.mocked(courseService.getCourses);
const NOW = new Date('2026-06-10T12:00:00Z').getTime();

function makeCourse(id: string, overrides: Partial<Course> = {}): Course {
	return {
		id,
		title: `Key ${id}`,
		description: '',
		price: 1,
		instructorId: `creator-${id}`,
		category: 'Art',
		level: 'BEGINNER',
		...overrides,
	};
}

describe('useLaunches (#1409)', () => {
	let client: QueryClient;

	beforeEach(() => {
		vi.clearAllMocks();
		nowRef.value = NOW;
		client = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		getCourses.mockResolvedValue([
			makeCourse('flip', {
				auctionEndsAt: new Date(NOW + 5000).toISOString(),
			}),
			makeCourse('older', { createdAt: '2026-05-01T00:00:00Z' }),
		]);
	});

	const wrapper = ({ children }: { children: React.ReactNode }) =>
		React.createElement(QueryClientProvider, { client }, children);

	it('filters by tab and moves a launch to live when the countdown expires', async () => {
		const { result, rerender } = renderHook(
			({ tab }: { tab: 'upcoming' | 'live' | 'recent' }) => useLaunches(tab),
			{ wrapper, initialProps: { tab: 'upcoming' as const } }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.launches.map(launch => launch.id)).toEqual(['flip']);

		nowRef.value = NOW + 6000;
		rerender({ tab: 'live' });
		expect(result.current.launches.map(launch => launch.id)).toEqual(['flip']);

		rerender({ tab: 'recent' });
		expect(result.current.launches.map(launch => launch.id)).toEqual(['older']);
	});

	it('keeps all launches available for the calendar regardless of tab', async () => {
		const { result } = renderHook(() => useLaunches('upcoming'), { wrapper });
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.allLaunches.map(launch => launch.id).sort()).toEqual([
			'flip',
			'older',
		]);
	});
});
