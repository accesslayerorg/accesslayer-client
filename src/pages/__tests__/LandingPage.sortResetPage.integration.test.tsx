/**
 * Integration test for creator discovery list resetting to page one when
 * sort selection changes (#625).
 *
 * Confirms that:
 * 1. Changing sort while on page 2+ resets to page 1.
 * 2. Previous page results are replaced by first page of new sort.
 * 3. URL query string reflects the new sort and no page cursor.
 * 4. Loading state is shown during the reset fetch.
 */
import type { ComponentProps, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import {
	courseService,
	type Course,
	type GetCoursesParams,
} from '@/services/course.service';

vi.mock('@/services/course.service', () => ({
	courseService: { getCourses: vi.fn() },
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
				{ 'aria-label': `Creator ${creator.title}` },
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

function createCreator(id: string, title: string, price: number): Course {
	return {
		id,
		title,
		description: `Description for ${title}`,
		price,
		priceStroops: Math.round(price * 10_000_000),
		creatorShareSupply: 100,
		instructorId: title.toLowerCase().replace(/\s+/g, '-'),
		category: 'Art',
		level: 'BEGINNER',
		isVerified: true,
	};
}

// 7 creators so we have 2 pages (PAGE_SIZE = 6)
const CREATOR_A = createCreator('1', 'Creator Alpha', 0.5);
const CREATOR_B = createCreator('2', 'Creator Beta', 0.1);
const CREATOR_C = createCreator('3', 'Creator Gamma', 0.3);
const CREATOR_D = createCreator('4', 'Creator Delta', 0.8);
const CREATOR_E = createCreator('5', 'Creator Epsilon', 0.05);
const CREATOR_F = createCreator('6', 'Creator Zeta', 0.6);
const CREATOR_G = createCreator('7', 'Creator Eta', 0.2);

const allCreatorsFeatured = [
	CREATOR_A,
	CREATOR_B,
	CREATOR_C,
	CREATOR_D,
	CREATOR_E,
	CREATOR_F,
	CREATOR_G,
];

const allCreatorsPriceAsc = [
	CREATOR_E,
	CREATOR_B,
	CREATOR_G,
	CREATOR_C,
	CREATOR_A,
	CREATOR_F,
	CREATOR_D,
];

const mockMatchMedia = () => {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
};

const getCreatorTitles = () =>
	screen.getAllByRole('article').map(node => node.textContent);

function RouteLocationTracker() {
	const location = useLocation();
	return <div data-testid="location-search">{location.search}</div>;
}

function makeQueryClient() {
	return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe('Creator list sort resets to page one (#625)', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
		mockGetCourses.mockImplementation(async (params?: GetCoursesParams) => {
			if (params?.sort === 'price-asc') return allCreatorsPriceAsc;
			return allCreatorsFeatured;
		});
	});

	it('resets to page 1 when sort changes while on page 2', async () => {
		render(
			<QueryClientProvider client={makeQueryClient()}>
				<MemoryRouter>
					<LandingPage />
					<RouteLocationTracker />
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Wait for initial load (featured order, page 1: 6 of 7 creators)
		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));
		expect(mockGetCourses).toHaveBeenLastCalledWith(undefined);

		// Assert page 1 shows the first 6 featured creators
		await waitFor(() => {
			expect(getCreatorTitles()).toHaveLength(6);
		});
		expect(getCreatorTitles()).toEqual([
			'Creator Alpha',
			'Creator Beta',
			'Creator Gamma',
			'Creator Delta',
			'Creator Epsilon',
			'Creator Zeta',
		]);

		// Navigate to page 2 by clicking the "Next" button
		const nextButton = screen.getByRole('button', {
			name: /go to next page/i,
		});
		fireEvent.click(nextButton);

		// Assert page 2 shows Creator Eta (the 7th creator)
		await waitFor(() => {
			expect(getCreatorTitles()).toEqual(['Creator Eta']);
		});

		// Verify the pagination shows we're on page 2
		expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();

		// Now change sort to "Price: Low to high"
		const sortDropdown = screen.getByLabelText(/^sort$/i);
		fireEvent.change(sortDropdown, { target: { value: 'price-asc' } });

		// Assert loading state appears during the transition
		await waitFor(() => {
			expect(screen.getByText(/updating results/i)).toBeInTheDocument();
		});

		// Wait for the refetch with new sort params
		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(2));
		expect(mockGetCourses).toHaveBeenLastCalledWith({ sort: 'price-asc' });

		// Assert the list now shows the first page of price-asc sorted results
		await waitFor(() => {
			expect(getCreatorTitles()).toHaveLength(6);
		});
		expect(getCreatorTitles()).toEqual([
			'Creator Epsilon',
			'Creator Beta',
			'Creator Eta',
			'Creator Gamma',
			'Creator Alpha',
			'Creator Zeta',
		]);

		// Assert pagination shows we're back on page 1
		expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();

		// Assert the URL reflects the new sort
		await waitFor(() => {
			const search = screen.getByTestId('location-search').textContent || '';
			expect(search).toContain('sort=price-asc');
		});
	});

	it('shows loading state briefly when sort changes mid-list', async () => {
		render(
			<QueryClientProvider client={makeQueryClient()}>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Wait for initial load
		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));

		// Navigate to page 2
		const nextButton = screen.getByRole('button', {
			name: /go to next page/i,
		});
		fireEvent.click(nextButton);

		await waitFor(() => {
			expect(getCreatorTitles()).toEqual(['Creator Eta']);
		});

		// Change sort — loading state should appear
		const sortDropdown = screen.getByLabelText(/^sort$/i);
		fireEvent.change(sortDropdown, { target: { value: 'price-asc' } });

		await waitFor(() => {
			expect(screen.getByText(/updating results/i)).toBeInTheDocument();
		});

		// Loading state should eventually disappear after results load
		await waitFor(() => {
			expect(screen.queryByText(/updating results/i)).not.toBeInTheDocument();
		});
	});
});
