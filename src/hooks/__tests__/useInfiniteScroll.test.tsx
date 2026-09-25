import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const observers: {
	callback: IntersectionObserverCallback;
	observe: ReturnType<typeof vi.fn>;
	disconnect: ReturnType<typeof vi.fn>;
}[] = [];

beforeEach(() => {
	observers.length = 0;

	class MockIntersectionObserver {
		callback: IntersectionObserverCallback;
		observe = vi.fn();
		disconnect = vi.fn();
		unobserve = vi.fn();
		constructor(cb: IntersectionObserverCallback) {
			this.callback = cb;
			observers.push({
				callback: cb,
				observe: this.observe,
				disconnect: this.disconnect,
			});
		}
	}

	vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterEach(() => {
	vi.restoreAllMocks();
});

function simulateIntersection(isIntersecting: boolean) {
	const obs = observers[observers.length - 1];
	act(() => {
		obs.callback(
			[{ isIntersecting } as IntersectionObserverEntry],
			{} as IntersectionObserver,
		);
	});
}

function TestComponent({
	enabled,
	hasMore,
	onLoadMore,
}: {
	enabled: boolean;
	hasMore: boolean;
	onLoadMore: () => void;
}) {
	const sentinelRef = useInfiniteScroll<HTMLDivElement>({ enabled, hasMore, onLoadMore });
	return <div data-testid="sentinel" ref={sentinelRef} />;
}

describe('useInfiniteScroll', () => {
	it('calls onLoadMore when the observed element intersects', () => {
		const onLoadMore = vi.fn();
		render(<TestComponent enabled={true} hasMore={true} onLoadMore={onLoadMore} />);

		simulateIntersection(true);

		expect(onLoadMore).toHaveBeenCalledTimes(1);
	});

	it('does not call onLoadMore when the element is not intersecting', () => {
		const onLoadMore = vi.fn();
		render(<TestComponent enabled={true} hasMore={true} onLoadMore={onLoadMore} />);

		simulateIntersection(false);

		expect(onLoadMore).not.toHaveBeenCalled();
	});

	it('disconnects the observer on unmount', () => {
		const { unmount } = render(
			<TestComponent enabled={true} hasMore={true} onLoadMore={vi.fn()} />,
		);

		unmount();

		expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
	});

	it('does not create an observer when enabled is false', () => {
		render(<TestComponent enabled={false} hasMore={true} onLoadMore={vi.fn()} />);

		expect(observers).toHaveLength(0);
	});

	it('does not create an observer when hasMore is false', () => {
		render(<TestComponent enabled={true} hasMore={false} onLoadMore={vi.fn()} />);

		expect(observers).toHaveLength(0);
	});
});
