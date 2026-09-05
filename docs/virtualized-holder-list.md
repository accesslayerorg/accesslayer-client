# Virtualized Holder List

## Overview

The `VirtualizedHolderList` component implements a high-performance virtualized list for displaying key holders. It supports 10,000+ holders without layout thrash by rendering only visible rows in the viewport.

## Features

- **Virtual Scrolling**: Only renders visible rows plus overscan buffer
- **Infinite Loading**: Automatically fetches more data as user scrolls
- **Scroll Restoration**: Maintains scroll position across navigation
- **Performance Optimized**: 60fps scrolling for 10,000+ items
- **Dynamic Recalculation**: Updates ranks and share percentages on-the-fly

## Usage

```tsx
import { VirtualizedHolderList } from '@/components/common/VirtualizedHolderList';

function CreatorPage() {
	return (
		<VirtualizedHolderList
			creatorId="creator-address-here"
			containerHeight={600}
		/>
	);
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `creatorId` | `string` | The creator's wallet address or ID |
| `containerHeight` | `number` | Height of the scrollable container in pixels |

## Architecture

### 1. Virtual List Engine (`useVirtualList`)

The core virtualization hook that manages which rows to render:

```typescript
const { startIndex, endIndex, offsetY, totalHeight, containerRef } = useVirtualList({
	itemCount: 10000,
	itemHeight: 48,
	containerHeight: 600,
	overscan: 5,
});
```

**Key Features:**
- Throttles scroll events via `requestAnimationFrame` (max 1 update per frame)
- Uses `IntersectionObserver` to pause when off-screen
- Passive scroll listeners for optimal performance
- Calculates visible range with overscan buffer

### 2. Data Fetching (`useHolders`)

Manages paginated data fetching and caching:

```typescript
const {
	holders,
	totalCount,
	holderMap,
	fetchNextPage,
	hasNextPage,
} = useHolders(creatorId);
```

**Key Features:**
- Uses React Query's `useInfiniteQuery` for cursor-based pagination
- Fetches 50 items per page
- Auto-triggers next page when within 20 rows of end
- Recalculates ranks and share percentages for all loaded data
- Maintains a flat `Map<index, HolderRow>` for O(1) lookups

### 3. Performance Characteristics

| Metric | Target | Implementation |
|--------|--------|----------------|
| Max DOM nodes | ≤ (containerHeight / itemHeight) + 2 * overscan + 5 | Bounded by virtualization |
| Scroll performance | 100 events in <16ms | RAF throttling + passive listeners |
| Recalculation time | <5ms for 10,000 rows | Float64Array for numerical operations |
| Frame rate | 60fps for 10,000+ rows | Constant DOM node count |

### 4. Scroll Restoration

Scroll position is persisted to `sessionStorage` keyed by `holder-list:{creatorWallet}`:

```typescript
// Save on scroll
sessionStorage.setItem(storageKey, scrollTop.toString());

// Restore on mount
const savedScroll = sessionStorage.getItem(storageKey);
if (savedScroll) {
	containerRef.current.scrollTop = parseInt(savedScroll, 10);
}
```

## API Integration

The component expects the following API endpoint:

```
GET /creators/:creatorId/holders?limit=50&cursor=<cursor>
```

**Response Format:**

```typescript
interface HolderListResponse {
	holders: HolderRow[];
	total: number;
	nextCursor?: string;
	hasMore: boolean;
}

interface HolderRow {
	address: string;
	keyCount: number;
	totalValue: number;
	sharePercentage: number;
	rank: number;
	joinedAt: string;
}
```

## Testing

### Unit Tests

Located in `src/hooks/__tests__/useVirtualList.test.ts`:

- Validates `startIndex` and `endIndex` calculation for various scroll positions
- Tests overscan buffer functionality
- Verifies RAF throttling behavior

### Performance Tests

Located in `src/components/common/__tests__/VirtualizedHolderList.performance.test.tsx`:

1. **DOM Node Count**: Verifies max DOM nodes stay bounded for 10,000 rows
2. **Scroll Performance**: 100 scroll events processed in <16ms
3. **Recalculation Speed**: Rank/share updates complete in <5ms for 10,000 rows
4. **Auto-fetch**: Next page triggered within 20 rows of end
5. **Skeleton Rows**: Loading states shown in overscan zone

### Scroll Restoration Tests

Located in `src/components/common/__tests__/VirtualizedHolderList.scrollRestoration.test.tsx`:

1. Restores saved scroll position on mount
2. Persists scroll position during scrolling
3. Uses creator-specific storage keys
4. Handles missing saved positions gracefully

## Performance Considerations

### Why Fixed Height?

Each row has a fixed height of **48px**. This enables:
- O(1) position calculation: `top = index * itemHeight`
- Predictable total height: `totalHeight = itemCount * itemHeight`
- No layout thrash from dynamic heights

### Why No External Library?

We implemented virtualization from scratch to:
- Minimize bundle size (no react-window or react-virtualized)
- Fine-tune performance for our specific use case
- Avoid library-specific quirks and limitations
- Maintain full control over the implementation

### Memory Management

The component uses several strategies to minimize memory usage:

1. **Flat Map Cache**: `Map<index, HolderRow>` for O(1) lookups without nested arrays
2. **Float64Array**: Used internally for share percentage calculations
3. **React Query Cache**: Automatic garbage collection after 5 minutes
4. **Limited DOM Nodes**: Only visible + overscan rows exist in DOM

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires:
- `IntersectionObserver` API
- `requestAnimationFrame` API
- `sessionStorage` API

## Future Enhancements

Potential improvements for future iterations:

1. **Variable Row Heights**: Support for dynamic row heights with measurement
2. **Horizontal Scrolling**: Extend to support horizontal virtualization
3. **Keyboard Navigation**: Arrow key navigation with focus management
4. **Row Selection**: Multi-select with virtualized selection state
5. **Sort/Filter**: Client-side sorting without re-fetching
6. **Export**: CSV/JSON export functionality for large datasets

## Related Components

- `HolderRow`: Individual row component
- `HolderRowSkeleton`: Loading state for rows
- `useVirtualList`: Core virtualization hook
- `useHolders`: Data fetching and caching hook

## Issue Reference

This component was implemented as part of issue #757.
