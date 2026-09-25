/**
 * Integration test for holdings page refetching data after wallet switch (#681).
 *
 * Confirms that when a user switches from wallet A to wallet B (or an empty wallet),
 * holdings query refetches data for the new address, displays wallet B's holdings,
 * and clears wallet A's stale holdings without throwing runtime errors.
 */
import type { ComponentProps, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccount } from 'wagmi';
import LandingPage from '@/pages/LandingPage';
import { courseService, type Course } from '@/services/course.service';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';

// ---------------------------------------------------------------------------
// Mocks & Setup
// ---------------------------------------------------------------------------

const EMPTY_HOLDINGS_ENTRY: { data: HeldKeyPosition[]; isError: boolean; error: Error | null } = {
	data: [],
	isError: false,
	error: null,
};

const holdingsStore = vi.hoisted(() => {
	let store: Record<string, { data: HeldKeyPosition[]; isError: boolean; error: Error | null }> = {};
	const listeners = new Set<() => void>();

	return {
		get: (address: string) => store[address] ?? EMPTY_HOLDINGS_ENTRY,
		set: (address: string, holdings: HeldKeyPosition[], isError = false, error: Error | null = null) => {
			store[address] = { data: holdings, isError, error };
			listeners.forEach(l => l());
		},
		reset: () => {
			store = {};
			listeners.forEach(l => l());
		},
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
});

vi.mock('wagmi', () => ({
	useAccount: vi.fn(() => ({ address: undefined, isConnected: false })),
}));

vi.mock('@/hooks/useWallet', async () => {
	const React = await import('react');
	return {
		useWalletHoldings: (address: string) => {
			const entry = React.useSyncExternalStore(
				holdingsStore.subscribe,
				() => holdingsStore.get(address),
				() => holdingsStore.get(address)
			);
			return {
				data: entry.data,
				isError: entry.isError,
				error: entry.error,
			};
		},
		useTradeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
	};
});

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

const mockUseAccount = vi.mocked(useAccount);
const mockGetCourses = vi.mocked(courseService.getCourses);

const WALLET_A = '0x1111111111111111111111111111111111111111';
const WALLET_B = '0x2222222222222222222222222222222222222222';
const WALLET_EMPTY = '0x0000000000000000000000000000000000000000';

const testCreators: Course[] = [
	{
		id: 'creator-alpha',
		title: 'Creator Alpha',
		description: 'Alpha creator',
		price: 0.1,
		priceStroops: 1_000_000,
		creatorShareSupply: 100,
		instructorId: 'alpha',
		category: 'Art',
		level: 'BEGINNER',
		isVerified: true,
	},
	{
		id: 'creator-beta',
		title: 'Creator Beta',
		description: 'Beta creator',
		price: 0.2,
		priceStroops: 2_000_000,
		creatorShareSupply: 50,
		instructorId: 'beta',
		category: 'Tech',
		level: 'ADVANCED',
		isVerified: true,
	},
	{
		id: 'creator-gamma',
		title: 'Creator Gamma',
		description: 'Gamma creator',
		price: 0.3,
		priceStroops: 3_000_000,
		creatorShareSupply: 75,
		instructorId: 'gamma',
		category: 'Finance',
		level: 'INTERMEDIATE',
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

const getHoldingsOverviewSection = () => {
	const heading = screen.getByRole('heading', { name: 'Total portfolio value' });
	const section = heading.closest('[aria-labelledby="holdings-overview-heading"]');
	expect(section).not.toBeNull();
	return section as HTMLElement;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LandingPage holdings refetch on wallet switch (#681)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
		mockGetCourses.mockResolvedValue(testCreators);
		holdingsStore.reset();

		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});
	});

	it('refetches and updates holdings when switching from Wallet A to Wallet B', async () => {
		// Seed Wallet A holdings (2 creators: Alpha with 5 keys & Beta with 2 keys)
		holdingsStore.set(WALLET_A, [
			{ creatorId: 'creator-alpha', quantity: 5, priceStroops: 1_000_000, price: 0.1, pending: false },
			{ creatorId: 'creator-beta', quantity: 2, priceStroops: 2_000_000, price: 0.2, pending: false },
		]);

		// Seed Wallet B holdings (1 creator: Gamma with 10 keys)
		holdingsStore.set(WALLET_B, [
			{ creatorId: 'creator-gamma', quantity: 10, priceStroops: 3_000_000, price: 0.3, pending: false },
		]);

		// 1. Connect Wallet A
		mockUseAccount.mockReturnValue({
			address: WALLET_A,
			isConnected: true,
		} as ReturnType<typeof useAccount>);

		const { rerender } = render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Assert Wallet A holdings are shown
		await waitFor(() => {
			expect(screen.getByText('5 keys · 0.1 XLM')).toBeInTheDocument();
		});
		expect(screen.getByText('2 keys · 0.2 XLM')).toBeInTheDocument();

		// 2. Switch to Wallet B
		mockUseAccount.mockReturnValue({
			address: WALLET_B,
			isConnected: true,
		} as ReturnType<typeof useAccount>);

		rerender(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Assert Wallet B holdings are shown
		await waitFor(() => {
			expect(screen.getByText('10 keys · 0.3 XLM')).toBeInTheDocument();
		});

		// Assert Wallet A holdings are absent after switch
		expect(screen.queryByText('5 keys · 0.1 XLM')).not.toBeInTheDocument();
		expect(screen.queryByText('2 keys · 0.2 XLM')).not.toBeInTheDocument();
	});

	it('handles switching to an empty wallet address smoothly without displaying stale holdings', async () => {
		holdingsStore.set(WALLET_A, [
			{ creatorId: 'creator-alpha', quantity: 3, priceStroops: 1_000_000, price: 0.1, pending: false },
		]);
		holdingsStore.set(WALLET_EMPTY, []);

		mockUseAccount.mockReturnValue({
			address: WALLET_A,
			isConnected: true,
		} as ReturnType<typeof useAccount>);

		const { rerender } = render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.getByText('3 keys · 0.1 XLM')).toBeInTheDocument();
		});

		// Switch to empty wallet
		mockUseAccount.mockReturnValue({
			address: WALLET_EMPTY,
			isConnected: true,
		} as ReturnType<typeof useAccount>);

		rerender(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Assert transition is smooth and clears wallet A holdings
		await waitFor(() => {
			expect(screen.queryByText('3 keys · 0.1 XLM')).not.toBeInTheDocument();
		});
		expect(getHoldingsOverviewSection()).toBeInTheDocument();
	});

	it('negative test — handles holdings query failure for new wallet without displaying stale holdings', async () => {
		holdingsStore.set(WALLET_A, [
			{ creatorId: 'creator-alpha', quantity: 4, priceStroops: 1_000_000, price: 0.1, pending: false },
		]);

		// Set Wallet B to an error state
		holdingsStore.set(WALLET_B, [], true, new Error('Network error fetching holdings'));

		mockUseAccount.mockReturnValue({
			address: WALLET_A,
			isConnected: true,
		} as ReturnType<typeof useAccount>);

		const { rerender } = render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.getByText('4 keys · 0.1 XLM')).toBeInTheDocument();
		});

		// Switch to Wallet B (whose query fails)
		mockUseAccount.mockReturnValue({
			address: WALLET_B,
			isConnected: true,
		} as ReturnType<typeof useAccount>);

		rerender(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Assert Wallet A's holdings are immediately removed and not displayed as stale data
		await waitFor(() => {
			expect(screen.queryByText('4 keys · 0.1 XLM')).not.toBeInTheDocument();
		});
		expect(getHoldingsOverviewSection()).toBeInTheDocument();
	});
});
