import type { ComponentProps, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import { courseService, type Course } from '@/services/course.service';
import { useKeyCostBasis } from '@/hooks/useKeyCostBasis';

const WALLET = '0xPnlWallet';
const CREATOR_ID = 'creator-a';

const mockHoldings = vi.fn();

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

// Creator A: 5 keys held, live sell price 0.12 XLM (1_200_000 stroops).
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

describe('LandingPage — portfolio unrealised P&L (#935)', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		mockGetCourses.mockReset();
		mockHoldings.mockReset();
		mockHoldings.mockReturnValue([]);
		useKeyCostBasis.setState({ entriesByWallet: {} });
	});

	it('shows a green total unrealised P&L derived from the average purchase price', async () => {
		// 5 keys bought at 0.05 XLM (0.25 XLM invested), now worth 0.12 XLM each
		// (0.6 XLM) => +0.35 XLM (+140.0%).
		mockHoldings.mockReturnValue([
			{
				creatorId: CREATOR_ID,
				quantity: 5,
				averagePurchasePriceStroops: 500_000,
			},
		]);
		mockGetCourses.mockResolvedValue(seededCreators);

		renderLandingPage();

		const unrealised = await screen.findByTestId('pnl-summary-unrealised');

		expect(screen.getByTestId('pnl-summary-invested')).toHaveTextContent(
			'0.25 XLM'
		);
		expect(screen.getByTestId('pnl-summary-current-value')).toHaveTextContent(
			'+0.60 XLM'
		);
		expect(unrealised).toHaveTextContent('+0.35 XLM (+140.0%)');
		expect(unrealised.className).toContain('emerald');
	});

	it('shows a red total unrealised P&L when the curve price falls below the basis', async () => {
		// 5 keys bought at 0.5 XLM (2.5 XLM invested), now worth 0.12 XLM each
		// (0.6 XLM) => -1.90 XLM (-76.0%).
		mockHoldings.mockReturnValue([
			{
				creatorId: CREATOR_ID,
				quantity: 5,
				averagePurchasePriceStroops: 5_000_000,
			},
		]);
		mockGetCourses.mockResolvedValue(seededCreators);

		renderLandingPage();

		const unrealised = await screen.findByTestId('pnl-summary-unrealised');

		expect(unrealised).toHaveTextContent('-1.90 XLM (-76.0%)');
		expect(unrealised.className).toContain('red');
	});

	it('aggregates the tracked cost basis of every held position', async () => {
		const secondCreator: Course = {
			id: 'creator-b',
			title: 'Creator B',
			description: 'Developer',
			price: 0.04,
			priceStroops: 400_000,
			creatorShareSupply: 20,
			instructorId: 'creator-b',
			category: 'Tech',
			level: 'ADVANCED',
			isVerified: false,
		};

		// Creator A: 5 keys @ 0.05 basis => invested 0.25, current 0.6, +0.35.
		// Creator B: 10 keys @ 0.02 basis => invested 0.2, current 0.4, +0.2.
		mockHoldings.mockReturnValue([
			{
				creatorId: CREATOR_ID,
				quantity: 5,
				averagePurchasePriceStroops: 500_000,
			},
			{
				creatorId: 'creator-b',
				quantity: 10,
				averagePurchasePriceStroops: 200_000,
			},
		]);
		mockGetCourses.mockResolvedValue([...seededCreators, secondCreator]);

		renderLandingPage();

		await screen.findByTestId('pnl-summary-unrealised');

		expect(screen.getByTestId('pnl-summary-invested')).toHaveTextContent(
			'0.45 XLM'
		);
		expect(screen.getByTestId('pnl-summary-current-value')).toHaveTextContent(
			'+1.00 XLM'
		);
		expect(screen.getByTestId('pnl-summary-unrealised')).toHaveTextContent(
			'+0.55 XLM'
		);
		expect(screen.getByTestId('pnl-summary-caption')).toHaveTextContent(
			'across 2 positions'
		);
	});

	it('renders a per-position P&L for each held key', async () => {
		mockHoldings.mockReturnValue([
			{
				creatorId: CREATOR_ID,
				quantity: 5,
				averagePurchasePriceStroops: 500_000,
			},
		]);
		mockGetCourses.mockResolvedValue(seededCreators);

		renderLandingPage();

		const rowPnl = await screen.findByTestId('holding-pnl');

		expect(rowPnl).toHaveTextContent('Avg buy 0.05 XLM');
		expect(rowPnl).toHaveTextContent('Current 0.6 XLM');
		expect(screen.getByTestId('holding-pnl-value')).toHaveTextContent(
			'+0.35 XLM (+140.0%)'
		);
	});
});
