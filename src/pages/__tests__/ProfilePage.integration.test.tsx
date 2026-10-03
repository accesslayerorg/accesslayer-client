import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import ProfilePage from '@/pages/ProfilePage';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';
import type { Course } from '@/services/course.service';
import type { Trade } from '@/services/tradeHistory.service';

const {
	mockUseWalletHoldings,
	mockUseTradeHistory,
	mockUseCreatorPrices,
	mockUseStakingPositions,
	mockUseAccount,
} = vi.hoisted(() => ({
	mockUseWalletHoldings: vi.fn(),
	mockUseTradeHistory: vi.fn(),
	mockUseCreatorPrices: vi.fn(),
	mockUseStakingPositions: vi.fn(),
	mockUseAccount: vi.fn(),
}));

vi.mock('@/hooks/useWallet', () => ({
	useWalletHoldings: (...args: unknown[]) => mockUseWalletHoldings(...args),
	useTradeHistory: (...args: unknown[]) => mockUseTradeHistory(...args),
	useClaimStakeMutation: () => ({
		mutate: vi.fn(),
		isPending: false,
		variables: null,
	}),
}));

vi.mock('@/hooks/useCreatorPrices', () => ({
	useCreatorPrices: (...args: unknown[]) => mockUseCreatorPrices(...args),
}));

vi.mock('@/hooks/useStakingPositions', () => ({
	useStakingPositions: (...args: unknown[]) =>
		mockUseStakingPositions(...args),
}));

vi.mock('wagmi', () => ({
	useAccount: (...args: unknown[]) => mockUseAccount(...args),
}));

const DEMO_WALLET =
	'GDEMOWALLET0000000000000000000000000000000000000000000000001';
const PUBLIC_WALLET =
	'GPUBLICWALLET0000000000000000000000000000000000000000000002';
// A different connected wallet used for the public-view test.
const CONNECTED_WALLET =
	'GCONNECTEDWALLET000000000000000000000000000000000000000000003';

const heldPositions: HeldKeyPosition[] = [
	{
		creatorId: 'creator-1',
		quantity: 4,
		priceStroops: 2_500_000,
		price: null,
	},
];

const creators: Course[] = [
	{
		id: 'creator-1',
		title: 'Alpha Creator',
		description: '',
		price: 0,
		instructorId: 'creator-1',
		category: 'creators',
		level: 'BEGINNER',
	},
];

const stakingPositions = [
	{
		id: 'pos-1',
		keyId: 'creator-1',
		keyName: 'Alpha Key',
		stakedQuantity: 120,
		unlockLedger: Math.floor(
			new Date('2001-01-01T00:00:00Z').getTime() / 1000
		),
		claimableReward: 1_250_000,
		priceStroops: 2_500_000,
		price: null,
	},
];

const trade: Trade = {
	id: 'trade-1',
	keyName: 'Alpha Key',
	tradeType: 'Buy',
	quantity: 2,
	pricePerKey: 1.5,
	timestamp: Date.now(),
	transactionHash: null,
};

// IntersectionObserver stub so the trade-history infinite-scroll sentinel
// can be observed (mirrors src/hooks/__tests__/useInfiniteScroll.test.tsx).
const observers: {
	callback: IntersectionObserverCallback;
}[] = [];

function renderProfile(path: string) {
	return render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route
					path="/profile"
					element={
						<div data-testid="profile-root">
							<ProfilePage />
						</div>
					}
				/>
				<Route
					path="/profile/:wallet"
					element={
						<div data-testid="profile-root">
							<ProfilePage />
						</div>
					}
				/>
			</Routes>
		</MemoryRouter>
	);
}

function seedOwnerView(connectedAddress?: string) {
	mockUseAccount.mockReturnValue({
		address: connectedAddress,
		isConnected: !!connectedAddress,
	});
	mockUseWalletHoldings.mockReturnValue({
		data: heldPositions,
		isLoading: false,
	});
	mockUseCreatorPrices.mockReturnValue({ data: creators, isLoading: false });
	mockUseStakingPositions.mockReturnValue({
		data: { positions: stakingPositions },
		isLoading: false,
		isError: false,
	});
	mockUseTradeHistory.mockReturnValue({
		data: { pages: [{ trades: [trade], nextCursor: null }] },
		fetchNextPage: vi.fn(),
		hasNextPage: false,
		isFetchingNextPage: false,
		isLoading: false,
		isError: false,
	});
}

function simulateIntersection(isIntersecting: boolean) {
	const obs = observers[observers.length - 1];
	act(() => {
		obs.callback(
			[{ isIntersecting } as IntersectionObserverEntry],
			{} as IntersectionObserver
		);
	});
}

describe('ProfilePage — user profile page (#921)', () => {
	beforeEach(() => {
		observers.length = 0;

		class MockIntersectionObserver {
			callback: IntersectionObserverCallback;
			observe = vi.fn();
			disconnect = vi.fn();
			unobserve = vi.fn();
			constructor(cb: IntersectionObserverCallback) {
				this.callback = cb;
				observers.push({ callback: cb });
			}
		}

		vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: vi.fn().mockResolvedValue(undefined) },
			configurable: true,
		});

		mockUseWalletHoldings.mockReset();
		mockUseTradeHistory.mockReset();
		mockUseCreatorPrices.mockReset();
		mockUseStakingPositions.mockReset();
		mockUseAccount.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('shows the owner portfolio total as the sum of held keys and staking positions', () => {
		seedOwnerView();
		renderProfile('/profile');

		expect(
			screen.getByRole('heading', { name: 'My Portfolio' })
		).toBeInTheDocument();

		// Held keys: 0.25 XLM × 4 = 1 XLM. Staked: 0.25 XLM × 120 = 30 XLM.
		// Portfolio total sums both: 31 XLM.
		expect(
			screen.getByTestId('portfolio-summary-held-value')
		).toHaveTextContent('1 XLM');
		expect(
			screen.getByTestId('portfolio-summary-staked-value')
		).toHaveTextContent('30 XLM');
		expect(screen.getByTestId('portfolio-summary-total')).toHaveTextContent(
			'31 XLM'
		);
	});

	it('prefers current creator prices over cached holding and staking prices', () => {
		seedOwnerView();
		mockUseCreatorPrices.mockReturnValue({
			data: [{ ...creators[0], priceStroops: 5_000_000 }],
			isLoading: false,
		});

		renderProfile('/profile');

		expect(
			screen.getByTestId('portfolio-summary-held-value')
		).toHaveTextContent('2 XLM');
		expect(
			screen.getByTestId('portfolio-summary-staked-value')
		).toHaveTextContent('60 XLM');
		expect(screen.getByTestId('portfolio-summary-total')).toHaveTextContent(
			'62 XLM'
		);
	});

	it('renders held keys with bond-curve values on the holdings panel', () => {
		seedOwnerView();
		renderProfile('/profile');

		const card = screen.getByTestId('holding-card-creator-1');
		expect(card).toHaveTextContent('Alpha Creator');
		expect(
			screen.getByTestId('holding-current-value-creator-1')
		).toHaveTextContent('1 XLM');
		expect(
			screen.getByRole('link', { name: 'Buy Alpha Creator' })
		).toBeInTheDocument();
	});

	it('copies the public profile link from the share button', async () => {
		seedOwnerView();
		renderProfile('/profile');

		const writeText = navigator.clipboard.writeText as ReturnType<
			typeof vi.fn
		>;
		writeText.mockClear();

		screen.getByTestId('share-profile-button').click();

		await vi.waitFor(() => {
			expect(writeText).toHaveBeenCalledTimes(1);
			expect(writeText.mock.calls[0][0]).toContain(
				`/profile/${DEMO_WALLET}`
			);
		});
	});

	it('loads more trade history via infinite scroll on the trade tab', async () => {
		seedOwnerView();
		mockUseTradeHistory.mockReturnValue({
			data: { pages: [{ trades: [trade], nextCursor: 'cursor-2' }] },
			fetchNextPage: vi.fn(),
			hasNextPage: true,
			isFetchingNextPage: false,
			isLoading: false,
			isError: false,
		});

		renderProfile('/profile?tab=trade-history');
		const { fetchNextPage } = mockUseTradeHistory.mock.results[0].value;

		expect(
			screen.getByTestId('trade-history-load-more-sentinel')
		).toBeInTheDocument();

		simulateIntersection(true);
		expect(fetchNextPage).toHaveBeenCalledTimes(1);
	});

	it('renders staking positions with lock status and claimable rewards on the staking tab', () => {
		seedOwnerView();
		renderProfile('/profile?tab=staking&subtab=positions');

		expect(screen.getByTestId('staking-position-pos-1')).toBeInTheDocument();
		expect(screen.getByTestId('staking-lock-status-pos-1')).toHaveTextContent(
			'Unlocked'
		);
		expect(screen.getByTestId('staking-claimable-pos-1')).toHaveTextContent(
			'0.1250 XLM'
		);
		expect(screen.getByTestId('staking-claim-pos-1')).toBeInTheDocument();
	});

	it('hides wallet-specific actions on a public profile view', () => {
		seedOwnerView(CONNECTED_WALLET);
		renderProfile(`/profile/${PUBLIC_WALLET}`);

		expect(
			screen.getByRole('heading', { name: 'Portfolio' })
		).toBeInTheDocument();

		// No owner-only actions.
		expect(
			screen.queryByTestId('share-profile-button')
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('link', { name: /Buy/ })
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('link', { name: /Sell/ })
		).not.toBeInTheDocument();

		// Valuation is still shown publicly.
		expect(
			screen.getByTestId('holding-current-value-creator-1')
		).toHaveTextContent('1 XLM');
		expect(screen.getByTestId('portfolio-summary-total')).toHaveTextContent(
			'31 XLM'
		);
	});

	it('renders staking positions read-only on a public profile', () => {
		seedOwnerView(CONNECTED_WALLET);
		renderProfile(`/profile/${PUBLIC_WALLET}?tab=staking`);

		expect(screen.getByTestId('staking-position-pos-1')).toBeInTheDocument();
		expect(
			screen.queryByTestId('staking-claim-pos-1')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('staking-claimable-pos-1')
		).not.toBeInTheDocument();
	});
});
