/**
 * Integration test for the debounced creator search (#489).
 *
 * Strategy: render a minimal wrapper that uses useDebounce with the real hook
 * (fake timers) and calls courseService.getCourses in a useEffect, identical
 * to what LandingPage does. This avoids the URL-sync / price-refresh side
 * effects that make call-count assertions brittle when testing the full page.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { courseService, type Course } from '@/services/course.service';

vi.mock('@/services/course.service', () => ({
	courseService: { getCourses: vi.fn() },
}));

const mockGetCourses = vi.mocked(courseService.getCourses);

const creator: Course = {
	id: '1',
	title: 'Creator Alpha',
	description: 'Digital artist',
	price: 0.05,
	priceStroops: 500_000,
	creatorShareSupply: 100,
	instructorId: 'creator-a',
	category: 'Art',
	level: 'BEGINNER',
	isVerified: true,
};

// Minimal harness — mirrors the search → debounce → API pattern from LandingPage.
function DebouncedSearchHarness({ delay = 300 }: { delay?: number }) {
	const [query, setQuery] = useState('');
	const debouncedQuery = useDebounce(query, delay);

	useEffect(() => {
		const params = debouncedQuery.trim()
			? { search: debouncedQuery.trim() }
			: undefined;
		courseService.getCourses(params);
	}, [debouncedQuery]);

	return (
		<input
			data-testid="search"
			placeholder="Search creators by name or handle..."
			value={query}
			onChange={e => setQuery(e.target.value)}
		/>
	);
}

describe('Debounced search – integration (#489)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		mockGetCourses.mockReset();
		mockGetCourses.mockResolvedValue([creator]);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('fires no API calls during the typing burst (before the delay elapses)', () => {
		render(<DebouncedSearchHarness delay={300} />);

		// The initial render triggers one call (debouncedQuery = '').
		act(() => { vi.advanceTimersByTime(300); });
		expect(mockGetCourses).toHaveBeenCalledTimes(1);
		mockGetCourses.mockClear();

		const input = screen.getByTestId('search');

		// Type five characters, each 50 ms apart — all within the 300 ms window.
		for (const value of ['a', 'ab', 'abc', 'abcd', 'abcde']) {
			act(() => {
				fireEvent.change(input, { target: { value } });
				vi.advanceTimersByTime(50);
			});
		}

		// Debounce has NOT expired yet → no additional API calls.
		expect(mockGetCourses).not.toHaveBeenCalled();
	});

	it('fires exactly one API call after the debounce delay with the final value', () => {
		render(<DebouncedSearchHarness delay={300} />);

		// Flush the initial render call.
		act(() => { vi.advanceTimersByTime(300); });
		mockGetCourses.mockClear();

		const input = screen.getByTestId('search');

		// Rapid-fire five keystrokes within the 300 ms window.
		for (const value of ['a', 'ab', 'abc', 'abcd', 'abcde']) {
			act(() => {
				fireEvent.change(input, { target: { value } });
				vi.advanceTimersByTime(50);
			});
		}

		// Advance past the full debounce window for the last keystroke.
		act(() => { vi.advanceTimersByTime(300); });

		// Exactly one call, using the final typed value.
		expect(mockGetCourses).toHaveBeenCalledTimes(1);
		expect(mockGetCourses).toHaveBeenCalledWith({ search: 'abcde' });
	});

	it('omits the search param when the input is cleared', () => {
		render(<DebouncedSearchHarness delay={300} />);

		act(() => { vi.advanceTimersByTime(300); });
		mockGetCourses.mockClear();

		const input = screen.getByTestId('search');

		// Type a value, let it settle.
		act(() => {
			fireEvent.change(input, { target: { value: 'hello' } });
		});
		act(() => { vi.advanceTimersByTime(300); });
		expect(mockGetCourses).toHaveBeenLastCalledWith({ search: 'hello' });

		mockGetCourses.mockClear();

		// Clear the input.
		act(() => {
			fireEvent.change(input, { target: { value: '' } });
		});
		act(() => { vi.advanceTimersByTime(300); });

		// Empty query → no search param (component passes undefined).
		expect(mockGetCourses).toHaveBeenCalledTimes(1);
		expect(mockGetCourses).toHaveBeenCalledWith(undefined);
	});
});
