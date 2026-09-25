import { useEffect, useRef } from 'react';

export interface PageLoadTiming {
	page_name: string;
	ttfb: number;
	dcl: number;
	load_complete: number;
}

function readNavigationTiming(pageName: string): PageLoadTiming | null {
	const entries = performance.getEntriesByType('navigation');
	if (!entries.length) return null;

	const nav = entries[0] as PerformanceNavigationTiming;

	return {
		page_name: pageName,
		ttfb: Math.round(nav.responseStart - nav.requestStart),
		dcl: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
		load_complete: Math.round(nav.loadEventEnd - nav.startTime),
	};
}

/**
 * Logs page-load performance (TTFB / DOM Content Loaded / load complete) via
 * the Navigation Timing API after the page becomes interactive (#693, #726).
 *
 * Used on marketplace, creator profile, and portfolio pages with
 * `page_name` of `'marketplace'`, `'creator_profile'`, or `'portfolio'`.
 *
 * - Production only (`import.meta.env.PROD`) — never fires in dev/test, so
 *   it can't add noise or overhead to local development.
 * - Debounced to exactly one log per mount via a ref guard, so re-renders
 *   (state updates, prop changes) never produce duplicate logs.
 * - Reads happen after `load` (or immediately if the page already finished
 *   loading by the time this effect runs) and never block rendering — the
 *   read + log is entirely async relative to the render path.
 */
export function useNavigationTiming(pageName: string) {
	const hasLogged = useRef(false);

	useEffect(() => {
		if (!import.meta.env.PROD) return;
		if (hasLogged.current) return;

		function emit() {
			if (hasLogged.current) return;
			const timing = readNavigationTiming(pageName);
			if (!timing) return;

			hasLogged.current = true;
			console.info('[page-load-perf]', timing);
		}

		if (document.readyState === 'complete') {
			emit();
			return;
		}

		window.addEventListener('load', emit, { once: true });
		return () => window.removeEventListener('load', emit);
	}, [pageName]);
}
