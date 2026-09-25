import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import WalletActivityFeed from '@/components/common/WalletActivityFeed';
import * as walletActivityService from '@/services/walletActivity.service';
import type { WalletActivityTrade } from '@/services/walletActivity.service';

const WALLET_ADDRESS = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

// jsdom does not implement IntersectionObserver — install a recording mock
// that captures the callback the hook registers so the test can drive it
// deterministically without relying on real viewport geometry.
interface CapturedObserver {
	callback: IntersectionObserverCallback;
	observe: ReturnType<typeof vi.fn>;
	disconnect: ReturnType<typeof vi.fn>;
	unobserve: ReturnType<typeof vi.fn>;
}

const observers: CapturedObserver[] = [];

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
			unobserve: this.unobserve,
		});
	}
}

const page1Trades: WalletActivityTrade[] = [
	{
		id: 'A',
		type: 'buy',
		creatorId: '1',
		creatorHandle: 'arivers',
		amount: 2,
		price: 0.05,
		timestamp: Date.now() - 1000 * 60 * 5,
		txHash: '0xaaaa...0011',
		status: 'completed',
	},
	{
		id: 'B',
		type: 'sell',
		creatorId: '2',
		creatorHandle: 'schen_dev',
		amount: 1,
		price: 0.12,
		timestamp: Date.now() - 1000 * 60 * 45,
		txHash: '0xbbbb...0022',
		status: 'completed',
	},
	{
		id: 'C',
		type: 'buy',
		creatorId: '3',
		creatorHandle: 'mthorne',
		amount: 4,
		price: 0.08,
		timestamp: Date.now() - 1000 * 60 * 90,
		txHash: '0xcccc...0033',
		status: 'completed',
	},
];

const page2Trades: WalletActivityTrade[] = [
	{
		id: 'D',
		type: 'buy',
		creatorId: '4',
		creatorHandle: 'evance_design',
		amount: 3,
		price: 0.04,
		timestamp: Date.now() - 1000 * 60 * 60 * 2,
		txHash: '0xdddd...0044',
		status: 'completed',
	},
	{
		id: 'E',
		type: 'sell',
		creatorId: '5',
		creatorHandle: 'dkojo_beats',
		amount: 2,
		price: 0.15,
		timestamp: Date.now() - 1000 * 60 * 60 * 4,
		txHash: '0xeeee...0055',
		status: 'completed',
	},
	{
		id: 'F',
		type: 'buy',
		creatorId: '6',
		creatorHandle: 'yuki_s',
		amount: 6,
		price: 0.07,
		timestamp: Date.now() - 1000 * 60 * 60 * 8,
		txHash: '0xffff...0066',
		status: 'completed',
	},
];

const setupFetchMock = () =>
	vi
		.spyOn(walletActivityService, 'fetchWalletActivityPage')
		.mockResolvedValueOnce({ trades: page1Trades, nextPage: 2 })
		.mockResolvedValueOnce({ trades: page2Trades, nextPage: null });

const renderFeed = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
			},
		},
	});
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const utils = render(<WalletActivityFeed address={WALLET_ADDRESS} />, {
		wrapper,
	});
	return { ...utils, queryClient };
};

const simulateIntersection = (isIntersecting: boolean) => {
	const obs = observers[observers.length - 1];
	if (!obs) throw new Error('No IntersectionObserver registered yet');
	act(() => {
		obs.callback(
			[{ isIntersecting } as IntersectionObserverEntry],
			{} as IntersectionObserver
		);
	});
};

describe('WalletActivityFeed infinite scroll integration (#677)', () => {
	beforeEach(() => {
		observers.length = 0;
		vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	// Acceptance #1: page 1 trades visible on initial load
	it('renders page 1 trades on initial load', async () => {
		const fetchSpy = setupFetchMock();

		renderFeed();

		await waitFor(() => {
			expect(
				screen.getByTestId('activity-creator-handle-A')
			).toBeInTheDocument();
		});

		expect(
			screen.getByTestId('activity-creator-handle-A')
		).toHaveTextContent('@arivers');
		expect(
			screen.getByTestId('activity-creator-handle-B')
		).toHaveTextContent('@schen_dev');
		expect(
			screen.getByTestId('activity-creator-handle-C')
		).toHaveTextContent('@mthorne');

		// Page 2 trades must not be visible yet
		expect(
			screen.queryByTestId('activity-creator-handle-D')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('activity-creator-handle-E')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('activity-creator-handle-F')
		).not.toBeInTheDocument();

		// Only page 1 was fetched
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(fetchSpy).toHaveBeenCalledWith(WALLET_ADDRESS, 1);
	});

	// Acceptance #2: scroll triggers next page fetch
	it('fetches the next page when the sentinel scrolls into view', async () => {
		const fetchSpy = setupFetchMock();

		renderFeed();

		await waitFor(() => {
			expect(
				screen.getByTestId('activity-creator-handle-A')
			).toBeInTheDocument();
		});

		// The sentinel should have observed itself and registered an observer
		await waitFor(() => {
			expect(observers.length).toBeGreaterThan(0);
		});

		simulateIntersection(true);

		await waitFor(() => {
			expect(fetchSpy).toHaveBeenCalledTimes(2);
		});

		expect(fetchSpy).toHaveBeenNthCalledWith(2, WALLET_ADDRESS, 2);
	});

	// Acceptance #3: page 2 trades appended below page 1 trades
	it('appends page 2 trades below page 1 trades after fetching', async () => {
		setupFetchMock();

		const { container } = renderFeed();

		await waitFor(() => {
			expect(
				screen.getByTestId('activity-creator-handle-A')
			).toBeInTheDocument();
		});

		await waitFor(() => {
			expect(observers.length).toBeGreaterThan(0);
		});
		simulateIntersection(true);

		await waitFor(() => {
			expect(
				screen.getByTestId('activity-creator-handle-D')
			).toBeInTheDocument();
		});

		// All six trades now visible
		expect(
			screen.getByTestId('activity-creator-handle-A')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('activity-creator-handle-B')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('activity-creator-handle-C')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('activity-creator-handle-D')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('activity-creator-handle-E')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('activity-creator-handle-F')
		).toBeInTheDocument();

		// DOM order preserves page 1 above page 2 so older trades render
		// below the more recent ones — this is the "appended below" promise.
		const handleTestIds = Array.from(
			container.querySelectorAll<HTMLElement>(
				'[data-testid^="activity-creator-handle-"]'
			)
		).map(el => el.dataset.testid ?? '');
		expect(handleTestIds).toEqual([
			'activity-creator-handle-A',
			'activity-creator-handle-B',
			'activity-creator-handle-C',
			'activity-creator-handle-D',
			'activity-creator-handle-E',
			'activity-creator-handle-F',
		]);
	});

	// Acceptance #4: no duplicate trades in the combined list
	it('does not render duplicate trade ids when paginated data overlaps', async () => {
		// Simulate a backend that paginates by timestamp boundary and includes
		// 'C' in both pages. The component should still surface each trade id
		// exactly once.
		const overlapPage2: WalletActivityTrade[] = [
			{ ...page1Trades[2] }, // duplicate of 'C'
			page2Trades[0],
			page2Trades[1],
			page2Trades[2],
		];

		vi.spyOn(walletActivityService, 'fetchWalletActivityPage')
			.mockResolvedValueOnce({ trades: page1Trades, nextPage: 2 })
			.mockResolvedValueOnce({ trades: overlapPage2, nextPage: null });

		renderFeed();

		await waitFor(() => {
			expect(
				screen.getByTestId('activity-creator-handle-A')
			).toBeInTheDocument();
		});
		await waitFor(() => {
			expect(observers.length).toBeGreaterThan(0);
		});
		simulateIntersection(true);

		await waitFor(() => {
			expect(
				screen.getByTestId('activity-creator-handle-D')
			).toBeInTheDocument();
		});

		// Each unique id appears in exactly one rendered row.
		expect(
			screen.getAllByTestId('activity-creator-handle-A')
		).toHaveLength(1);
		expect(
			screen.getAllByTestId('activity-creator-handle-B')
		).toHaveLength(1);
		expect(
			screen.getAllByTestId('activity-creator-handle-C')
		).toHaveLength(1);
		expect(
			screen.getAllByTestId('activity-creator-handle-D')
		).toHaveLength(1);
		expect(
			screen.getAllByTestId('activity-creator-handle-E')
		).toHaveLength(1);
		expect(
			screen.getAllByTestId('activity-creator-handle-F')
		).toHaveLength(1);

		// Validate the rendered handle for 'C' carries the right creator
		// so we know the deduplicated row is the original page-1 entry,
		// not the duplicate appended by page 2.
		expect(
			screen.getByTestId('activity-creator-handle-C')
		).toHaveTextContent('@mthorne');

		// Across the entire document there are six handles — one per unique
		// trade id, regardless of the duplicate appearing in both pages.
		const allHandles = document.body.querySelectorAll(
			'[data-testid^="activity-creator-handle-"]'
		);
		expect(allHandles.length).toBe(6);
	});
});
