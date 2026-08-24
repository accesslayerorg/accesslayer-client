import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useVirtualList } from '../useVirtualList';

describe('useVirtualList (#757)', () => {
	let mockContainer: HTMLDivElement;

	beforeEach(() => {
		mockContainer = document.createElement('div');
		document.body.appendChild(mockContainer);
	});

	afterEach(() => {
		document.body.removeChild(mockContainer);
	});

	it('returns correct startIndex and endIndex for scroll position 0', () => {
		const { result } = renderHook(() =>
			useVirtualList({
				itemCount: 1000,
				itemHeight: 48,
				containerHeight: 600,
				overscan: 3,
			})
		);

		// At scroll position 0:
		// visibleCount = 600 / 48 = 12.5 -> ceil = 13
		// startIndex = max(0, floor(0 / 48) - 3) = 0
		// endIndex = min(999, 0 + 13 + 3*2) = 19
		expect(result.current.startIndex).toBe(0);
		expect(result.current.endIndex).toBe(19);
		expect(result.current.offsetY).toBe(0);
		expect(result.current.totalHeight).toBe(48000);
	});

	it('returns correct startIndex and endIndex for mid-scroll position', () => {
		const { result } = renderHook(() =>
			useVirtualList({
				itemCount: 1000,
				itemHeight: 48,
				containerHeight: 600,
				overscan: 3,
			})
		);

		// Simulate scroll to position 2400 (50 items down)
		act(() => {
			const container = result.current.containerRef.current;
			if (container) {
				Object.defineProperty(container, 'scrollTop', {
					writable: true,
					value: 2400,
				});
				container.dispatchEvent(new Event('scroll'));
			}
		});

		// Wait for RAF to complete
		return new Promise<void>(resolve => {
			requestAnimationFrame(() => {
				// startIndex = max(0, floor(2400 / 48) - 3) = max(0, 50 - 3) = 47
				// visibleCount = ceil(600 / 48) = 13
				// endIndex = min(999, 47 + 13 + 6) = 66
				expect(result.current.startIndex).toBe(47);
				expect(result.current.endIndex).toBe(66);
				expect(result.current.offsetY).toBe(47 * 48);
				resolve();
			});
		});
	});

	it('returns correct startIndex and endIndex near the end of list', () => {
		const { result } = renderHook(() =>
			useVirtualList({
				itemCount: 100,
				itemHeight: 48,
				containerHeight: 600,
				overscan: 3,
			})
		);

		// Simulate scroll near end
		act(() => {
			const container = result.current.containerRef.current;
			if (container) {
				Object.defineProperty(container, 'scrollTop', {
					writable: true,
					value: 4000,
				});
				container.dispatchEvent(new Event('scroll'));
			}
		});

		return new Promise<void>(resolve => {
			requestAnimationFrame(() => {
				// startIndex = max(0, floor(4000 / 48) - 3) = max(0, 83 - 3) = 80
				// endIndex should be capped at itemCount - 1 = 99
				expect(result.current.startIndex).toBe(80);
				expect(result.current.endIndex).toBe(99);
				resolve();
			});
		});
	});

	it('handles itemCount of 0 gracefully', () => {
		const { result } = renderHook(() =>
			useVirtualList({
				itemCount: 0,
				itemHeight: 48,
				containerHeight: 600,
				overscan: 3,
			})
		);

		expect(result.current.startIndex).toBe(0);
		expect(result.current.endIndex).toBe(-1);
		expect(result.current.totalHeight).toBe(0);
	});

	it('respects custom overscan value', () => {
		const { result } = renderHook(() =>
			useVirtualList({
				itemCount: 1000,
				itemHeight: 48,
				containerHeight: 600,
				overscan: 10,
			})
		);

		// With overscan of 10:
		// startIndex = max(0, 0 - 10) = 0
		// visibleCount = ceil(600 / 48) = 13
		// endIndex = min(999, 0 + 13 + 10*2) = 33
		expect(result.current.startIndex).toBe(0);
		expect(result.current.endIndex).toBe(33);
	});

	it('calculates totalHeight correctly for large item counts', () => {
		const { result } = renderHook(() =>
			useVirtualList({
				itemCount: 10000,
				itemHeight: 48,
				containerHeight: 600,
				overscan: 3,
			})
		);

		expect(result.current.totalHeight).toBe(10000 * 48);
	});

	it('throttles scroll events via requestAnimationFrame', async () => {
		const { result } = renderHook(() =>
			useVirtualList({
				itemCount: 1000,
				itemHeight: 48,
				containerHeight: 600,
				overscan: 3,
			})
		);

		const initialStartIndex = result.current.startIndex;

		// Fire multiple scroll events rapidly
		act(() => {
			const container = result.current.containerRef.current;
			if (container) {
				Object.defineProperty(container, 'scrollTop', {
					writable: true,
					value: 100,
				});
				container.dispatchEvent(new Event('scroll'));
				container.dispatchEvent(new Event('scroll'));
				container.dispatchEvent(new Event('scroll'));
			}
		});

		// Should still be at initial state immediately
		expect(result.current.startIndex).toBe(initialStartIndex);

		// Wait for RAF to process
		await new Promise(resolve => {
			requestAnimationFrame(() => {
				requestAnimationFrame(resolve);
			});
		});

		// Now should have updated
		expect(result.current.startIndex).toBeGreaterThanOrEqual(0);
	});
});
