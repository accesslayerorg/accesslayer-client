/**
 * Integration tests for the marketplace listing page (#918).
 *
 * Covers the acceptance criteria: grid of creator keys with live bonding-curve
 * prices, sort + supply-tier filtering that works client-side (no refetch),
 * 30s polling wiring, empty states, and loading skeletons.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import MarketplacePage from '@/pages/MarketplacePage';
import { useInfiniteCreatorMarketplace } from '@/hooks/useInfiniteCreatorMarketplace';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { Course } from '@/services/course.service';

vi.mock('@/hooks/useInfiniteCreatorMarketplace');
vi.mock('@/hooks/useInfiniteScroll');

vi.mock('@/components/common/CreatorCard', async () => {
	const React = await import('react');
	return {
		default: ({
			creator,
			isPriceRefreshing = false,
		}: {
			creator: { id: string; title: string };
			isPriceRefreshing?: boolean;
		}) =>
			React.createElement(
				'article',
				{
					'aria-label': `Creator ${creator.title}`,
					'data-price-refreshing': isPriceRefreshing ? 'true' : 'false',
				},
				creator.title
			),
	};
});

// StickyFilterBar reads `window.matchMedia` to decide between its mobile
// bottom-sheet and inline desktop filter layout; jsdom has no matchMedia so a
// desktop-style mock keeps the two <select>s rendered inline (single DOM copy).
beforeEach(() => {
	const mql = {
		matches: false,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	};
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockReturnValue(mql),
	});
});

const mockUseInfiniteCreatorMarketplace = vi.mocked(
	useInfiniteCreatorMarketplace
);
const mockUseInfiniteScroll = vi.mocked(useInfiniteScroll);

function makeCreator(id: string, overrides: Partial<Course> = {}): Course {
	return {
		id,
		title: `Creator ${id}`,
		description: 'desc',
		price: 0.1,
		instructorId: id,
		category: 'Art',
		level: 'BEGINNER',
		...overrides,
	};
}

const alice = makeCreator('alice', {
	priceStroops: 3_000_000,
	creatorShareSupply: 120,
	volume24h: 90,
});
const bob = makeCreator('bob', {
	priceStroops: 1_000_000,
	creatorShareSupply: 50,
	volume24h: 30,
});
const carol = makeCreator('carol', {
	priceStroops: 2_000_000,
	creatorShareSupply: 750,
	volume24h: 60,
});

const baseHookReturn = {
	creators: [] as Course[],
	hasMore: false,
	isLoadingFirstPage: false,
	isFetchingNextPage: false,
	isRefreshing: false,
	fetchNextPage: vi.fn(),
	refetch: vi.fn(),
	error: null as Error | null,
};

function renderPage(initialEntries = ['/marketplace']) {
	return render(
		<MemoryRouter initialEntries={initialEntries}>
			<MarketplacePage />
		</MemoryRouter>
	);
}

function articleLabels(): string[] {
	return screen
		.getAllByRole('article')
		.map(node => node.getAttribute('aria-label') ?? '');
}

describe('MarketplacePage (#918)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseInfiniteScroll.mockReturnValue({ current: null });
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			fetchNextPage: vi.fn(),
			refetch: vi.fn(),
		});
	});

	it('requests paged creator keys and wires 30s live-price polling', () => {
		renderPage();

		expect(mockUseInfiniteCreatorMarketplace).toHaveBeenCalledWith(
			{ limit: 12 },
			{ pollIntervalMs: 30_000 }
		);
	});

	it('shows the loading skeleton while the first page loads', () => {
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			isLoadingFirstPage: true,
		});

		renderPage();

		expect(screen.getByTestId('marketplace-loading-skeleton')).toBeInTheDocument();
		expect(screen.queryAllByRole('article')).toHaveLength(0);
		expect(screen.getByTestId('marketplace-poll-status')).toHaveTextContent(
			'Prices refresh every 30s'
		);
	});

	it('renders every creator key in the results grid', () => {
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			creators: [alice, bob, carol],
		});

		renderPage();

		// All three cards present; default sort is volume_desc.
		expect(articleLabels()).toEqual([
			'Creator Creator alice',
			'Creator Creator carol',
			'Creator Creator bob',
		]);
	});

	it('sorts by price client-side without triggering a refetch', () => {
		const fetchNextPage = vi.fn();
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			creators: [alice, bob, carol],
			fetchNextPage,
		});

		renderPage();

		// Default (volume_desc) orders by 24h volume, highest first.
		expect(articleLabels()).toEqual([
			'Creator Creator alice',
			'Creator Creator carol',
			'Creator Creator bob',
		]);

		fireEvent.change(screen.getByTestId('marketplace-sort-select'), {
			target: { value: 'price_asc' },
		});

		// Cheapest first, and no extra page was fetched for the re-sort.
		expect(articleLabels()).toEqual([
			'Creator Creator bob',
			'Creator Creator carol',
			'Creator Creator alice',
		]);
		expect(fetchNextPage).not.toHaveBeenCalled();
		expect(screen.queryByTestId('marketplace-loading-skeleton')).not.toBeInTheDocument();
	});

	it('filters by supply milestone tier client-side', () => {
		const fetchNextPage = vi.fn();
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			creators: [alice, bob, carol],
			fetchNextPage,
		});

		renderPage();

		fireEvent.change(screen.getByTestId('marketplace-supply-tier-select'), {
			target: { value: 'early' },
		});

		// Only bob (supply 50) is in the Early tier.
		expect(articleLabels()).toEqual(['Creator Creator bob']);
		expect(fetchNextPage).not.toHaveBeenCalled();

		fireEvent.change(screen.getByTestId('marketplace-supply-tier-select'), {
			target: { value: 'all' },
		});

		expect(articleLabels()).toHaveLength(3);
	});

	it('shows the empty state when the marketplace has no keys at all', () => {
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			creators: [],
		});

		renderPage();

		expect(screen.getByRole('status', { name: 'No creators available' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /browse all creators/i })).toBeInTheDocument();
	});

	it('shows a no-results state when filters match nothing, and reset restores the list', async () => {
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			creators: [alice],
		});

		renderPage();

		fireEvent.change(screen.getByTestId('search-bar-input'), {
			target: { value: 'zzzz' },
		});

		await waitFor(() => {
			expect(screen.getByText('No creators found')).toBeInTheDocument();
		});
		expect(screen.queryAllByRole('article')).toHaveLength(0);

		fireEvent.click(screen.getByRole('button', { name: /reset search/i }));

		await waitFor(() => {
			expect(articleLabels()).toEqual(['Creator Creator alice']);
		});
	});

	it('shows a retry empty state when the listing fails to load', () => {
		const refetch = vi.fn();
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			creators: [],
			error: new Error('network down'),
			refetch,
		});

		renderPage();

		expect(screen.getByText("Couldn't load the marketplace")).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: /try again/i }));
		expect(refetch).toHaveBeenCalledTimes(1);
	});

	it('renders a price-refreshing indicator while background polling refetches', () => {
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			creators: [alice],
			isRefreshing: true,
		});

		renderPage();

		expect(screen.getByTestId('marketplace-poll-status')).toHaveTextContent(
			'Refreshing live prices…'
		);
		expect(screen.getByRole('article')).toHaveAttribute(
			'data-price-refreshing',
			'true'
		);
	});

	it('fetches the next page from the load-more control and sentinel', () => {
		const fetchNextPage = vi.fn();
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			creators: [alice],
			hasMore: true,
			fetchNextPage,
		});

		renderPage();

		expect(screen.getByTestId('marketplace-sentinel')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: /load more creators/i }));
		expect(fetchNextPage).toHaveBeenCalledTimes(1);

		// The scroll hook is wired to call fetchNextPage when the sentinel
		// enters the viewport.
		const scrollOptions = mockUseInfiniteScroll.mock.calls.at(-1)![0];
		expect(scrollOptions.enabled).toBe(true);
		expect(scrollOptions.hasMore).toBe(true);
		scrollOptions.onLoadMore();
		expect(fetchNextPage).toHaveBeenCalledTimes(2);
	});

	it('pre-applies sort filter from URL search params (e.g. ?sort=newest)', () => {
		const newestCreator = makeCreator('newest', {
			createdAt: '2026-06-01T00:00:00Z',
		});
		const olderCreator = makeCreator('older', {
			createdAt: '2026-01-01T00:00:00Z',
		});

		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			creators: [olderCreator, newestCreator],
		});

		renderPage(['/marketplace?sort=newest']);

		const select = screen.getByTestId('marketplace-sort-select') as HTMLSelectElement;
		expect(select.value).toBe('newest');
		expect(articleLabels()).toEqual([
			'Creator Creator newest',
			'Creator Creator older',
		]);
	});
});