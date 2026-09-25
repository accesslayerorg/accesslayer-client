/**
 * Integration test for holdings page showing updated balance after a successful sell (#574).
 */
import type { ComponentProps, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

vi.mock('@/components/common/FeaturedCreatorAudienceChip', async () => {
	const React = await import('react');

	return {
		FeaturedCreatorAudienceChip: () =>
			React.createElement('div', { 'data-testid': 'mock-audience-chip' }),
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

const singleCreator: Course[] = [
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
];

const twoCreators: Course[] = [
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

const confirmTrade = (side: 'Buy' | 'Sell', amount: number) => {
	const [target] = screen.getAllByRole('button', { name: side });
	fireEvent.click(target);

	const amountInput = screen.getByTestId('trade-dialog-amount');
	fireEvent.change(amountInput, { target: { value: String(amount) } });

	const confirmButton = screen.getByTestId('trade-dialog-confirm');
	fireEvent.click(confirmButton);
};

describe('Holdings page sell balance update (#574)', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
	});

	it('decrements_holding_quantity_after_partial_sell_confirmation', async () => {
		mockGetCourses.mockResolvedValue(singleCreator);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await screen.findByText('3 keys · 0.05 XLM');

		confirmTrade('Sell', 1);

		await waitFor(
			() => {
				expect(screen.getByText('2 keys · 0.05 XLM')).toBeInTheDocument();
			},
			{ timeout: 5000 }
		);
		expect(screen.queryByText('3 keys · 0.05 XLM')).toBeNull();
	});

	it('removes_holding_entry_after_full_sell_confirmation', async () => {
		mockGetCourses.mockResolvedValue(singleCreator);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await screen.findByText('3 keys · 0.05 XLM');

		confirmTrade('Sell', 3);

		await waitFor(
			() => {
				expect(screen.queryByText('3 keys · 0.05 XLM')).toBeNull();
			},
			{ timeout: 5000 }
		);
		expect(screen.getByText('No held creator keys yet.')).toBeInTheDocument();
	});

	it('updates_holdings_without_manual_refresh', async () => {
		mockGetCourses.mockResolvedValue(singleCreator);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await screen.findByText('3 keys · 0.05 XLM');

		confirmTrade('Sell', 1);

		// Assert updated quantity appears in DOM without manual refetch/reload/re-render trigger
		await waitFor(
			() => {
				expect(screen.getByText('2 keys · 0.05 XLM')).toBeInTheDocument();
			},
			{ timeout: 5000 }
		);
	});

	it('partial_sell_leaves_other_holdings_unaffected', async () => {
		mockGetCourses.mockResolvedValue(twoCreators);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await screen.findByText('3 keys · 0.05 XLM');
		expect(screen.getByText('2 keys · 0.12 XLM')).toBeInTheDocument();

		confirmTrade('Sell', 1);

		await waitFor(
			() => {
				expect(screen.getByText('2 keys · 0.05 XLM')).toBeInTheDocument();
			},
			{ timeout: 5000 }
		);
		expect(screen.getByText('2 keys · 0.12 XLM')).toBeInTheDocument();
	});
});
