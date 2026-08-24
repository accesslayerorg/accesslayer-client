import { useCallback, useEffect, useRef, useState } from 'react';

export interface VirtualListConfig {
	itemCount: number;
	itemHeight: number;
	containerHeight: number;
	overscan?: number;
}

export interface VirtualListResult {
	startIndex: number;
	endIndex: number;
	offsetY: number;
	totalHeight: number;
	containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Virtual list hook that renders only visible rows in the viewport.
 * Implements scroll event throttling via requestAnimationFrame and
 * IntersectionObserver for off-screen pause optimization.
 */
export function useVirtualList({
	itemCount,
	itemHeight,
	containerHeight,
	overscan = 3,
}: VirtualListConfig): VirtualListResult {
	const containerRef = useRef<HTMLDivElement>(null);
	const [scrollTop, setScrollTop] = useState(0);
	const rafRef = useRef<number | null>(null);
	const isVisibleRef = useRef(true);

	const totalHeight = itemCount * itemHeight;

	// Calculate visible range
	const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
	const visibleCount = Math.ceil(containerHeight / itemHeight);
	const endIndex = Math.min(
		itemCount - 1,
		startIndex + visibleCount + overscan * 2
	);

	// Throttled scroll handler using requestAnimationFrame
	const handleScroll = useCallback(() => {
		if (!isVisibleRef.current) return;

		if (rafRef.current !== null) {
			return; // Already scheduled
		}

		rafRef.current = requestAnimationFrame(() => {
			const container = containerRef.current;
			if (container) {
				setScrollTop(container.scrollTop);
			}
			rafRef.current = null;
		});
	}, []);

	// Set up scroll listener
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		// Use passive listener for better scroll performance
		container.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			container.removeEventListener('scroll', handleScroll);
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
			}
		};
	}, [handleScroll]);

	// Set up IntersectionObserver to pause when off-screen
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new IntersectionObserver(
			entries => {
				entries.forEach(entry => {
					isVisibleRef.current = entry.isIntersecting;
				});
			},
			{ threshold: 0 }
		);

		observer.observe(container);

		return () => {
			observer.disconnect();
		};
	}, []);

	return {
		startIndex,
		endIndex,
		offsetY: startIndex * itemHeight,
		totalHeight,
		containerRef,
	};
}
