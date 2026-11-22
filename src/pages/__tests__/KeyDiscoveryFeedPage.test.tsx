import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import KeyDiscoveryFeedPage from '../KeyDiscoveryFeedPage';
import { courseService } from '@/services/course.service';
import type { Course, CoursesPage } from '@/services/course.service';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getCoursesPage: vi.fn(),
	},
}));

const ALICE: Course = {
	id: 'alice',
	title: 'Alice',
	description: '',
	instructorId: 'alice-instructor',
	category: 'Art',
	level: 'BEGINNER',
	priceStroops: 2_000_000,
	creatorShareSupply: 100,
	volume24h: 100,
	change24h: 0,
	createdAt: '2026-01-01T00:00:00Z',
};

const BOB: Course = {
	id: 'bob',
	title: 'Bob',
	description: '',
	instructorId: 'bob-instructor',
	category: 'Music',
	level: 'BEGINNER',
	priceStroops: 5_000_000,
	creatorShareSupply: 100,
	volume24h: 10,
	change24h: 0,
	createdAt: '2026-02-01T00:00:00Z',
};

function page(items: Course[], hasMore = false): CoursesPage {
	return { items, page: 1, hasMore };
}

function renderPage(initialPath = '/discovery/feed') {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<MemoryRouter initialEntries={[initialPath]}>
			<QueryClientProvider client={queryClient}>
				<KeyDiscoveryFeedPage />
			</QueryClientProvider>
		</MemoryRouter>
	);
}

function renderedKeyIds(): string[] {
	return screen.getAllByTestId('key-card').map(card => card.getAttribute('data-key-id'));
}

describe('KeyDiscoveryFeedPage (#1113)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(courseService.getCoursesPage).mockResolvedValue(
			page([ALICE, BOB])
		);
	});

	it('renders the feed grid once keys load', async () => {
		renderPage();

		await waitFor(() => {
			expect(renderedKeyIds()).toEqual(['alice', 'bob']);
		});
		expect(screen.getByTestId('discovery-feed-sort')).toBeInTheDocument();
		expect(
			screen.getByTestId('discovery-feed-category-all')
		).toHaveAttribute('aria-pressed', 'true');
	});

	it('re-orders the grid when the sort control changes', async () => {
		const user = userEvent.setup();
		renderPage();

		await waitFor(() => {
			expect(renderedKeyIds()).toEqual(['alice', 'bob']);
		});

		await user.selectOptions(
			screen.getByTestId('discovery-feed-sort'),
			'market_cap'
		);

		// Bob's estimated market cap (5 XLM × 100) beats Alice's (2 XLM × 100).
		await waitFor(() => {
			expect(renderedKeyIds()).toEqual(['bob', 'alice']);
		});
	});

	it('filters the grid with the category chips', async () => {
		const user = userEvent.setup();
		renderPage();

		await waitFor(() => {
			expect(renderedKeyIds()).toEqual(['alice', 'bob']);
		});

		await user.click(screen.getByTestId('discovery-feed-category-music'));

		await waitFor(() => {
			expect(renderedKeyIds()).toEqual(['bob']);
		});
		expect(screen.getByTestId('discovery-feed-category-music')).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});

	it('shows the empty state when filters match nothing and can clear them', async () => {
		const user = userEvent.setup();
		vi.mocked(courseService.getCoursesPage).mockResolvedValue(
			page([ALICE, BOB])
		);
		renderPage('/discovery/feed?category=Gaming');

		await waitFor(() => {
			expect(screen.getByTestId('discovery-feed-empty')).toBeInTheDocument();
		});
		expect(
			screen.getByTestId('discovery-feed-empty')
		).toHaveTextContent(/Gaming/);

		await user.click(screen.getByRole('button', { name: /Clear filters/i }));

		await waitFor(() => {
			expect(renderedKeyIds()).toEqual(['alice', 'bob']);
		});
	});

	it('shows an error state with retry when the listing fails', async () => {
		const user = userEvent.setup();
		vi.mocked(courseService.getCoursesPage).mockRejectedValueOnce(
			new Error('network down')
		);
		renderPage();

		const error = await screen.findByTestId('discovery-feed-error');
		expect(
			within(error).getByRole('button', { name: /Try again/i })
		).toBeInTheDocument();

		vi.mocked(courseService.getCoursesPage).mockResolvedValue(
			page([ALICE])
		);
		await user.click(within(error).getByRole('button', { name: /Try again/i }));

		await waitFor(() => {
			expect(renderedKeyIds()).toEqual(['alice']);
		});
	});
});
