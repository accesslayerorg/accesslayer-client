import { useEffect, useRef } from 'react';

interface UseInfiniteScrollOptions {
	/** Whether the observer should be active (e.g. only in infinite-scroll mode). */
	enabled: boolean;
	/** Whether there is more content left to load. */
	hasMore: boolean;
	/** Called when the sentinel enters the viewport and more content should load. */
	onLoadMore: () => void;
	rootMargin?: string;
}

/**
 * Attaches an IntersectionObserver to a sentinel element and calls
 * `onLoadMore` once it scrolls into view. Falls back to doing nothing when
 * IntersectionObserver isn't available (SSR, old browsers) so callers should
 * always pair this with a manual "Load more" control.
 */
export function useInfiniteScroll<T extends HTMLElement>({
	enabled,
	hasMore,
	onLoadMore,
	rootMargin = '200px',
}: UseInfiniteScrollOptions) {
	const sentinelRef = useRef<T | null>(null);
	const onLoadMoreRef = useRef(onLoadMore);
	onLoadMoreRef.current = onLoadMore;

	useEffect(() => {
		if (!enabled || !hasMore) return;
		if (typeof IntersectionObserver === 'undefined') return;

		const node = sentinelRef.current;
		if (!node) return;

		const observer = new IntersectionObserver(
			entries => {
				if (entries[0]?.isIntersecting) {
					onLoadMoreRef.current();
				}
			},
			{ rootMargin }
		);

		observer.observe(node);
		return () => observer.disconnect();
	}, [enabled, hasMore, rootMargin]);

	return sentinelRef;
}
