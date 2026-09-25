import { useEffect, useRef, useMemo } from 'react';
import { useVirtualList } from '@/hooks/useVirtualList';
import { useHolders } from '@/hooks/useHolders';
import { HolderRow } from './HolderRow';
import { HolderRowSkeleton } from './HolderRowSkeleton';

const ITEM_HEIGHT = 48; // Fixed row height in pixels
const OVERSCAN = 5; // Number of items to render outside viewport
const FETCH_THRESHOLD = 20; // Trigger fetch when within 20 rows of end

interface VirtualizedHolderListProps {
	creatorId: string;
	containerHeight: number;
}

export function VirtualizedHolderList({
	creatorId,
	containerHeight,
}: VirtualizedHolderListProps) {
	const {
		holders,
		totalCount,
		holderMap,
		isLoading,
		isError,
		error,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useHolders(creatorId);

	const { startIndex, endIndex, offsetY, totalHeight, containerRef } =
		useVirtualList({
			itemCount: totalCount,
			itemHeight: ITEM_HEIGHT,
			containerHeight,
			overscan: OVERSCAN,
		});

	// Scroll restoration
	const storageKey = `holder-list:${creatorId}`;
	const hasRestoredScroll = useRef(false);

	// Restore scroll position on mount
	useEffect(() => {
		if (!hasRestoredScroll.current && containerRef.current && !isLoading) {
			const savedScroll = sessionStorage.getItem(storageKey);
			if (savedScroll) {
				const scrollTop = parseInt(savedScroll, 10);
				containerRef.current.scrollTop = scrollTop;
			}
			hasRestoredScroll.current = true;
		}
	}, [storageKey, containerRef, isLoading]);

	// Save scroll position
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const handleScroll = () => {
			sessionStorage.setItem(storageKey, container.scrollTop.toString());
		};

		container.addEventListener('scroll', handleScroll, { passive: true });
		return () => container.removeEventListener('scroll', handleScroll);
	}, [storageKey, containerRef]);

	// Auto-fetch next page when approaching end
	useEffect(() => {
		if (
			!isFetchingNextPage &&
			hasNextPage &&
			endIndex >= holders.length - FETCH_THRESHOLD
		) {
			fetchNextPage();
		}
	}, [endIndex, holders.length, isFetchingNextPage, hasNextPage, fetchNextPage]);

	// Generate visible rows
	const visibleRows = useMemo(() => {
		const rows = [];
		for (let i = startIndex; i <= endIndex; i++) {
			rows.push(i);
		}
		return rows;
	}, [startIndex, endIndex]);

	if (isLoading && holders.length === 0) {
		return (
			<div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
				<div className="px-6 py-4 border-b border-white/10">
					<h3 className="text-lg font-bold text-white">Key Holders</h3>
				</div>
				<div className="relative" style={{ height: containerHeight }}>
					{Array.from({ length: 10 }).map((_, i) => (
						<HolderRowSkeleton
							key={i}
							style={{
								top: i * ITEM_HEIGHT,
								height: ITEM_HEIGHT,
							}}
						/>
					))}
				</div>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
				<p className="text-red-400 mb-2">Failed to load holders</p>
				<p className="text-sm text-white/60">
					{error instanceof Error ? error.message : 'Unknown error'}
				</p>
			</div>
		);
	}

	if (totalCount === 0) {
		return (
			<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
				<p className="text-white/60">No key holders yet</p>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
			{/* Header */}
			<div className="px-6 py-4 border-b border-white/10">
				<h3 className="text-lg font-bold text-white">
					Key Holders ({totalCount.toLocaleString()})
				</h3>
			</div>

			{/* Column Headers */}
			<div className="flex items-center gap-4 border-b border-white/10 px-6 py-3 text-sm font-medium text-white/60 bg-white/[0.01]">
				<div className="w-12">Rank</div>
				<div className="flex-1">Holder</div>
				<div className="w-20 text-right">Keys</div>
				<div className="w-24 text-right">Value</div>
				<div className="w-16 text-right">Share</div>
			</div>

			{/* Virtualized List Container */}
			<div
				ref={containerRef}
				className="overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
				style={{ height: containerHeight }}
			>
				<div className="relative" style={{ height: totalHeight }}>
					<div
						className="relative"
						style={{
							transform: `translateY(${offsetY}px)`,
							willChange: 'transform',
						}}
					>
						{visibleRows.map(index => {
							const holder = holderMap.get(index);

							if (!holder) {
								// Show skeleton for items being fetched
								return (
									<HolderRowSkeleton
										key={`skeleton-${index}`}
										style={{
											top: (index - startIndex) * ITEM_HEIGHT,
											height: ITEM_HEIGHT,
										}}
									/>
								);
							}

							return (
								<HolderRow
									key={holder.address}
									holder={holder}
									style={{
										top: (index - startIndex) * ITEM_HEIGHT,
										height: ITEM_HEIGHT,
									}}
								/>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
