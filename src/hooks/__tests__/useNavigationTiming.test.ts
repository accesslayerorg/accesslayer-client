/**
 * Unit tests for useNavigationTiming — logs TTFB/DCL/load-complete via the
 * Navigation Timing API after each mount of the marketplace, creator
 * profile, and portfolio pages (#693, #726).
 */
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavigationTiming } from '../useNavigationTiming';

function mockNavigationEntry(overrides: Partial<PerformanceNavigationTiming> = {}) {
	const entry = {
		requestStart: 10,
		responseStart: 60,
		startTime: 0,
		domContentLoadedEventEnd: 200,
		loadEventEnd: 350,
		...overrides,
	} as PerformanceNavigationTiming;

	vi.spyOn(performance, 'getEntriesByType').mockReturnValue([entry]);
	return entry;
}

describe('useNavigationTiming', () => {
	let originalReadyState: string;

	beforeEach(() => {
		originalReadyState = document.readyState;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
		Object.defineProperty(document, 'readyState', {
			value: originalReadyState,
			configurable: true,
		});
	});

	function setProd(value: boolean) {
		vi.stubEnv('PROD', value);
	}

	function setReadyState(value: DocumentReadyState) {
		Object.defineProperty(document, 'readyState', { value, configurable: true });
	}

	it('does not log when not in production mode', () => {
		setProd(false);
		setReadyState('complete');
		mockNavigationEntry();
		const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

		renderHook(() => useNavigationTiming('marketplace'));

		expect(infoSpy).not.toHaveBeenCalled();
	});

	it('logs ttfb, dcl, load_complete, and page_name in production mode', () => {
		setProd(true);
		setReadyState('complete');
		mockNavigationEntry({
			requestStart: 10,
			responseStart: 60,
			startTime: 0,
			domContentLoadedEventEnd: 200,
			loadEventEnd: 350,
		});
		const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

		renderHook(() => useNavigationTiming('marketplace'));

		expect(infoSpy).toHaveBeenCalledWith('[page-load-perf]', {
			page_name: 'marketplace',
			ttfb: 50,
			dcl: 200,
			load_complete: 350,
		});
	});

	it('logs after the load event when the document has not finished loading yet', () => {
		setProd(true);
		setReadyState('loading');
		mockNavigationEntry();
		const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

		renderHook(() => useNavigationTiming('creator_profile'));

		expect(infoSpy).not.toHaveBeenCalled();

		window.dispatchEvent(new Event('load'));

		expect(infoSpy).toHaveBeenCalledWith(
			'[page-load-perf]',
			expect.objectContaining({ page_name: 'creator_profile' })
		);
	});

	it('logs only once per mount even if the hook re-renders', () => {
		setProd(true);
		setReadyState('complete');
		mockNavigationEntry();
		const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

		const { rerender } = renderHook(({ page }) => useNavigationTiming(page), {
			initialProps: { page: 'marketplace' },
		});

		rerender({ page: 'marketplace' });
		rerender({ page: 'marketplace' });

		expect(infoSpy).toHaveBeenCalledTimes(1);
	});

	it('does nothing when no navigation timing entry is available', () => {
		setProd(true);
		setReadyState('complete');
		vi.spyOn(performance, 'getEntriesByType').mockReturnValue([]);
		const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

		renderHook(() => useNavigationTiming('marketplace'));

		expect(infoSpy).not.toHaveBeenCalled();
	});
});

/**
 * Issue #678: lock in the acceptance criteria for the four fields of the
 * `[page-load-perf]` log — every field is present, every timing field is a
 * non-negative number, the route field reflects the current page, and the
 * log is not emitted when PerformanceNavigationTiming data is unavailable.
 *
 * The implementation uses semantic field names —
 *   `page_name`  → the spec's `route`
 *   `ttfb`       → the spec's `time_to_first_byte_ms`
 *   `dcl`        → the spec's `dom_content_loaded_ms`
 *   `load_complete` → the spec's `load_event_ms`
 * — to keep this log stable for downstream observability (dashboards/alerts),
 * so the assertions below target the actual emitted schema.
 */
describe('useNavigationTiming (#678) — page-load-perf log acceptance criteria', () => {
	let originalReadyState: string;

	beforeEach(() => {
		originalReadyState = document.readyState;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
		Object.defineProperty(document, 'readyState', {
			value: originalReadyState,
			configurable: true,
		});
	});

	function setProd(value: boolean) {
		vi.stubEnv('PROD', value);
	}

	function setReadyState(value: DocumentReadyState) {
		Object.defineProperty(document, 'readyState', { value, configurable: true });
	}

	it('all four fields are present in the emitted log and correctly typed', () => {
		setProd(true);
		setReadyState('complete');
		mockNavigationEntry({
			requestStart: 25,
			responseStart: 75,
			startTime: 0,
			domContentLoadedEventEnd: 180,
			loadEventEnd: 325,
		});
		const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

		renderHook(() => useNavigationTiming('marketplace'));

		expect(infoSpy).toHaveBeenCalledTimes(1);
		const [, payload] = infoSpy.mock.calls[0];

		// All four fields are present on the emitted payload.
		expect(payload).toEqual(
			expect.objectContaining({
				page_name: expect.any(String),
				ttfb: expect.any(Number),
				dcl: expect.any(Number),
				load_complete: expect.any(Number),
			})
		);

		// No unexpected fields leak into the payload (the log schema is fixed).
		expect(Object.keys(payload as Record<string, unknown>).sort()).toEqual(
			['dcl', 'load_complete', 'page_name', 'ttfb']
		);

		// And the actual values extracted from the PerformanceNavigationTiming entry.
		expect(payload).toEqual({
			page_name: 'marketplace',
			ttfb: 50, // responseStart(75) - requestStart(25)
			dcl: 180, // domContentLoadedEventEnd(180) - startTime(0)
			load_complete: 325, // loadEventEnd(325) - startTime(0)
		});
	});

	it('each timing field is a non-negative number across a range of entry values', () => {
		setProd(true);
		setReadyState('complete');
		// Use a mix that exercises "almost instant" (single-tick) navigation through
		// to a slow load — every value the hook computes must be a finite number ≥ 0.
		mockNavigationEntry({
			requestStart: 100,
			responseStart: 102,
			startTime: 0,
			domContentLoadedEventEnd: 4,
			loadEventEnd: 12,
		});
		const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

		renderHook(() => useNavigationTiming('marketplace'));

		expect(infoSpy).toHaveBeenCalledTimes(1);
		const [, payload] = infoSpy.mock.calls[0] as [
			string,
			{ ttfb: number; dcl: number; load_complete: number; page_name: string },
		];

		// Type-level: each timing field is a finite, non-negative number.
		expect(Number.isFinite(payload.ttfb)).toBe(true);
		expect(Number.isFinite(payload.dcl)).toBe(true);
		expect(Number.isFinite(payload.load_complete)).toBe(true);

		expect(payload.ttfb).toBeGreaterThanOrEqual(0);
		expect(payload.dcl).toBeGreaterThanOrEqual(0);
		expect(payload.load_complete).toBeGreaterThanOrEqual(0);
	});

	it('route field matches the current route string passed to the hook', () => {
		setProd(true);
		setReadyState('complete');
		mockNavigationEntry();
		const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

		// Marketplace route.
		renderHook(() => useNavigationTiming('marketplace'));
		expect(infoSpy).toHaveBeenLastCalledWith(
			'[page-load-perf]',
			expect.objectContaining({ page_name: 'marketplace' })
		);

		// Creator profile route.
		renderHook(() => useNavigationTiming('creator_profile'));
		expect(infoSpy).toHaveBeenLastCalledWith(
			'[page-load-perf]',
			expect.objectContaining({ page_name: 'creator_profile' })
		);

		// Portfolio route (#726).
		renderHook(() => useNavigationTiming('portfolio'));
		expect(infoSpy).toHaveBeenLastCalledWith(
			'[page-load-perf]',
			expect.objectContaining({ page_name: 'portfolio' })
		);
	});

	it('does not emit a log when PerformanceNavigationTiming is unavailable', () => {
		setProd(true);
		setReadyState('complete');
		// Simulate Safari / older browsers, or timing-blocked environments, where
		// `performance.getEntriesByType('navigation')` returns no entries.
		vi.spyOn(performance, 'getEntriesByType').mockReturnValue([]);
		const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

		renderHook(() => useNavigationTiming('marketplace'));

		expect(infoSpy).not.toHaveBeenCalled();
	});
});
