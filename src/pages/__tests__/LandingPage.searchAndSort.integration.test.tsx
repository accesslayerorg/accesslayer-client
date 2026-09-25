/**
 * Integration test for search and sort query parameters coexisting in creator list (#594).
 *
 * Confirms that:
 * 1. Both search and sort params are present in URL when both are set.
 * 2. courseService.getCourses is called with both params in the same request.
 * 3. Clearing search input removes search param from URL while preserving sort param.
 * 4. Changing sort dropdown updates sort param in URL while preserving current search param.
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

const creatorAlpha: Course = {
	id: '1',
	title: 'Creator Alpha',
	description: 'Digital artist',
	price: 0.5,
	priceStroops: 5_000_000,
	creatorShareSupply: 100,
	instructorId: 'creator-alpha',
	category: 'Art',
	level: 'BEGINNER',
	isVerified: true,
};

const creatorBeta: Course = {
	id: '2',
	title: 'Creator Beta',
	description: 'Music producer',
	price: 0.1,
	priceStroops: 1_000_000,
	creatorShareSupply: 50,
	instructorId: 'creator-beta',
	category: 'Music',
	level: 'INTERMEDIATE',
	isVerified: true,
};

const allCreators = [creatorAlpha, creatorBeta];

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

describe('LandingPage search and sort coexistence integration (#594)', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
		mockGetCourses.mockImplementation(async (params?: GetCoursesParams) => {
			if (params?.search === 'Alpha') return [creatorAlpha];
			if (params?.search === 'Beta') return [creatorBeta];
			return allCreators;
		});
	});

	function makeQueryClient() {
		return new QueryClient({ defaultOptions: { queries: { retry: false } } });
	}

	it('coexists search and sort params in URL and passes both in single API request', async () => {
		render(
			<QueryClientProvider client={makeQueryClient()}>
				<MemoryRouter>
					<LandingPage />
					<RouteLocationTracker />
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Initial load fetch
		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));
		expect(mockGetCourses).toHaveBeenLastCalledWith(undefined);
		await waitFor(() =>
			expect(getCreatorTitles()).toEqual(['Creator Alpha', 'Creator Beta'])
		);

		const sortDropdown = screen.getByLabelText(/^sort$/i);

		// 1. Type search query 'Alpha' and wait for debounced fetch and DOM update
		const searchInput1 = await screen.findByPlaceholderText(
			/search creators by name or handle/i
		);
		fireEvent.change(searchInput1, { target: { value: 'Alpha' } });

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(2));
		expect(mockGetCourses).toHaveBeenLastCalledWith({ search: 'Alpha' });
		await waitFor(() => expect(getCreatorTitles()).toEqual(['Creator Alpha']));
		await waitFor(() => {
			expect(screen.getByTestId('location-search').textContent).toContain(
				'search=Alpha'
			);
		});

		// 2. Select sort option 'price-asc'
		fireEvent.change(sortDropdown, { target: { value: 'price-asc' } });

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(3));
		expect(mockGetCourses).toHaveBeenLastCalledWith({
			search: 'Alpha',
			sort: 'price-asc',
		});
		await waitFor(() => {
			const search = screen.getByTestId('location-search').textContent || '';
			expect(search).toContain('search=Alpha');
			expect(search).toContain('sort=price-asc');
		});

		// Wait for search input to be mounted after fetch completes
		const searchInput2 = await screen.findByPlaceholderText(
			/search creators by name or handle/i
		);

		// 3. Clear search input and wait for debounced fetch without search param
		fireEvent.change(searchInput2, { target: { value: '' } });

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(4));
		expect(mockGetCourses).toHaveBeenLastCalledWith({
			sort: 'price-asc',
		});
		// Sorted by price-asc (Creator Beta 0.1 ETH comes before Creator Alpha 0.5 ETH)
		await waitFor(() =>
			expect(getCreatorTitles()).toEqual(['Creator Beta', 'Creator Alpha'])
		);
		await waitFor(() => {
			const search = screen.getByTestId('location-search').textContent || '';
			expect(search).not.toContain('search=');
			expect(search).toContain('sort=price-asc');
		});

		// Wait for search input to be mounted after fetch completes
		const searchInput3 = await screen.findByPlaceholderText(
			/search creators by name or handle/i
		);

		// 4. Type search query 'Beta' while preserving current sort
		fireEvent.change(searchInput3, { target: { value: 'Beta' } });

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(5));
		expect(mockGetCourses).toHaveBeenLastCalledWith({
			search: 'Beta',
			sort: 'price-asc',
		});
		await waitFor(() => expect(getCreatorTitles()).toEqual(['Creator Beta']));
		await waitFor(() => {
			const search = screen.getByTestId('location-search').textContent || '';
			expect(search).toContain('search=Beta');
			expect(search).toContain('sort=price-asc');
		});

		// 5. Change sort dropdown to 'supply-desc' while preserving current search
		fireEvent.change(sortDropdown, { target: { value: 'supply-desc' } });

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(6));
		expect(mockGetCourses).toHaveBeenLastCalledWith({
			search: 'Beta',
			sort: 'supply-desc',
		});
		await waitFor(() => {
			const search = screen.getByTestId('location-search').textContent || '';
			expect(search).toContain('search=Beta');
			expect(search).toContain('sort=supply-desc');
		});
	}, 15_000);
});
