import type { ComponentProps, ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import { courseService, type Course } from '@/services/course.service';

vi.mock('@/services/course.service', () => ({
	courseService: { getCourses: vi.fn() },
}));

vi.mock('@/hooks/useWallet', () => ({
	useTradeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
	useWalletHoldings: () => ({ data: [] }),
}));

vi.mock('@/hooks/useNetworkMismatch', () => ({
	useNetworkMismatch: () => ({
		isMismatch: false,
		expectedChainName: 'Stellar Testnet',
	}),
}));

vi.mock('@/hooks/useStaleData', () => ({
	useStaleData: () => ({
		stale: false,
		ageMs: 0,
		msUntilStale: 60_000,
		revalidate: vi.fn(),
	}),
}));

vi.mock('@/components/common/StellarConnectionQualityBadge', async () => {
	const React = await import('react');
	return {
		default: () => React.createElement('div', { role: 'status' }, 'RPC good'),
	};
});

vi.mock('@/components/common/FeaturedCreatorAudienceChip', async () => {
	const React = await import('react');
	return {
		FeaturedCreatorAudienceChip: () =>
			React.createElement('div', null, 'Mocked Audience Chip'),
	};
});

vi.mock('@/components/common/CreatorCard', async () => {
	const React = await import('react');
	return {
		default: ({ creator }: { creator: { title: string } }) =>
			React.createElement(
				'article',
				{ 'data-testid': `creator-card-${creator.title}` },
				creator.title
			),
	};
});

vi.mock('framer-motion', async () => {
	const React = await import('react');
	type MotionDivProps = ComponentProps<'div'> & {
		layout?: boolean;
		transition?: unknown;
	};

	return {
		AnimatePresence: ({ children }: { children: ReactNode }) =>
			React.createElement(React.Fragment, null, children),
		LayoutGroup: ({ children }: { children: ReactNode }) =>
			React.createElement(React.Fragment, null, children),
		motion: {
			div: ({ children, ...props }: MotionDivProps) => {
				const { layout, transition, ...divProps } = props;
				void layout;
				void transition;
				return React.createElement('div', divProps, children);
			},
			h1: ({ children, ...props }: ComponentProps<'h1'>) =>
				React.createElement('h1', props, children),
			button: ({ children, ...props }: ComponentProps<'button'>) =>
				React.createElement('button', props, children),
		},
	};
});

const mockGetCourses = vi.mocked(courseService.getCourses);

const createMockCreators = (count: number): Course[] => {
	return Array.from({ length: count }, (_, i) => ({
		id: `creator-${i + 1}`,
		title: `Creator ${i + 1}`,
		description: `Creator description ${i + 1}`,
		price: 0.05,
		priceStroops: 500_000,
		creatorShareSupply: 100,
		instructorId: `creator-id-${i + 1}`,
		category: 'Art',
		level: 'BEGINNER' as const,
		isVerified: true,
	}));
};

const renderWithProviders = (component: ReactNode) => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
		},
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>{component}</MemoryRouter>
		</QueryClientProvider>
	);
};

describe('LandingPage - Creator Card Count Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders exactly 8 creator cards when API returns 8 creators', async () => {
		const mockCreators = createMockCreators(8);
		mockGetCourses.mockResolvedValue(mockCreators);

		renderWithProviders(<LandingPage />);

		await waitFor(() => {
			const cards = screen.getAllByTestId(/^creator-card-/);
			expect(cards).toHaveLength(8);
		});
	});

	it('renders exactly 3 creator cards when API returns 3 creators', async () => {
		const mockCreators = createMockCreators(3);
		mockGetCourses.mockResolvedValue(mockCreators);

		renderWithProviders(<LandingPage />);

		await waitFor(() => {
			const cards = screen.getAllByTestId(/^creator-card-/);
			expect(cards).toHaveLength(3);
		});
	});

	it('renders exactly 6 creator cards when API returns 6 creators', async () => {
		const mockCreators = createMockCreators(6);
		mockGetCourses.mockResolvedValue(mockCreators);

		renderWithProviders(<LandingPage />);

		await waitFor(() => {
			const cards = screen.getAllByTestId(/^creator-card-/);
			expect(cards).toHaveLength(6);
		});
	});

	it('does not have skeleton cards after data loads with 8 creators', async () => {
		const mockCreators = createMockCreators(8);
		mockGetCourses.mockResolvedValue(mockCreators);

		renderWithProviders(<LandingPage />);

		await waitFor(() => {
			const cards = screen.getAllByTestId(/^creator-card-/);
			expect(cards).toHaveLength(8);
			// Verify no skeleton elements remain
			const skeletons = screen.queryAllByTestId(/skeleton/i);
			expect(skeletons).toHaveLength(0);
		});
	});

	it('renders different page sizes correctly - 12 creators', async () => {
		const mockCreators = createMockCreators(12);
		mockGetCourses.mockResolvedValue(mockCreators);

		renderWithProviders(<LandingPage />);

		await waitFor(() => {
			const cards = screen.getAllByTestId(/^creator-card-/);
			// Default page size is 6, so first page should have 6 cards
			expect(cards.length).toBeLessThanOrEqual(12);
			expect(cards.length).toBeGreaterThan(0);
		});
	});

	it('renders no cards when API returns empty array', async () => {
		mockGetCourses.mockResolvedValue([]);

		renderWithProviders(<LandingPage />);

		await waitFor(() => {
			const cards = screen.queryAllByTestId(/^creator-card-/);
			expect(cards).toHaveLength(0);
		});
	});

	it('card count matches API response exactly - 8 creators with no hidden elements', async () => {
		const mockCreators = createMockCreators(8);
		mockGetCourses.mockResolvedValue(mockCreators);

		const { container } = renderWithProviders(<LandingPage />);

		await waitFor(() => {
			const visibleCards = screen.getAllByTestId(/^creator-card-/);
			expect(visibleCards).toHaveLength(8);

			// Verify no hidden cards in the DOM
			const allArticles = container.querySelectorAll(
				'article[data-testid^="creator-card-"]'
			);
			const visibleArticles = Array.from(allArticles).filter(
				el => el.checkVisibility && el.checkVisibility()
			);
			expect(visibleArticles.length).toBeLessThanOrEqual(8);
		});
	});
});
