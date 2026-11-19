import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import WalletActivityFeed from '@/components/common/WalletActivityFeed';

/**
 * Mobile layout tests for the activity filter tab rail (#1055).
 *
 * Acceptance criteria covered:
 *  - Analytics/filter tabs scroll horizontally on mobile without overflow
 *    clipping (no-scrollbar utility + overflow-x-auto rail).
 *  - All tabs keep ≥ 44px tap targets on mobile.
 *  - Tabs remain keyboard reachable (no roving tabindex was introduced).
 */

const WALLET_ADDRESS =
	'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

vi.mock('@/services/walletActivity.service', async importOriginal => {
	const actual =
		await importOriginal<typeof import('@/services/walletActivity.service')>();
	return {
		...actual,
		fetchWalletActivityPage: vi
			.fn()
			.mockResolvedValue({ trades: [], nextPage: null }),
	};
});

const renderFeed = () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<WalletActivityFeed address={WALLET_ADDRESS} />
		</QueryClientProvider>
	);
};

describe('WalletActivityFeed filter tabs mobile layout (#1055)', () => {
	beforeEach(() => {
		// jsdom lacks IntersectionObserver; the feed uses it for infinite scroll.
		class NoopIntersectionObserver {
			observe = vi.fn();
			disconnect = vi.fn();
			unobserve = vi.fn();
		}
		vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it('renders every filter tab in the rail', () => {
		renderFeed();

		for (const value of [
			'all',
			'buy',
			'sell',
			'stake',
			'unstake',
			'claim',
			'governance_vote',
		]) {
			expect(
				screen.getByTestId(`activity-filter-${value}`)
			).toBeInTheDocument();
		}
	});

	it('uses a horizontally scrollable, scrollbar-free rail on mobile', () => {
		renderFeed();

		const tablist = screen.getByRole('tablist', {
			name: 'Filter activity by type',
		});

		// Overflow-x scroll + hidden scrollbar chrome.
		expect(tablist).toHaveClass('overflow-x-auto');
		expect(tablist).toHaveClass('no-scrollbar');
		// Negative margin + padding let pills scroll edge-to-edge without the
		// card's padding clipping them at 375px.
		expect(tablist).toHaveClass('-mx-4');
		expect(tablist).toHaveClass('px-4');
		// Tabs must not wrap or shrink below their content — they scroll instead.
		expect(tablist).toHaveClass('sm:flex-wrap');
	});

	it('keeps every tab pill at a ≥44px tap target on mobile', () => {
		renderFeed();

		for (const value of ['all', 'buy', 'sell', 'stake']) {
			const pill = screen.getByTestId(`activity-filter-${value}`);
			// py-2.5 + border + text on a mobile pill exceeds 44px.
			expect(pill).toHaveClass('py-2.5');
			// Pills never shrink in the scroll rail.
			expect(pill).toHaveClass('shrink-0');
		}
	});

	it('keeps tabs keyboard reachable without roving tabindex', () => {
		renderFeed();

		for (const value of ['all', 'buy', 'sell']) {
			expect(screen.getByTestId(`activity-filter-${value}`)).not.toHaveAttribute(
				'tabindex',
				'-1'
			);
		}
	});
});
