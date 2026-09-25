import type { ComponentProps, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
			mutateAsync: async ({
				creatorId,
				amount,
				priceStroops,
				price,
			}: {
				creatorId: string;
				amount: number;
				priceStroops: number | null | undefined;
				price: number | null | undefined;
			}) => {
				const current = holdingsStore.get();
				const existing = current.find(entry => entry.creatorId === creatorId);

				if (existing) {
					holdingsStore.set(
						current.map(entry =>
							entry.creatorId === creatorId
								? {
										...entry,
										quantity: (entry.quantity ?? 0) + amount,
										priceStroops,
										price,
										pending: false,
									}
								: entry
						)
					);
				} else {
					holdingsStore.set([
						...current,
						{
							creatorId,
							quantity: amount,
							priceStroops,
							price,
							pending: false,
						},
					]);
				}

				return { success: true as const };
			},
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

const creators: Course[] = [
	{
		id: '1',
		title: 'Featured Creator',
		description: 'Featured creator',
		price: 100,
		priceStroops: 1_000_000_000,
		creatorShareSupply: 100,
		instructorId: 'featured',
		category: 'Art',
		level: 'BEGINNER',
		isVerified: true,
	},
	{
		id: '2',
		title: 'Existing Creator',
		description: 'Existing creator',
		price: 500,
		priceStroops: 5_000_000_000,
		creatorShareSupply: 50,
		instructorId: 'existing',
		category: 'Tech',
		level: 'ADVANCED',
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

describe('LandingPage holdings grand total after buy confirmation (#660)', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
		mockGetCourses.mockResolvedValue(creators);
		holdingsStore.set([
			{
				creatorId: '1',
				quantity: 0,
				priceStroops: 1_000_000_000,
				price: 100,
				pending: false,
			},
			{
				creatorId: '2',
				quantity: 1,
				priceStroops: 5_000_000_000,
				price: 500,
				pending: false,
			},
		]);
	});

	afterEach(() => {
		cleanup();
	});

	it('updates the holdings grand total immediately after a buy confirmation and shows the new holding entry', async () => {
		render(
			<QueryClientProvider
				client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
			>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);

		expect(await screen.findByText('500 XLM')).toBeInTheDocument();
		expect(screen.getByText('1 keys · 500 XLM')).toBeInTheDocument();
		expect(screen.queryByText('2 keys · 100 XLM')).not.toBeInTheDocument();

		const [buyButton] = screen.getAllByRole('button', { name: 'Buy' });
		fireEvent.click(buyButton);

		fireEvent.change(await screen.findByTestId('trade-dialog-amount'), {
			target: { value: '2' },
		});
		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

		await waitFor(() => {
			expect(screen.getByText('700 XLM')).toBeInTheDocument();
		});
		expect(screen.getByText('2 keys · 100 XLM')).toBeInTheDocument();
		expect(screen.getByText('1 keys · 500 XLM')).toBeInTheDocument();
	});
});
