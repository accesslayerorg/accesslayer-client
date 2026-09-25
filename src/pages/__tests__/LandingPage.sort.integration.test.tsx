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
		FeaturedCreatorAudienceChip: () => React.createElement('div', null, 'Mocked Audience Chip'),
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

const creatorGamma: Course = {
	id: '3',
	title: 'Creator Gamma',
	description: 'Solidity Developer',
	price: 0.3,
	priceStroops: 3_000_000,
	creatorShareSupply: 75,
	instructorId: 'creator-gamma',
	category: 'Tech',
	level: 'ADVANCED',
	isVerified: true,
};

const featuredOrder = [creatorAlpha, creatorBeta, creatorGamma];
const priceAscOrder = [creatorBeta, creatorGamma, creatorAlpha];

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

describe('LandingPage sort dropdown integration test', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
		mockGetCourses.mockImplementation(async (params?: GetCoursesParams) => {
			if (params?.sort === 'price-asc') return priceAscOrder;
			return featuredOrder;
		});
	});

	it('selects sort and reorders creator list to match API response, updating the URL query string', async () => {
		render(
			<QueryClientProvider client={makeQueryClient()}>
				<MemoryRouter>
					<LandingPage />
					<RouteLocationTracker />
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Initial load gets courses in featured order
		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));
		expect(mockGetCourses).toHaveBeenLastCalledWith(undefined);
		await waitFor(() =>
			expect(getCreatorTitles()).toEqual(['Creator Alpha', 'Creator Beta', 'Creator Gamma'])
		);

		// Select the Price sort option (Price: Low to high -> value 'price-asc')
		fireEvent.change(screen.getByLabelText(/^sort$/i), {
			target: { value: 'price-asc' },
		});

		// Assert API is called with sort=price-asc in request params
		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(2));
		expect(mockGetCourses).toHaveBeenLastCalledWith({ sort: 'price-asc' });

		// Assert list reorders to match the API response for price sort
		await waitFor(() =>
			expect(getCreatorTitles()).toEqual(['Creator Beta', 'Creator Gamma', 'Creator Alpha'])
		);

		// Assert previous order is not visible
		expect(getCreatorTitles()).not.toEqual(['Creator Alpha', 'Creator Beta', 'Creator Gamma']);

		// Assert dropdown selection reflected in the URL query string
		await waitFor(() =>
			expect(screen.getByTestId('location-search')).toHaveTextContent('sort=price-asc')
		);
	});

	it('initialises sort dropdown from URL param and fetches with that sort on load', async () => {
		render(
			<QueryClientProvider client={makeQueryClient()}>
				<MemoryRouter initialEntries={['/?sort=price-asc']}>
					<LandingPage />
					<RouteLocationTracker />
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Assert initial fetch uses the sort param from URL
		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));
		expect(mockGetCourses).toHaveBeenLastCalledWith({ sort: 'price-asc' });

		// Assert dropdown shows the correct selected option
		const dropdown = screen.getByLabelText(/^sort$/i) as HTMLSelectElement;
		expect(dropdown.value).toBe('price-asc');

		// Assert list renders results matching the price-sorted response
		await waitFor(() =>
			expect(getCreatorTitles()).toEqual(['Creator Beta', 'Creator Gamma', 'Creator Alpha'])
		);
	});
});
