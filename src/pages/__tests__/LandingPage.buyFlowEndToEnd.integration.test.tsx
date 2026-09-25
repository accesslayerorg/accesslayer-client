/**
 * End-to-end integration test for the buy flow (#642): from quantity input
 * through simulated on-chain confirmation to the success toast and updated
 * holdings cache.
 *
 * Mirrors the sell-flow E2E structure (see LandingPage.sellFlow.integration.test.tsx,
 * #644): the wallet layer is the app's real demo wallet (react-query +
 * useWallet, no hook mocks), so the holdings assertion exercises the real
 * cache update path instead of a mocked one. Trading in this app is scoped
 * to a single featured-creator panel (there is no per-card trade UI, and
 * CreatorDetailPage has no trade panel), so "connect a mock wallet" here
 * means rendering with a fresh QueryClient — the app's demo wallet address
 * is used automatically and starts the featured creator at its baseline
 * holdings.
 */
import type { ComponentProps, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('wagmi', () => ({
	useAccount: vi.fn(() => ({ address: undefined, isConnected: false })),
}));

import LandingPage from '@/pages/LandingPage';
import { courseService, type Course } from '@/services/course.service';
import showToast from '@/utils/toast.util';

vi.mock('@/services/course.service', () => ({
	courseService: { getCourses: vi.fn() },
}));

vi.mock('@/utils/toast.util', () => ({
	default: {
		message: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		transactionSuccess: vi.fn(),
	},
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
const mockShowToast = vi.mocked(showToast);

const featuredCreatorOnly: Course[] = [
	{
		id: '1',
		title: 'Alex Rivers',
		description: 'Digital Artist & Illustrator',
		price: 0.05,
		priceStroops: 500_000,
		creatorShareSupply: 120,
		instructorId: '1',
		category: 'Art',
		level: 'BEGINNER',
		isVerified: true,
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

const renderLandingPage = () =>
	render(
		<QueryClientProvider
			client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
		>
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		</QueryClientProvider>
	);

describe('LandingPage buy flow end-to-end (#642)', () => {
	beforeEach(() => {
		mockMatchMedia();
		installStorageStub('localStorage');
		installStorageStub('sessionStorage');
		mockGetCourses.mockReset();
		vi.clearAllMocks();
		mockGetCourses.mockResolvedValue(featuredCreatorOnly);
	});

	afterEach(() => {
		cleanup();
	});

	it('completes the buy flow from quantity input to success toast and updated holdings cache', async () => {
		renderLandingPage();

		// Wallet connected; the local display baseline shows 3 keys until the
		// react-query holdings cache (which starts empty) is written to.
		await screen.findByText('3 keys · 0.05 XLM');

		// Open the trade panel on the buy side
		const [buyButton] = screen.getAllByRole('button', {
			name: 'Buy',
			hidden: true,
		});
		fireEvent.click(buyButton);

		// Enter quantity 1
		const amountInput = await screen.findByTestId('trade-dialog-amount');
		fireEvent.change(amountInput, { target: { value: '1' } });

		// Submit and wait through the simulated on-chain confirmation
		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

		await waitFor(
			() =>
				expect(mockShowToast.transactionSuccess).toHaveBeenCalledWith(
					'Trade confirmed',
					'Bought 1 key from Alex Rivers'
				),
			{ timeout: 5000 }
		);

		// Holdings cache reflects the additional key (3 -> 4)
		await waitFor(
			() => expect(screen.getByText('4 keys · 0.05 XLM')).toBeInTheDocument(),
			{ timeout: 5000 }
		);
		expect(screen.queryByText('3 keys · 0.05 XLM')).toBeNull();

		// No error state at any stage of the flow
		expect(mockShowToast.error).not.toHaveBeenCalled();
	}, 15000);

	it('reports the submitted quantity while the transaction is pending', async () => {
		renderLandingPage();
		await screen.findByText('3 keys · 0.05 XLM');

		const [buyButton] = screen.getAllByRole('button', {
			name: 'Buy',
			hidden: true,
		});
		fireEvent.click(buyButton);
		fireEvent.change(await screen.findByTestId('trade-dialog-amount'), {
			target: { value: '1' },
		});
		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

		expect(mockShowToast.loading).toHaveBeenCalledWith(
			'Submitting buy for 1 key...'
		);
	});

	it('accepts quantity 1 as a valid buy amount with no validation error', async () => {
		renderLandingPage();
		await screen.findByText('3 keys · 0.05 XLM');

		const [buyButton] = screen.getAllByRole('button', {
			name: 'Buy',
			hidden: true,
		});
		fireEvent.click(buyButton);

		const amountInput = await screen.findByTestId('trade-dialog-amount');
		fireEvent.change(amountInput, { target: { value: '1' } });

		const confirmButton = screen.getByTestId('trade-dialog-confirm');
		expect(confirmButton).not.toBeDisabled();
	});

	it('displays a pending indicator during the buy and clears it after confirmation (#672)', async () => {
		renderLandingPage();
		await screen.findByText('3 keys · 0.05 XLM');

		// Open the trade panel on the buy side and enter the quantity.
		const [buyButton] = screen.getAllByRole('button', {
			name: 'Buy',
			hidden: true,
		});
		fireEvent.click(buyButton);
		const amountInput = await screen.findByTestId('trade-dialog-amount');
		fireEvent.change(amountInput, { target: { value: '1' } });
		const confirmButton = screen.getByTestId('trade-dialog-confirm');

		// Submit. AC #1: a pending indicator is visible on the dialog the
		// instant the click handler sets `tradeSubmitting = true`. The
		// loading state mirrors the synchronous loading-toast assertion above
		// (both fire before the first `await`).
		fireEvent.click(confirmButton);

		expect(confirmButton).toBeDisabled();
		expect(confirmButton).toHaveAttribute('aria-busy', 'true');
		// StableButtonContent renders BOTH the idle and loading slots in the
		// DOM (so the button width stays stable across the swap) and toggles
		// CSS visibility via the `invisible` Tailwind class. jest-dom's
		// `.toBeVisible()` honors `visibility: hidden` (and `aria-hidden`),
		// so it correctly reflects what the user perceives.
		expect(screen.getByText('Submitting…')).toBeVisible();
		expect(screen.getByText('Confirm buy')).toHaveAttribute('aria-hidden', 'true');
		// The loading toast announces the in-flight submission right away.
		expect(mockShowToast.loading).toHaveBeenCalledWith(
			'Submitting buy for 1 key...'
		);
		// The optimistic-update "Pending" pill on the holdings row is the
		// second observable pending signal during the same in-flight window.
		// (react-query's onMutate flips cache `pending: true` synchronously
		// and RTL's `fireEvent` flushes the re-render via act(), but we still
		// poll here for consistency with the file's waitFor idiom.)
		await waitFor(
			() =>
				expect(
					screen.getAllByText('Pending', { exact: true }).length
				).toBeGreaterThan(0),
			{ timeout: 1000 }
		);
		// No error toast during the in-flight window.
		expect(mockShowToast.error).not.toHaveBeenCalled();

		// Wait for the simulated on-chain confirmation to land.
		// AC #3: success toast is visible after confirmation.
		await waitFor(
			() =>
				expect(mockShowToast.transactionSuccess).toHaveBeenCalledWith(
					'Trade confirmed',
					'Bought 1 key from Alex Rivers'
				),
			{ timeout: 5000 }
		);

		// AC #2: pending indicator absent after confirmation. Two surfaces
		// carried a pending signal — the dialog (now unmounted) and the
		// holdings row's badge. Both must be gone: dialog unmount proves the
		// submit control unmounted, exact-match on the holdings pill proves
		// the optimistic-update path also settled.
		await waitFor(
			() =>
				expect(
					screen.queryByTestId('trade-dialog-confirm')
				).not.toBeInTheDocument(),
			{ timeout: 5000 }
		);
		await waitFor(
			() =>
				expect(
					screen.queryByText('Pending', { exact: true })
				).not.toBeInTheDocument(),
			{ timeout: 5000 }
		);

		// Holdings cache reflects the additional key.
		await waitFor(
			() => expect(screen.getByText('4 keys · 0.05 XLM')).toBeInTheDocument(),
			{ timeout: 5000 }
		);
		expect(screen.queryByText('3 keys · 0.05 XLM')).toBeNull();

		// AC #4: the submit button is re-enabled after confirmation. We
		// cannot observe the original button (it unmounted with the dialog),
		// so re-open the trade dialog: a fresh `<TradeDialog open
		// isSubmitting={false} />` proves the parent state was fully reset.
		// If `tradeSubmitting` had been left `true`, the reopened confirm
		// would still report `aria-busy` and the "Submitting…" label would
		// still be visible.
		const [buyButtonAgain] = screen.getAllByRole('button', { name: 'Buy' });
		fireEvent.click(buyButtonAgain);

		const reopenedConfirm = await screen.findByTestId('trade-dialog-confirm');
		expect(reopenedConfirm).not.toBeDisabled();
		expect(reopenedConfirm).not.toHaveAttribute('aria-busy');
		expect(screen.getByText('Confirm buy')).toBeVisible();
		expect(screen.getByText('Submitting…')).toHaveAttribute('aria-hidden', 'true');
	}, 15000);
});
