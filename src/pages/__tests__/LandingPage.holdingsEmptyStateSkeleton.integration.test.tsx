/**
 * Holdings empty-state loading skeleton coverage (#646).
 *
 * The existing #539 suite (LandingPage.holdingsEmptyState.test.tsx) already
 * proves the empty state doesn't flash mid-fetch and appears once the
 * holdings query settles with zero results. This suite adds the one
 * assertion #646 asks for that #539 doesn't cover: that skeleton
 * placeholders (CreatorHoldingsListSkeleton) are visible during the loading
 * phase itself, not just "empty state absent".
 */
import type { ComponentProps, ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import { courseService } from '@/services/course.service';

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

// Newer Node versions expose a global WebStorage `localStorage` that
// shadows jsdom's and has no working methods; install a spec-compliant
// in-memory stub so this suite behaves identically on every Node version
// (see LandingPage.sellFlow.integration.test.tsx, #644).
const installStorageStub = (property: 'localStorage' | 'sessionStorage') => {
	const store = new Map<string, string>();
	Object.defineProperty(window, property, {
		configurable: true,
		writable: true,
		value: {
			getItem: (key: string) => store.get(String(key)) ?? null,
			setItem: (key: string, value: string) => {
				store.set(String(key), String(value));
			},
			removeItem: (key: string) => {
				store.delete(String(key));
			},
			clear: () => store.clear(),
			key: (index: number) => Array.from(store.keys())[index] ?? null,
			get length() {
				return store.size;
			},
		},
	});
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

const getHoldingsOverviewSection = () => {
	const heading = screen.getByRole('heading', {
		name: 'Total portfolio value',
	});
	const section = heading.closest(
		'[aria-labelledby="holdings-overview-heading"]'
	);
	expect(section).not.toBeNull();

	return section as HTMLElement;
};

describe('LandingPage holdings empty state loading skeleton (#646)', () => {
	beforeEach(() => {
		mockMatchMedia();
		installStorageStub('localStorage');
		installStorageStub('sessionStorage');
		mockGetCourses.mockReset();
	});

	it('shows skeleton placeholders while loading, not the empty state', async () => {
		let resolveCourses!: (value: never[]) => void;
		mockGetCourses.mockImplementation(
			() =>
				new Promise(resolve => {
					resolveCourses = resolve;
				})
		);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		// While loading: empty state absent, skeleton placeholders present
		expect(screen.queryByTestId('holdings-empty-state')).not.toBeInTheDocument();

		const section = getHoldingsOverviewSection();
		const skeletonShimmer = section.querySelectorAll('.skeleton-shimmer');
		expect(skeletonShimmer.length).toBeGreaterThan(0);

		resolveCourses([]);

		// After resolving empty: empty state appears, skeleton is gone
		expect(await screen.findByTestId('holdings-empty-state')).toBeInTheDocument();
		await waitFor(() => {
			expect(
				getHoldingsOverviewSection().querySelectorAll('.skeleton-shimmer')
			).toHaveLength(0);
		});
	});

	it('does not show the empty state when the query resolves with results', async () => {
		mockGetCourses.mockResolvedValue([
			{
				id: '1',
				title: 'Alex Rivers',
				description: 'Digital Artist',
				price: 0.05,
				priceStroops: 500_000,
				creatorShareSupply: 120,
				instructorId: '1',
				category: 'Art',
				level: 'BEGINNER',
				isVerified: true,
			},
		]);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalled());

		expect(screen.queryByTestId('holdings-empty-state')).not.toBeInTheDocument();
	});
});
