/**
 * Integration test for the creator search no-results state (#675).
 *
 * Confirms that a search returning zero creators renders a dedicated
 * no-results state that references the search term, distinct from the
 * generic empty state shown when no search term is active, and that clearing
 * the search input removes it.
 */
import type { ComponentProps, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
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

const NO_MATCH_QUERY = 'zzznomatch';

const creator: Course = {
	id: 'creator-a',
	title: 'Creator Alpha',
	description: 'Digital artist',
	price: 0.05,
	priceStroops: 500_000,
	creatorShareSupply: 100,
	instructorId: 'creator-a',
	category: 'Art',
	level: 'BEGINNER',
	isVerified: true,
};

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

function renderLandingPage(initialEntries: string[] = ['/']) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries}>
				<LandingPage />
			</MemoryRouter>
		</QueryClientProvider>
	);
}

const getSearchInput = () =>
	screen.getByPlaceholderText(/search creators by name or handle/i);

const queryNoResultsState = () =>
	screen.queryByRole('status', { name: /no creators found/i });

const queryUnfilteredEmptyState = () =>
	screen.queryByRole('status', { name: /no creators available/i });

const wasCalledWithSearch = (search: string) =>
	mockGetCourses.mock.calls.some(
		([params]) => (params as GetCoursesParams | undefined)?.search === search
	);

// While a fetch is in flight the search input is swapped for a skeleton, and
// afterwards the list briefly shows "Updating results...". Assertions run
// against live queries once both have cleared so they see the settled list.
const waitForSettledList = (assertion: () => void) =>
	waitFor(() => {
		expect(getSearchInput()).toBeInTheDocument();
		expect(screen.queryByText(/updating results/i)).not.toBeInTheDocument();
		assertion();
	});

describe('LandingPage search no-results state integration (#675)', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
		mockGetCourses.mockImplementation(async (params?: GetCoursesParams) =>
			params?.search === NO_MATCH_QUERY ? [] : [creator]
		);
	});

	it('shows a no-results state referencing the search term and removes it when the search is cleared', async () => {
		renderLandingPage();

		// Unfiltered list settles with creators and no empty state of either kind.
		await waitForSettledList(() => {
			expect(
				screen.getByRole('article', { name: /creator alpha/i })
			).toBeInTheDocument();
		});
		expect(queryNoResultsState()).not.toBeInTheDocument();
		expect(queryUnfilteredEmptyState()).not.toBeInTheDocument();

		// The search bar swaps its input for a skeleton while a fetch is in
		// flight, so enter the query as one change, like the other search tests.
		fireEvent.change(getSearchInput(), {
			target: { value: NO_MATCH_QUERY },
		});

		// Wait for the debounced search request to hit the mocked API.
		await waitFor(() =>
			expect(wasCalledWithSearch(NO_MATCH_QUERY)).toBe(true)
		);

		await waitForSettledList(() => {
			const noResults = screen.getByRole('status', {
				name: /no creators found/i,
			});
			expect(noResults).toBeVisible();
			expect(noResults).toHaveTextContent(`"${NO_MATCH_QUERY}"`);
		});
		expect(
			screen.queryByRole('article', { name: /creator alpha/i })
		).not.toBeInTheDocument();

		// The generic (no search term) empty state must not be shown.
		expect(queryUnfilteredEmptyState()).not.toBeInTheDocument();
		expect(screen.queryByText(/nothing here yet/i)).not.toBeInTheDocument();

		const callsBeforeClear = mockGetCourses.mock.calls.length;
		fireEvent.change(getSearchInput(), { target: { value: '' } });
		expect(getSearchInput()).toHaveValue('');

		// Clearing triggers a debounced refetch without a search param.
		await waitFor(() =>
			expect(mockGetCourses.mock.calls.length).toBeGreaterThan(
				callsBeforeClear
			)
		);
		expect(
			(mockGetCourses.mock.lastCall?.[0] as GetCoursesParams | undefined)
				?.search
		).toBeUndefined();

		await waitForSettledList(() => {
			expect(queryNoResultsState()).not.toBeInTheDocument();
			expect(
				screen.getByRole('article', { name: /creator alpha/i })
			).toBeInTheDocument();
		});
		expect(queryUnfilteredEmptyState()).not.toBeInTheDocument();
	});

	it('renders the generic empty state without search-term copy when no search term is active', async () => {
		renderLandingPage(['/?category=Nonexistent']);

		await waitForSettledList(() => {
			const unfilteredEmpty = screen.getByRole('status', {
				name: /no creators available/i,
			});
			expect(unfilteredEmpty).toBeVisible();
			expect(unfilteredEmpty).toHaveTextContent(/nothing here yet/i);
			expect(unfilteredEmpty).not.toHaveTextContent(/no creators found/i);
			expect(unfilteredEmpty).not.toHaveTextContent(/matching/i);
		});
		expect(queryNoResultsState()).not.toBeInTheDocument();
	});
});
