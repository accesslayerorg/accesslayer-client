import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import TradeHistoryTable from '@/components/common/TradeHistoryTable';
import type { Trade } from '@/services/tradeHistory.service';

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

const mockUseTradeHistory = vi.fn();

vi.mock('@/hooks/useWallet', () => ({
	useTradeHistory: (...args: unknown[]) => mockUseTradeHistory(...args),
}));

const WALLET = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

const trade: Trade = {
	id: 'trade-1',
	keyName: 'Alpha Key',
	tradeType: 'Buy',
	quantity: 2,
	pricePerKey: 1.5,
	timestamp: Date.now(),
	transactionHash: null,
};

function simulateIntersection(isIntersecting: boolean) {
	const obs = observers[observers.length - 1];
	act(() => {
		obs.callback(
			[{ isIntersecting } as IntersectionObserverEntry],
			{} as IntersectionObserver
		);
	});
}

function mockHistory({ hasNextPage }: { hasNextPage: boolean }) {
	const fetchNextPage = vi.fn();
	mockUseTradeHistory.mockReturnValue({
		data: {
			pages: [
				{ trades: [trade], nextCursor: hasNextPage ? 'cursor-2' : null },
			],
		},
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage: false,
		isLoading: false,
		isError: false,
	});
	return fetchNextPage;
}

describe('TradeHistoryTable — cursor infinite scroll (#921)', () => {
	it('mounts an intersection sentinel and loads the next page on scroll', () => {
		const fetchNextPage = mockHistory({ hasNextPage: true });

		render(<TradeHistoryTable walletAddress={WALLET} infiniteScroll />);

		expect(
			screen.getByTestId('trade-history-load-more-sentinel')
		).toBeInTheDocument();
		expect(observers).toHaveLength(1);

		simulateIntersection(true);

		expect(fetchNextPage).toHaveBeenCalledTimes(1);
	});

	it('keeps the Load More button as a manual fallback in infinite-scroll mode', () => {
		mockHistory({ hasNextPage: true });

		render(<TradeHistoryTable walletAddress={WALLET} infiniteScroll />);

		expect(screen.getByTestId('trade-history-load-more')).toBeInTheDocument();
	});

	it('does not mount a sentinel in the default Load More mode', () => {
		mockHistory({ hasNextPage: true });

		render(<TradeHistoryTable walletAddress={WALLET} />);

		expect(
			screen.queryByTestId('trade-history-load-more-sentinel')
		).not.toBeInTheDocument();
		expect(observers).toHaveLength(0);
		expect(screen.getByTestId('trade-history-load-more')).toBeInTheDocument();
	});

	it('hides the sentinel when no more pages exist', () => {
		mockHistory({ hasNextPage: false });

		render(<TradeHistoryTable walletAddress={WALLET} infiniteScroll />);

		expect(
			screen.queryByTestId('trade-history-load-more-sentinel')
		).not.toBeInTheDocument();
		expect(observers).toHaveLength(0);
	});
});
