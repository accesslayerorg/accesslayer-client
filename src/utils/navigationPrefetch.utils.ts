import { queryClient } from '@/providers/web3Utils';
import { courseService } from '@/services/course.service';

export interface PrefetchTask {
	id: string;
	run: () => Promise<void>;
	cancel?: () => void;
}

const MAX_CONCURRENT_PREFETCHES = 3;
let activePrefetches = 0;
const pendingQueue: PrefetchTask[] = [];
const completedPrefetches = new Set<string>();
const prefetchedPaths = new Set<string>();

/**
 * Checks whether prefetching should be skipped due to data saver
 * or a slow network connection (2G / slow-2g).
 */
export function shouldSkipPrefetch(): boolean {
	if (typeof navigator === 'undefined') return false;
	const nav = navigator as unknown as {
		connection?: {
			saveData?: boolean;
			effectiveType?: string;
		};
	};
	if (nav.connection) {
		if (nav.connection.saveData) return true;
		if (
			nav.connection.effectiveType === 'slow-2g' ||
			nav.connection.effectiveType === '2g'
		) {
			return true;
		}
	}
	return false;
}

export function getActivePrefetchesCount(): number {
	return activePrefetches;
}

export function getPendingQueueLength(): number {
	return pendingQueue.length;
}

export function resetPrefetchState(): void {
	activePrefetches = 0;
	pendingQueue.length = 0;
	completedPrefetches.clear();
	prefetchedPaths.clear();
}

function processNext(): void {
	if (activePrefetches >= MAX_CONCURRENT_PREFETCHES || pendingQueue.length === 0) {
		return;
	}

	const nextTask = pendingQueue.shift();
	if (!nextTask) return;

	activePrefetches++;
	nextTask
		.run()
		.catch(() => {})
		.finally(() => {
			activePrefetches--;
			completedPrefetches.add(nextTask.id);
			processNext();
		});
}

/**
 * Enqueue a prefetch task with max concurrency of 3.
 * Returns a cancel function.
 */
export function enqueuePrefetch(
	id: string,
	run: () => Promise<void>,
	priority: 'normal' | 'high' = 'normal'
): () => void {
	if (shouldSkipPrefetch()) {
		return () => {};
	}

	if (completedPrefetches.has(id)) {
		return () => {};
	}

	// Avoid duplicate entries in pending queue
	if (pendingQueue.some(item => item.id === id)) {
		return () => cancelPrefetch(id);
	}

	let isCancelled = false;
	const task: PrefetchTask = {
		id,
		run: async () => {
			if (isCancelled) return;
			await run();
		},
		cancel: () => {
			isCancelled = true;
		},
	};

	if (priority === 'high') {
		pendingQueue.unshift(task);
	} else {
		pendingQueue.push(task);
	}

	processNext();

	return () => cancelPrefetch(id);
}

export function cancelPrefetch(id: string): void {
	const index = pendingQueue.findIndex(item => item.id === id);
	if (index !== -1) {
		const [removed] = pendingQueue.splice(index, 1);
		removed?.cancel?.();
	}
}

/**
 * Route chunk loader mapping for key app destinations.
 */
const ROUTE_CHUNK_LOADERS: Record<string, () => Promise<unknown>> = {
	'/': () => import('@/pages/HomePage'),
	'/marketplace': () => import('@/pages/MarketplacePage'),
	'/discovery': () => import('@/pages/DiscoveryPage'),
	'/status': () => import('@/pages/StatusPage'),
	'/borrow': () => import('@/pages/BorrowPage'),
	'/creator': () => import('@/pages/CreatorDetailPage'),
};

export async function prefetchRouteChunk(path: string): Promise<void> {
	const base = path.split('?')[0].split('#')[0];
	const match =
		ROUTE_CHUNK_LOADERS[base] ||
		(base.startsWith('/creator/') ? ROUTE_CHUNK_LOADERS['/creator'] : undefined);

	if (match) {
		await match();
	}
}

/**
 * Prefetches data for key detail pages with a 30s stale time.
 */
export async function prefetchRouteData(path: string): Promise<void> {
	const clean = path.split('?')[0];
	const keyMatch = clean.match(/^\/creator(?:s)?\/([^/]+)/);
	if (keyMatch && keyMatch[1]) {
		const keyId = keyMatch[1];
		try {
			await queryClient.prefetchQuery({
				queryKey: ['course', keyId],
				queryFn: () => courseService.getCourse(keyId),
				staleTime: 30_000,
			});
		} catch {
			// Failures should never interrupt the UI
		}
	}
}

export async function prefetchPath(path: string): Promise<void> {
	prefetchedPaths.add(path);
	await Promise.allSettled([prefetchRouteChunk(path), prefetchRouteData(path)]);
}

/* -------------------------------------------------------------------------- */
/* Navigation Timing & Measurements                                           */
/* -------------------------------------------------------------------------- */

export interface NavigationMeasurement {
	path: string;
	isPrefetched: boolean;
	durationMs: number;
	timestamp: number;
}

const measurements: NavigationMeasurement[] = [];
const navigationStartMap = new Map<string, number>();

export function isPathPrefetched(path: string): boolean {
	return prefetchedPaths.has(path);
}

export function recordNavigationStart(path: string): void {
	navigationStartMap.set(path, performance.now());
}

export function recordNavigationEnd(path: string): NavigationMeasurement | null {
	const startTime = navigationStartMap.get(path);
	if (!startTime) return null;
	navigationStartMap.delete(path);

	const durationMs = performance.now() - startTime;
	const measurement: NavigationMeasurement = {
		path,
		isPrefetched: isPathPrefetched(path),
		durationMs: Math.round(durationMs * 100) / 100,
		timestamp: Date.now(),
	};

	measurements.push(measurement);
	return measurement;
}

export function getNavigationMeasurements(): NavigationMeasurement[] {
	return [...measurements];
}
