import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRelativeTime } from '@/hooks/formatting';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('useRelativeTime', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-26T00:00:00Z'));
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders a minute-granularity relative string', () => {
		const { result } = renderHook(() =>
			useRelativeTime(Date.now() - 2 * MINUTE)
		);
		expect(result.current).toBe('2 minutes ago');
	});

	it('renders an hour-granularity relative string', () => {
		const { result } = renderHook(() =>
			useRelativeTime(Date.now() - 3 * HOUR)
		);
		expect(result.current).toBe('3 hours ago');
	});

	it('renders a day-granularity relative string', () => {
		const { result } = renderHook(() =>
			useRelativeTime(Date.now() - (3 * DAY + MINUTE))
		);
		expect(result.current).toBe('3 days ago');
	});

	it('reports sub-minute timestamps as "now"', () => {
		const { result } = renderHook(() =>
			useRelativeTime(Date.now() - 30 * 1000)
		);
		expect(result.current).toBe('now');
	});

	it('refreshes the label every 60 seconds while mounted', () => {
		// 2 minutes and 5 seconds ago → floors to "2 minutes ago".
		const { result } = renderHook(() =>
			useRelativeTime(Date.now() - (2 * MINUTE + 5 * 1000))
		);
		expect(result.current).toBe('2 minutes ago');

		act(() => {
			vi.advanceTimersByTime(60 * 1000);
		});
		expect(result.current).toBe('3 minutes ago');
	});
});
