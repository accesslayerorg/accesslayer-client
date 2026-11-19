import type { ComponentProps, ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import { courseService, type Course } from '@/services/course.service';
import { useKeyCostBasis } from '@/hooks/useKeyCostBasis';
import { DAY_MS } from '@/utils/portfolioHistory.utils';

const WALLET = '0xPortfolioHistoryWallet';
const CREATOR_ID = 'creator-a';

const mockHoldings = vi.fn();
const mockFetchPortfolioHistory = vi.fn();

vi.mock('@/hooks/useWallet', async () => {
	const actual =
		await vi.importActual<typeof import('@/hooks/useWallet')>(
			'@/hooks/useWallet'
		);

	return {
		...actual,
		useTradeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
		useWalletHoldings: () => ({ data: mockHoldings() }),
	};
});

vi.mock('@/services/portfolioHistory.service', () => ({
	fetchPortfolioHistory: (...args: unknown[]) =>
		mockFetchPortfolioHistory(...args),
}));

vi.mock('@/services/course.service', () => ({
	courseService: {
		getCourses: vi.fn(),
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
			React.createElement('article', null, creator.title),
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
			h1: ({ children, ...props }: MotionDivProps) =>
				React.createElement('h1', props, children),
			button: ({ children, ...props }: MotionDivProps) =>
				React.createElement('button', props, children),
		},
	};
});

const seededCreators: Course[] = [
	{
		id: CREATOR_ID,
		title: 'Creator A',
		description: 'Digital artist',
		price: 0.12,
		priceStroops: 1_200_000,
		creatorShareSupply: 50,
		instructorId: 'creator-a',
		category: 'Art',
		level: 'BEGINNER',
		isVerified: true,
	},
];

const mockGetCourses = vi.mocked(courseService.getCourses);

const NOW = Date.now();

const portfolioHistory = [
	{
		timestamp: new Date(NOW - 80 * DAY_MS).toISOString(),
		value: 100,
		benchmark: 200,
	},
	{
		timestamp: new Date(NOW - 20 * DAY_MS).toISOString(),
		value: 120,
		benchmark: 220,
	},
	{
		timestamp: new Date(NOW - 3 * DAY_MS).toISOString(),
		value: 150,
		benchmark: 260,
	},
];

const mockMatchMedia = () => {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
};

const connectedAccount = { address: WALLET } as unknown as ReturnType<
	typeof import('wagmi').useAccount
>;

vi.mock('wagmi', async () => {
	const actual = await vi.importActual<typeof import('wagmi')>('wagmi');

	return {
		...actual,
		useAccount: () => connectedAccount,
	};
});

function renderLandingPage() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		</QueryClientProvider>
	);
}

describe('LandingPage — portfolio performance chart (#1052)', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		mockGetCourses.mockReset();
		mockHoldings.mockReset();
		mockHoldings.mockReturnValue([]);
		mockFetchPortfolioHistory.mockReset();
		useKeyCostBasis.setState({ entriesByWallet: {} });
	});

	it('renders the portfolio performance chart from the history service', async () => {
		mockGetCourses.mockResolvedValue(seededCreators);
		mockFetchPortfolioHistory.mockResolvedValue(portfolioHistory);

		renderLandingPage();

		expect(
			await screen.findByTestId('portfolio-performance-chart')
		).toBeInTheDocument();
		expect(mockFetchPortfolioHistory).toHaveBeenCalledWith(WALLET, 'all');
		// Default 30d window: 120 -> 150 = +25%.
		expect(
			screen.getByTestId('portfolio-performance-return')
		).toHaveTextContent('+25.0% return');
	});

	it('switches the chart to the full history range', async () => {
		mockGetCourses.mockResolvedValue(seededCreators);
		mockFetchPortfolioHistory.mockResolvedValue(portfolioHistory);

		renderLandingPage();

		await screen.findByTestId('portfolio-performance-series');

		const allRange = screen.getByTestId('portfolio-range-all');
		fireEvent.click(allRange);

		expect(allRange).toHaveAttribute('aria-pressed', 'true');
		// Full series: 100 -> 150 = +50%.
		expect(
			screen.getByTestId('portfolio-performance-return')
		).toHaveTextContent('+50.0% return');
	});

	it('keeps the chart empty when the wallet has no portfolio history', async () => {
		mockGetCourses.mockResolvedValue(seededCreators);
		mockFetchPortfolioHistory.mockResolvedValue([]);

		renderLandingPage();

		expect(
			await screen.findByTestId('portfolio-performance-empty')
		).toBeInTheDocument();
	});
});
