/**
 * Integration test for holdings grand total summing across multiple held creators (#598).
 *
 * The holdings overview should display a grand total XLM value that equals the
 * sum of all individual creator holding values (quantity × priceStroops each).
 * This test seeds three holdings with known values via the react-query cache,
 * asserts the grand total matches the expected sum, and verifies the total
 * re-calculates when cache data changes.
 *
 * Acceptance Criteria:
 * - Grand total displayed on holdings page
 * - Grand total equals the sum of all individual total_value fields
 * - Grand total updates when holdings cache changes
 * - Grand total formatted using XLM display format
 */
import type { ComponentProps, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import { courseService, type Course } from '@/services/course.service';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';

const holdingsStore = vi.hoisted(() => {
	let holdings: HeldKeyPosition[] = [];
	const listeners = new Set<() => void>();

	return {
		get: () => holdings,
		set: (next: HeldKeyPosition[]) => {
			holdings = next;
			listeners.forEach(listener => listener());
		},
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
});

vi.mock('@/hooks/useWallet', async () => {
	const React = await import('react');

	return {
		useWalletHoldings: () => ({
			data: React.useSyncExternalStore(
				holdingsStore.subscribe,
				holdingsStore.get,
				holdingsStore.get
			),
		}),
		useTradeMutation: () => ({
			isPending: false,
			mutateAsync: vi.fn(),
		}),
	};
});

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

// Three creators at prices that sum to 400 XLM:
//   Creator A: priceStroops 1_000_000_000 (100 XLM/key) with quantity 1
//   Creator B: priceStroops 2_500_000_000 (250 XLM/key) with quantity 1
//   Creator C: priceStroops   500_000_000 ( 50 XLM/key) with quantity 1
//   Total: 1_000_000_000 + 2_500_000_000 + 500_000_000 = 4_000_000_000 stroops = 400 XLM
const threeHoldingsCreators: Course[] = [
	{
		id: 'creator-a',
		title: 'Creator A',
		description: 'Digital artist',
		price: 100,
		priceStroops: 1_000_000_000,
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
		price: 250,
		priceStroops: 2_500_000_000,
		creatorShareSupply: 50,
		instructorId: 'creator-b',
		category: 'Tech',
		level: 'ADVANCED',
		isVerified: true,
	},
	{
		id: 'creator-c',
		title: 'Creator C',
		description: 'Strategist',
		price: 50,
		priceStroops: 500_000_000,
		creatorShareSupply: 75,
		instructorId: 'creator-c',
		category: 'Finance',
		level: 'INTERMEDIATE',
		isVerified: false,
	},
];

const holdingsSeed: HeldKeyPosition[] = [
	{
		creatorId: 'creator-a',
		quantity: 1,
		priceStroops: 1_000_000_000,
		price: 100,
		pending: false,
	},
	{
		creatorId: 'creator-b',
		quantity: 1,
		priceStroops: 2_500_000_000,
		price: 250,
		pending: false,
	},
	{
		creatorId: 'creator-c',
		quantity: 1,
		priceStroops: 500_000_000,
		price: 50,
		pending: false,
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

describe('LandingPage holdings grand total sum (#598)', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
		mockGetCourses.mockResolvedValue(threeHoldingsCreators);
		holdingsStore.set(holdingsSeed);
	});

	afterEach(() => {
		cleanup();
	});

	it('displays grand total equal to the sum of all held positions', async () => {
		render(
			<QueryClientProvider
				client={
					new QueryClient({ defaultOptions: { queries: { retry: false } } })
				}
			>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Grand total: 1 × 1_000_000_000 + 1 × 2_500_000_000 + 1 × 500_000_000
		// = 4_000_000_000 stroops = 400 XLM
		expect(await screen.findByText('400 XLM')).toBeInTheDocument();
		expect(
			screen.getByText('Across 3 held creator positions.')
		).toBeInTheDocument();
	});

	it('recalculates grand total when a holding quantity changes in the cache', async () => {
		render(
			<QueryClientProvider
				client={
					new QueryClient({ defaultOptions: { queries: { retry: false } } })
				}
			>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Assert initial total of 400 XLM
		expect(await screen.findByText('400 XLM')).toBeInTheDocument();

		// Update Creator C's quantity from 1 to 2:
		// New total: 100 XLM + 250 XLM + 2 × 50 XLM = 450 XLM
		holdingsStore.set(
			holdingsSeed.map(h =>
				h.creatorId === 'creator-c' ? { ...h, quantity: 2 } : h
			)
		);

		await waitFor(() => {
			expect(screen.getByText('450 XLM')).toBeInTheDocument();
		});
		expect(
			screen.getByText('Across 3 held creator positions.')
		).toBeInTheDocument();
	});

	it('recalculates grand total when a holding quantity decreases in the cache', async () => {
		render(
			<QueryClientProvider
				client={
					new QueryClient({ defaultOptions: { queries: { retry: false } } })
				}
			>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Assert initial total of 400 XLM
		expect(await screen.findByText('400 XLM')).toBeInTheDocument();
		expect(
			screen.getByText('Across 3 held creator positions.')
		).toBeInTheDocument();

		// Decrease Creator B's quantity from 1 to 0:
		// New total: 100 XLM + 0 XLM + 50 XLM = 150 XLM
		holdingsStore.set(
			holdingsSeed.map(h =>
				h.creatorId === 'creator-b' ? { ...h, quantity: 0 } : h
			)
		);

		await waitFor(() => {
			expect(screen.getByText('150 XLM')).toBeInTheDocument();
		});
		expect(
			screen.getByText('Across 2 held creator positions.')
		).toBeInTheDocument();
	});

	it('shows empty state when no held positions have positive quantity', async () => {
		holdingsStore.set(
			holdingsSeed.map(h => ({ ...h, quantity: 0 }))
		);

		render(
			<QueryClientProvider
				client={
					new QueryClient({ defaultOptions: { queries: { retry: false } } })
				}
			>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);

		expect(await screen.findByText('No held creator keys yet.')).toBeInTheDocument();
	});
});
