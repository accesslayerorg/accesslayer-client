/**
 * Holdings empty-state UI (#539).
 *
 * When the holdings query settles with zero creator keys, the holdings
 * overview must show an empty state (illustration + copy + CTA) instead of
 * a blank grid. Loading must keep the skeleton so the empty state never
 * flashes mid-fetch.
 */
import type { ComponentProps, ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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

describe('LandingPage holdings empty state (#539)', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
	});

	it('shows empty state with CTA after holdings query settles empty', async () => {
		mockGetCourses.mockResolvedValue([]);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalled());

		const empty = await screen.findByTestId('holdings-empty-state');
		expect(empty).toBeInTheDocument();
		expect(
			within(getHoldingsOverviewSection()).getByRole('heading', {
				name: 'No creator keys yet',
			})
		).toBeInTheDocument();
		expect(
			within(getHoldingsOverviewSection()).getByRole('link', {
				name: 'Browse creators',
			})
		).toHaveAttribute('href', '/creators');
		// no holding cards
		expect(
			within(getHoldingsOverviewSection()).queryAllByText(/\d+ keys ·/)
				.length
		).toBe(0);
	});

	it('keeps skeleton during loading and does not flash empty state early', async () => {
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

		// While loading: empty state must not be present
		expect(
			screen.queryByTestId('holdings-empty-state')
		).not.toBeInTheDocument();

		resolveCourses([]);
		expect(
			await screen.findByTestId('holdings-empty-state')
		).toBeInTheDocument();
	});
});
