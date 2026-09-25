import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRelativeTime } from '@/hooks/useRelativeTime';

describe('useRelativeTime', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-26T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns a seconds-relative string for a timestamp 30 seconds ago', () => {
		const { result } = renderHook(() =>
			useRelativeTime(new Date(Date.now() - 30_000))
		);
		expect(result.current).toMatch(/just now/i);
	});

	it('returns a minutes-relative string for a timestamp 90 seconds ago', () => {
		const { result } = renderHook(() =>
			useRelativeTime(new Date(Date.now() - 90_000))
		);
		expect(result.current).toMatch(/minute/i);
	});

	it('returns an hours-relative string for a timestamp 2 hours ago', () => {
		const { result } = renderHook(() =>
			useRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000))
		);
		expect(result.current).toMatch(/hour/i);
	});

	it('returns a days-relative string for a timestamp 3 days ago', () => {
		const { result } = renderHook(() =>
			useRelativeTime(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))
		);
		expect(result.current).toMatch(/day/i);
	});

	it('updates the output after the 60-second refresh interval', () => {
		const base = Date.now();
		const { result } = renderHook(() =>
			useRelativeTime(new Date(base - 30_000))
		);

		expect(result.current).toMatch(/just now/i);

		act(() => {
			vi.setSystemTime(new Date(base + 60_000));
			vi.advanceTimersByTime(60_000);
		});

		expect(result.current).toMatch(/minute/i);
	});

	it('returns N/A for a null timestamp', () => {
		const { result } = renderHook(() => useRelativeTime(null));
		expect(result.current).toBe('N/A');
	});

	it('returns N/A for an undefined timestamp', () => {
		const { result } = renderHook(() => useRelativeTime(undefined));
		expect(result.current).toBe('N/A');
	});

	it('returns N/A for an invalid date string', () => {
		const { result } = renderHook(() => useRelativeTime('not-a-date'));
		expect(result.current).toBe('N/A');
	});

	it('cleans up the interval on unmount', () => {
		const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
		const { unmount } = renderHook(() =>
			useRelativeTime(new Date(Date.now() - 60_000))
		);
		unmount();
		expect(clearIntervalSpy).toHaveBeenCalled();
		clearIntervalSpy.mockRestore();
	});
});
