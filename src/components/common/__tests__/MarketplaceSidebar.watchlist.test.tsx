import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { Course } from '@/services/course.service';
import { useConnectedWallet, useWatchlist } from '@/hooks/useWatchlist';
import MarketplaceSidebar from '@/components/common/MarketplaceSidebar';

const ADDRESS = '0xabc...';

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

function renderSidebar() {
	return render(
		<MemoryRouter>
			<MarketplaceSidebar />
		</MemoryRouter>
	);
}

describe('MarketplaceSidebar watchlist badge', () => {
	beforeEach(() => {
		window.localStorage.clear();
		useConnectedWallet.setState({ walletKey: ADDRESS });
		useWatchlist.setState({ bookmarksByWallet: {} });
	});

	it('renders a watchlist nav link without a badge when the watchlist is empty', () => {
		renderSidebar();

		const link = screen.getByRole('link', { name: /watchlist, 0 saved/i });
		expect(link).toBeInTheDocument();
		expect(screen.queryByTestId('watchlist-badge')).not.toBeInTheDocument();
	});

	it('shows the bookmark count as a badge on the watchlist icon', () => {
		useWatchlist.getState().toggleBookmark(ADDRESS, makeCreator('1'));
		useWatchlist.getState().toggleBookmark(ADDRESS, makeCreator('2'));
		useWatchlist.getState().toggleBookmark(ADDRESS, makeCreator('3'));

		renderSidebar();

		expect(
			screen.getByRole('link', { name: /watchlist, 3 saved keys/i })
		).toBeInTheDocument();
		const badge = screen.getByTestId('watchlist-badge');
		expect(badge).toHaveTextContent('3');
	});

	it('links to the /watchlist route', () => {
		renderSidebar();

		const link = screen.getByRole('link', { name: /watchlist/i });
		expect(link.getAttribute('href')).toBe('/watchlist');
	});
});
