import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import React from 'react';
import DiscoveryPage from '@/pages/DiscoveryPage';
import { useKeyDiscovery } from '@/hooks/useKeyDiscovery';
import type { Course } from '@/services/course.service';

vi.mock('@/hooks/useKeyDiscovery');

const mockUseKeyDiscovery = vi.mocked(useKeyDiscovery);

function makeCreator(id: string, overrides: Partial<Course> = {}): Course {
	return {
		id,
		title: `Creator ${id}`,
		description: `Description for ${id}`,
		price: 10,
		priceStroops: 100_000_000,
		instructorId: `inst_${id}`,
		category: 'Art',
		level: 'BEGINNER',
		volume24h: 10,
		change24h: 5.5,
		createdAt: '2026-01-01T00:00:00Z',
		...overrides,
	};
}

const baseHookReturn = {
	trendingKeys: [] as Course[],
	newListings: [] as Course[],
	isLoading: false,
	isRefreshing: false,
	error: null as Error | null,
	refetch: vi.fn(),
};

function renderPage() {
	return render(
		<MemoryRouter initialEntries={['/discovery']}>
			<DiscoveryPage />
		</MemoryRouter>
	);
}

describe('DiscoveryPage (#937)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseKeyDiscovery.mockReturnValue({
			...baseHookReturn,
		});
	});

	it('configures 60s background polling interval', () => {
		renderPage();

		expect(mockUseKeyDiscovery).toHaveBeenCalledWith({
			pollIntervalMs: 60_000,
		});
		expect(screen.getByTestId('discovery-poll-status')).toHaveTextContent(
			'Data refreshes every 60s'
		);
	});

	it('shows loading skeletons while initial data is fetching', () => {
		mockUseKeyDiscovery.mockReturnValue({
			...baseHookReturn,
			isLoading: true,
		});

		renderPage();

		expect(screen.getByTestId('trending-loading-skeleton')).toBeInTheDocument();
		expect(screen.getByTestId('new-listings-loading-skeleton')).toBeInTheDocument();
	});

	it('renders top 5 keys in Trending section ordered by 24h volume', () => {
		const trending5 = [
			makeCreator('top1', { volume24h: 500, title: 'Alpha Creator', change24h: 22.4 }),
			makeCreator('top2', { volume24h: 400, title: 'Beta Creator', change24h: 15.1 }),
			makeCreator('top3', { volume24h: 300, title: 'Gamma Creator', change24h: -3.2 }),
			makeCreator('top4', { volume24h: 200, title: 'Delta Creator', change24h: 8.0 }),
			makeCreator('top5', { volume24h: 100, title: 'Epsilon Creator', change24h: 0.0 }),
		];

		mockUseKeyDiscovery.mockReturnValue({
			...baseHookReturn,
			trendingKeys: trending5,
		});

		renderPage();

		const trendingSection = screen.getByTestId('trending-section');
		expect(trendingSection).toBeInTheDocument();

		const cards = trendingSection.querySelectorAll('article');
		expect(cards).toHaveLength(5);

		expect(cards[0]).toHaveTextContent('Alpha Creator');
		expect(cards[0]).toHaveTextContent('#1');
		expect(cards[0]).toHaveTextContent('+22.4%');

		expect(cards[1]).toHaveTextContent('Beta Creator');
		expect(cards[1]).toHaveTextContent('#2');
		expect(cards[1]).toHaveTextContent('+15.1%');

		expect(cards[2]).toHaveTextContent('Gamma Creator');
		expect(cards[2]).toHaveTextContent('#3');
		expect(cards[2]).toHaveTextContent('-3.2%');

		expect(cards[3]).toHaveTextContent('Delta Creator');
		expect(cards[3]).toHaveTextContent('#4');

		expect(cards[4]).toHaveTextContent('Epsilon Creator');
		expect(cards[4]).toHaveTextContent('#5');
	});

	it('renders latest 10 keys in New Listings section ordered by creation date descending', () => {
		const newListings10 = Array.from({ length: 10 }, (_, i) =>
			makeCreator(`new_${10 - i}`, {
				title: `New Creator ${10 - i}`,
				createdAt: new Date(2026, 0, 10 - i).toISOString(),
				price: (10 - i) * 2,
				change24h: (10 - i) * 1.5,
			})
		);

		mockUseKeyDiscovery.mockReturnValue({
			...baseHookReturn,
			newListings: newListings10,
		});

		renderPage();

		const newListingsSection = screen.getByTestId('new-listings-section');
		expect(newListingsSection).toBeInTheDocument();

		const cards = newListingsSection.querySelectorAll('article');
		expect(cards).toHaveLength(10);

		expect(cards[0]).toHaveTextContent('New Creator 10');
		expect(cards[0]).toHaveTextContent('NEW');

		expect(cards[9]).toHaveTextContent('New Creator 1');
		expect(cards[9]).toHaveTextContent('NEW');
	});

	it('renders accurate key card details: avatar, name, price, and 24h change', () => {
		const creator = makeCreator('c1', {
			title: 'Zara Phoenix',
			price: 18.25,
			priceStroops: 182_500_000,
			change24h: 14.5,
		});

		mockUseKeyDiscovery.mockReturnValue({
			...baseHookReturn,
			trendingKeys: [creator],
		});

		renderPage();

		expect(screen.getByTestId('discovery-card-name')).toHaveTextContent('Zara Phoenix');
		expect(screen.getByTestId('discovery-card-price')).toHaveTextContent('18.25 XLM');
		expect(screen.getByText('+14.5%')).toBeInTheDocument();
		expect(screen.getByRole('img', { name: /Zara Phoenix avatar/i })).toBeInTheDocument();
	});

	it('provides View All links with pre-applied marketplace filters', () => {
		renderPage();

		const trendingLink = screen.getByTestId('view-all-trending');
		expect(trendingLink).toHaveAttribute('href', '/marketplace?sort=volume_desc');
		expect(trendingLink).toHaveTextContent(/view all trending keys/i);

		const newListingsLink = screen.getByTestId('view-all-newest');
		expect(newListingsLink).toHaveAttribute('href', '/marketplace?sort=newest');
		expect(newListingsLink).toHaveTextContent(/view all new listings/i);
	});

	it('renders refreshing indicator during background 60s revalidation without full reload', () => {
		mockUseKeyDiscovery.mockReturnValue({
			...baseHookReturn,
			isRefreshing: true,
			trendingKeys: [makeCreator('c1')],
		});

		renderPage();

		const status = screen.getByTestId('discovery-poll-status');
		expect(status).toHaveTextContent('Refreshing live data…');
		expect(status).toHaveAttribute('aria-busy', 'true');
		// Cards remain rendered during background refresh (no unmounting)
		expect(screen.getByTestId('trending-keys-grid')).toBeInTheDocument();
	});

	it('renders error empty state with retry button on fetch failure', () => {
		const refetch = vi.fn();
		mockUseKeyDiscovery.mockReturnValue({
			...baseHookReturn,
			error: new Error('Network offline'),
			refetch,
		});

		renderPage();

		expect(screen.getByText("Couldn't load discovery opportunities")).toBeInTheDocument();
		const retryButton = screen.getByRole('button', { name: /try again/i });
		fireEvent.click(retryButton);
		expect(refetch).toHaveBeenCalledTimes(1);
	});
});
