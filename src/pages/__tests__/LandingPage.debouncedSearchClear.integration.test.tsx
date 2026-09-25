/**
 * Integration test for debounced search clearing (#519).
 *
 * Confirms that clearing the search input triggers a debounced refetch without
 * a search param and restores the full unfiltered creator list.
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

function makeQueryClient() {
	return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe('LandingPage debounced search clear integration (#519)', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
		mockGetCourses.mockImplementation(async (params?: GetCoursesParams) => {
			if (params?.search) return [creatorBeta];
			return allCreators;
		});
	});

	it('re-fetches without a search param and restores the full creator list after the input is cleared', async () => {
		render(
			<QueryClientProvider client={makeQueryClient()}>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));
		expect(mockGetCourses).toHaveBeenLastCalledWith(undefined);
		await waitFor(() =>
			expect(getCreatorTitles()).toEqual(['Creator Alpha', 'Creator Beta'])
		);

		const input = screen.getByPlaceholderText(
			/search creators by name or handle/i
		);

		fireEvent.change(input, { target: { value: 'Beta' } });

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(2));
		expect(mockGetCourses).toHaveBeenLastCalledWith({ search: 'Beta' });
		const inputClear = await screen.findByPlaceholderText(
			/search creators by name or handle/i
		);
		fireEvent.change(inputClear, { target: { value: '' } });

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(3));
		expect(mockGetCourses).toHaveBeenLastCalledWith(undefined);
		await waitFor(() =>
			expect(getCreatorTitles()).toEqual(['Creator Alpha', 'Creator Beta'])
		);
	});

	it('removes search param from the URL and resets to page one after clearing', async () => {
		render(
			<QueryClientProvider client={makeQueryClient()}>
				<MemoryRouter initialEntries={['/?search=Beta']}>
					<LandingPage />
					<RouteLocationTracker />
				</MemoryRouter>
			</QueryClientProvider>
		);

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));
		expect(mockGetCourses).toHaveBeenLastCalledWith({ search: 'Beta' });

		const input = screen.getByPlaceholderText(
			/search creators by name or handle/i
		);
		fireEvent.change(input, { target: { value: '' } });

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(2));
		expect(mockGetCourses).toHaveBeenLastCalledWith(undefined);

		await waitFor(() => {
			expect(screen.getByTestId('location-search')).toHaveTextContent('');
		});
	});
});
