import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface VirtualListProps<T> {
	items: T[];
	estimateSize: (index: number) => number;
	renderItem: (item: T, index: number) => React.ReactNode;
	className?: string;
	overscan?: number;
	'aria-rowcount'?: number;
	'data-testid'?: string;
	onNearEnd?: () => void;
	nearEndThreshold?: number;
	maxHeight?: number | string;
}

export function VirtualList<T>({
	items,
	estimateSize,
	renderItem,
	className,
	overscan = 5,
	'aria-rowcount': ariaRowcount,
	'data-testid': testId,
	onNearEnd,
	nearEndThreshold = 3,
	maxHeight,
}: VirtualListProps<T>) {
	const parentRef = useRef<HTMLDivElement>(null);

	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => parentRef.current,
		estimateSize,
		overscan,
	});

	const virtualItems = virtualizer.getVirtualItems();

	const handleScroll = useCallback(() => {
		if (!onNearEnd) return;
		const lastItem = virtualItems[virtualItems.length - 1];
		if (!lastItem) return;
		if (lastItem.index >= items.length - 1 - nearEndThreshold) {
			onNearEnd();
		}
	}, [virtualItems, items.length, onNearEnd, nearEndThreshold]);

	return (
		<>
			<div
				ref={parentRef}
				className={`${className ?? ''} print:hidden`}
				onScroll={handleScroll}
				style={{ overflow: 'auto', maxHeight: maxHeight ?? '100%' }}
				data-testid={testId}
				role="rowgroup"
				aria-rowcount={ariaRowcount ?? items.length}
			>
				<div
					style={{
						height: virtualizer.getTotalSize(),
						width: '100%',
						position: 'relative',
					}}
				>
					{virtualItems.map(virtualRow => (
						<div
							key={virtualRow.key}
							data-index={virtualRow.index}
							ref={virtualizer.measureElement}
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								width: '100%',
								transform: `translateY(${virtualRow.start}px)`,
							}}
							role="row"
							aria-rowindex={virtualRow.index + 1}
						>
							{renderItem(items[virtualRow.index], virtualRow.index)}
						</div>
					))}
				</div>
			</div>
			{/* Print-friendly fallback rendering all rows when printing */}
			<div className="hidden print:block" role="rowgroup" aria-rowcount={ariaRowcount ?? items.length}>
				{items.map((item, index) => (
					<div key={index} role="row" aria-rowindex={index + 1}>
						{renderItem(item, index)}
					</div>
				))}
			</div>
		</>
	);
}

export interface VirtualTableProps<T> extends VirtualListProps<T> {
	header?: React.ReactNode;
}

export function VirtualTable<T>({
	header,
	...props
}: VirtualTableProps<T>) {
	return (
		<div role="table" aria-rowcount={props['aria-rowcount'] ?? props.items.length}>
			{header}
			<VirtualList {...props} />
		</div>
	);
}
