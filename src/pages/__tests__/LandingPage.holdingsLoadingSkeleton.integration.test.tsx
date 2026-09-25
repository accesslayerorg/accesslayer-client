/**
 * Integration test for the holdings loading skeleton (#627).
 *
 * Confirms the holdings overview shows skeleton placeholders while the holdings
 * query is in flight, that the placeholders are replaced by real holding entries
 * once the response resolves, and that no skeleton remains after data loads.
 */
import type { ComponentProps, ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import { courseService, type Course } from '@/services/course.service';

vi.mock('@/hooks/useWallet', () => ({
	useTradeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
	useWalletHoldings: () => ({ data: [] }),
}));

vi.mock('@/services/course.service', () => ({
	courseService: { getCourses: vi.fn() },
}));

vi.mock('@/hooks/useNetworkMismatch', () => ({
	useNetworkMismatch: () => ({
		isMismatch: false,
		expectedChainName: 'Stellar Testnet',
	}),
}));

// Keep the stale-data hook quiet so it does not trigger a background re-fetch
// that would flip isLoading back to true mid-assertion.
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

const seededCreators: Course[] = [
	{
		id: 'creator-a',
		title: 'Creator A',
		description: 'Digital artist',
		price: 0.05,
		priceStroops: 500_000,
		creatorShareSupply: 100,
		instructorId: 'creator-a',
		category: 'Art',
		level: 'BEGINNER',
		isVerified: true,
	},
	{
		id: 'creator-b',
		title: 'Creator B',
		description: 'Developer',
		price: 0.12,
		priceStroops: 1_200_000,
		creatorShareSupply: 50,
		instructorId: 'creator-b',
		category: 'Tech',
		level: 'ADVANCED',
		isVerified: false,
	},
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

// A promise whose resolution is controlled by the test, so we can render while
// the holdings query is still in flight and then let it settle on demand.
const createDeferred = <T,>() => {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>(res => {
		resolve = res;
	});

	return { promise, resolve };
};

const getHoldingsOverviewSection = () => {
	const heading = screen.getByRole('heading', { name: 'Total portfolio value' });
	const section = heading.closest(
		'[aria-labelledby="holdings-overview-heading"]'
	);
	expect(section).not.toBeNull();

	return section as HTMLElement;
};

describe('LandingPage holdings loading skeleton integration (#627)', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
	});

	it('shows skeleton placeholders while the holdings query is in flight', async () => {
		const deferred = createDeferred<Course[]>();
		mockGetCourses.mockReturnValue(deferred.promise);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		const holdingsSection = getHoldingsOverviewSection();

		// While the query is pending, the skeleton is visible with its default
		// three placeholder items and no real holding entries.
		const skeleton = await within(holdingsSection).findByTestId(
			'holdings-list-skeleton'
		);
		expect(skeleton).toBeInTheDocument();
		expect(
			within(skeleton).getAllByTestId('holdings-skeleton-item')
		).toHaveLength(3);
		expect(
			within(holdingsSection).queryByText(/\d+ keys ·/)
		).not.toBeInTheDocument();

		// Let the query resolve so the test does not leak a pending promise.
		deferred.resolve(seededCreators);
		const entryTexts = await within(holdingsSection).findAllByText(/\d+ keys ·/);
		expect(entryTexts).toHaveLength(2);
	});

	it('replaces the skeleton with holding entries once data arrives', async () => {
		const deferred = createDeferred<Course[]>();
		mockGetCourses.mockReturnValue(deferred.promise);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		const holdingsSection = getHoldingsOverviewSection();
		await within(holdingsSection).findByTestId('holdings-list-skeleton');

		deferred.resolve(seededCreators);

		// Real holding entries appear once the response resolves.
		await within(holdingsSection).findByText('3 keys · 0.05 XLM');
		expect(
			within(holdingsSection).getByText('2 keys · 0.12 XLM')
		).toBeInTheDocument();

		// No skeleton placeholders remain after data loads.
		await waitFor(() => {
			expect(
				within(holdingsSection).queryByTestId('holdings-list-skeleton')
			).not.toBeInTheDocument();
		});
		expect(
			within(holdingsSection).queryAllByTestId('holdings-skeleton-item')
		).toHaveLength(0);
	});
});
