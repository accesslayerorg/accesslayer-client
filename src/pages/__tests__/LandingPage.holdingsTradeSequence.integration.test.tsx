/**
 * Integration test for holdings entry count after buy/sell sequence (#TBD).
 *
 * The holdings list should add an entry when a buy confirms for a new creator
 * and remove it when all keys for that creator are sold. Additional keys for
 * an existing creator must not produce a duplicate entry.
 *
 * Held positions are derived from the API response:
 *   index 0 → featuredHoldings (mutable via TradeDialog, starts at 3)
 *   index 1+ → DEMO_HELD_KEY_QUANTITIES (fixed per session)
 *
 * Flow (2 creators returned by the API):
 *   1. Initial: featuredHoldings=3 (Creator A) + 2 keys (Creator B) → 2 entries
 *   2. Sell all 3 keys of Creator A → 1 entry (only Creator B)
 *   3. Buy 1 key of Creator A → 2 entries (A re-added, B still present)
 *   4. Buy 2 more keys of Creator A → still 2 entries (no duplicate)
 *   5. Sell all 3 keys of Creator A → 1 entry (only Creator B again)
 *
 * Acceptance criteria covered:
 *   - Entry added when a buy confirms for a new creator (step 3)
 *   - Entry not duplicated when additional keys are bought (step 4)
 *   - Entry removed when all keys for a creator are sold (steps 2, 5)
 *   - Entry count correct after each state change (all steps)
 */
import type { ComponentProps, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import { courseService, type Course } from '@/services/course.service';

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

const getHoldingsHeaderEntryCount = () =>
	Number(screen.getByTestId('holdings-header-entry-count').textContent);

const waitForHoldingsHeaderCount = async (count: number) => {
	await waitFor(
		() => {
			expect(getHoldingsHeaderEntryCount()).toBe(count);
		},
		{ timeout: 3000 }
	);
};

/**
 * Opens the trade dialog by clicking the given labelled button (Buy or Sell)
 * and confirms a trade for the given amount.
 *
 * Desktop Buy/Sell buttons are hidden at narrow viewports. When matchMedia
 * reports a sub-md viewport, only the mobile bottom-bar buttons are visible.
 * Both sets invoke the same handler, so picking either is fine.
 */
const confirmTrade = (side: 'Buy' | 'Sell', amount: number) => {
	const [target] = screen.getAllByRole('button', { name: side });
	fireEvent.click(target);

	const amountInput = screen.getByTestId('trade-dialog-amount');
	fireEvent.change(amountInput, { target: { value: String(amount) } });

	const confirmButton = screen.getByTestId('trade-dialog-confirm');
	fireEvent.click(confirmButton);
};

/**
 * Waits for any open Radix dialog to close by asserting the dialog role
 * has been removed from the DOM. This is necessary because the dialog
 * applies aria-hidden to all siblings, which causes getByRole queries
 * in subsequent confirmTrade calls to fail.
 */
const waitForDialogToClose = async () => {
	await waitFor(
		() => {
			expect(screen.queryByRole('dialog')).toBeNull();
		},
		{ timeout: 3000 }
	);
};

describe('LandingPage holdings entry count after buy/sell sequence', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
	});

	it(
		'updates entry count correctly after sell and buy sequence',
		async () => {
			mockGetCourses.mockResolvedValue(twoCreators);

			render(
				<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
					<MemoryRouter>
						<LandingPage />
					</MemoryRouter>
				</QueryClientProvider>
			);

			await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));

			// Initial: featuredHoldings=3 (Creator A) + 2 keys (Creator B) = 2 entries
			await waitForHoldingsHeaderCount(2);

			// Step 1: Sell all 3 keys of Creator A → featuredHoldings=0 → 1 entry (B only)
			confirmTrade('Sell', 3);
			await waitForHoldingsHeaderCount(1);
			await waitForDialogToClose();

			// Step 2: Buy 1 key for Creator A → featuredHoldings=1 → 2 entries
			confirmTrade('Buy', 1);
			await waitForHoldingsHeaderCount(2);
			await waitForDialogToClose();

			// Step 3: Buy 2 more keys for Creator A → featuredHoldings=3 → still 2 entries (no duplicate)
			confirmTrade('Buy', 2);
			await waitForHoldingsHeaderCount(2);
			await waitForDialogToClose();

			// Step 4: Sell all 3 keys of Creator A → featuredHoldings=0 → 1 entry (B only)
			confirmTrade('Sell', 3);
			await waitForHoldingsHeaderCount(1);
		},
		30_000
	);
});
