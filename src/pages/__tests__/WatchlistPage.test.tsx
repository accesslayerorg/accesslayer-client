import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { Course } from '@/services/course.service';
import { useConnectedWallet, useWatchlist } from '@/hooks/useWatchlist';
import WatchlistPage from '@/pages/WatchlistPage';

const ADDRESS = '0xabc...';

vi.mock('@/components/common/CreatorCard', () => ({
	default: ({ creator }: { creator: { id: string; title: string } }) => (
		<article data-testid={`watchlist-card-${creator.id}`}>
			{creator.title}
		</article>
	),
}));

vi.mock('@/components/common/MarketplaceSidebar', () => ({
	default: () => <aside data-testid="marketplace-sidebar" />,
}));

function renderPage() {
	return render(
		<MemoryRouter>
			<WatchlistPage />
		</MemoryRouter>
	);
}

function makeCreator(id: string, title = `Creator ${id}`): Course {
	return {
		id,
		title,
		description: 'A test creator',
		price: 0.05,
		priceStroops: 500_000,
		creatorShareSupply: 100,
		instructorId: id,
		category: 'Art',
		level: 'BEGINNER',
	};
}

describe('WatchlistPage', () => {
	beforeEach(() => {
		window.localStorage.clear();
		useConnectedWallet.setState({ walletKey: ADDRESS });
		useWatchlist.setState({ bookmarksByWallet: {} });
	});

	it('shows an empty state with a link to the marketplace when watchlist is empty', () => {
		renderPage();

		expect(
			screen.getByRole('heading', { name: /your watchlist is empty/i })
		).toBeInTheDocument();
		expect(
			screen.getByRole('link', { name: /browse marketplace/i })
		).toHaveAttribute('href', '/');
		expect(screen.queryByTestId(/watchlist-card-/)).not.toBeInTheDocument();
	});

	it('renders a grid of the bookmarked creator key cards', () => {
		useWatchlist.getState().toggleBookmark(ADDRESS, makeCreator('1', 'Alpha'));
		useWatchlist.getState().toggleBookmark(ADDRESS, makeCreator('2', 'Beta'));

		renderPage();

		expect(screen.getByTestId('watchlist-card-1')).toHaveTextContent('Alpha');
		expect(screen.getByTestId('watchlist-card-2')).toHaveTextContent('Beta');
		expect(
			screen.queryByRole('heading', { name: /watchlist is empty/i })
		).not.toBeInTheDocument();
	});
});
