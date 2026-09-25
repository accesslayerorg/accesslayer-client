/**
 * Integration test for portfolio holdings header entry count (#521).
 *
 * Confirms the holdings overview header count matches the number of held
 * creator positions returned from the holdings response, including empty and
 * refreshed responses.
 */
import type { ComponentProps, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const threeHoldingsCreators: Course[] = [
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
	{
		id: 'creator-c',
		title: 'Creator C',
		description: 'Strategist',
		price: 0.08,
		priceStroops: 800_000,
		creatorShareSupply: 75,
		instructorId: 'creator-c',
		category: 'Finance',
		level: 'INTERMEDIATE',
		isVerified: true,
	},
];

const singleHoldingCreator = [threeHoldingsCreators[0]];

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
	const heading = screen.getByRole('heading', { name: 'Total portfolio value' });
	const section = heading.closest('[aria-labelledby="holdings-overview-heading"]');
	expect(section).not.toBeNull();

	return section as HTMLElement;
};

const getHoldingsHeaderEntryCount = () =>
	Number(screen.getByTestId('holdings-header-entry-count').textContent);

const countHoldingsGridEntries = () =>
	within(getHoldingsOverviewSection()).queryAllByText(/\d+ keys ·/).length;

const waitForHoldingsHeaderCount = async (count: number) => {
	await waitFor(() => {
		expect(getHoldingsHeaderEntryCount()).toBe(count);
	});
};

const triggerCreatorListRefresh = () => {
	const shortcutEvent = new KeyboardEvent('keydown', {
		key: 'r',
		code: 'KeyR',
		ctrlKey: true,
		altKey: true,
		bubbles: true,
		cancelable: true,
	});

	fireEvent(window, shortcutEvent);
};

describe('LandingPage holdings header entry count integration (#521)', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
	});

	it('shows a header count of 3 when three holdings entries are returned', async () => {
		mockGetCourses.mockResolvedValue(threeHoldingsCreators);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));
		await waitForHoldingsHeaderCount(3);

		expect(
			screen.getByText('Across 3 held creator positions.')
		).toBeInTheDocument();
		expect(countHoldingsGridEntries()).toBe(3);
	});

	it('shows a header count of 0 for an empty holdings response', async () => {
		mockGetCourses.mockResolvedValue([]);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));
		await waitForHoldingsHeaderCount(0);

		expect(screen.getByText('No held creator keys yet.')).toBeInTheDocument();
		expect(
			within(getHoldingsOverviewSection()).getByText('0 XLM')
		).toBeInTheDocument();
		expect(countHoldingsGridEntries()).toBe(0);
	});

	it('updates the header count when holdings data is refreshed', async () => {
		mockGetCourses
			.mockResolvedValueOnce(threeHoldingsCreators)
			.mockResolvedValueOnce(singleHoldingCreator);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));
		await waitForHoldingsHeaderCount(3);
		expect(countHoldingsGridEntries()).toBe(3);

		triggerCreatorListRefresh();

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(2));
		await waitForHoldingsHeaderCount(1);

		expect(
			screen.getByText('Across 1 held creator position.')
		).toBeInTheDocument();
		expect(countHoldingsGridEntries()).toBe(1);
	});
});
