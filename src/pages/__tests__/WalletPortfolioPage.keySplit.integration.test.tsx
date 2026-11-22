/**
 * Integration tests for the Key Split 'Split Applied' badge and banner
 * on WalletPortfolioPage (#1151).
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import WalletPortfolioPage from '../WalletPortfolioPage';
import { clearSplitDismissal } from '@/utils/keySplit.utils';
import { keySplitEventService } from '@/services/keySplitEvents.service';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';
import type { Course } from '@/services/course.service';
import type { SplitExecutedEvent } from '@/types/keySplit';

const mockUseAccount = vi.fn();
vi.mock('wagmi', () => ({
	useAccount: (...args: unknown[]) => mockUseAccount(...args),
}));

const mockUseWalletHoldings = vi.fn();
vi.mock('@/hooks/useWallet', () => ({
	useWalletHoldings: (...args: unknown[]) => mockUseWalletHoldings(...args),
}));

vi.mock('@/components/common/BadgeProgressTracker', () => ({
	default: () => null,
}));

const mockUseCreatorPrices = vi.fn();
vi.mock('@/hooks/useCreatorPrices', () => ({
	useCreatorPrices: (...args: unknown[]) => mockUseCreatorPrices(...args),
}));

const WALLET = 'GPORTFOLIOTESTWALLET';

const RECENT_SPLIT: SplitExecutedEvent = {
	keyId: 'alpha',
	ratio: 2,
	executedAt: new Date(Date.now() - 3600 * 1000).toISOString(), // 1h ago
	preSplitBalance: 10,
	postSplitBalance: 20,
};

const EXPIRED_SPLIT: SplitExecutedEvent = {
	keyId: 'beta',
	ratio: 2,
	executedAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(), // 50h ago
	preSplitBalance: 5,
	postSplitBalance: 10,
};

const HOLDINGS: HeldKeyPosition[] = [
	{
		creatorId: 'alpha',
		quantity: 20,
		averagePurchasePriceStroops: 1_000_000,
		priceStroops: 2_000_000,
	},
	{
		creatorId: 'beta',
		quantity: 10,
		averagePurchasePriceStroops: 2_000_000,
		priceStroops: 1_000_000,
	},
];

const CREATORS: Course[] = [
	{
		id: 'alpha',
		title: 'Alpha Key',
		description: '',
		instructorId: 'creator-a',
		category: 'Art',
		level: 'BEGINNER',
		priceStroops: 2_000_000,
		recentSplit: RECENT_SPLIT,
	},
	{
		id: 'beta',
		title: 'Beta Key',
		description: '',
		instructorId: 'creator-b',
		category: 'Music',
		level: 'BEGINNER',
		priceStroops: 1_000_000,
		recentSplit: EXPIRED_SPLIT,
	},
];

function mockWallet({
	address = WALLET,
	holdings = HOLDINGS,
	creators = CREATORS,
	isLoading = false,
}: {
	address?: string | null;
	holdings?: HeldKeyPosition[];
	creators?: Course[];
	isLoading?: boolean;
} = {}) {
	mockUseAccount.mockReturnValue({ address });
	mockUseWalletHoldings.mockReturnValue({ data: holdings, isLoading, refetch: vi.fn() });
	mockUseCreatorPrices.mockReturnValue({ data: creators, isLoading });
}

function renderPage() {
	return render(
		<MemoryRouter initialEntries={['/portfolio']}>
			<Routes>
				<Route path="/portfolio" element={<WalletPortfolioPage />} />
			</Routes>
		</MemoryRouter>
	);
}

describe('WalletPortfolioPage Key Split Badge & Banner (#1151)', () => {
	beforeEach(() => {
		clearSplitDismissal();
		keySplitEventService.reset();
		vi.clearAllMocks();
		mockWallet();
	});

	it('renders "Split Applied" badge on split keys within 48h and omits for expired splits', async () => {
		renderPage();

		await waitFor(() => {
			expect(
				screen.getByTestId('portfolio-positions-table')
			).toBeInTheDocument();
		});

		const rows = screen.getAllByTestId('portfolio-position-row');
		expect(rows).toHaveLength(2);

		// Alpha key has active split (< 48h) -> should have Split Applied badge
		const alphaRow = rows[0];
		expect(
			within(alphaRow).getByTestId('split-applied-badge')
		).toBeInTheDocument();
		expect(
			within(alphaRow).getByTestId('split-applied-badge')
		).toHaveTextContent('Split Applied');

		// Beta key has expired split (> 48h) -> should NOT have Split Applied badge
		const betaRow = rows[1];
		expect(
			within(betaRow).queryByTestId('split-applied-badge')
		).not.toBeInTheDocument();
	});

	it('displays split notification banner on portfolio page with ratio, pre-split, and post-split balances', async () => {
		renderPage();

		await waitFor(() => {
			expect(screen.getByTestId('key-split-banner')).toBeInTheDocument();
		});

		expect(screen.getByTestId('split-ratio')).toHaveTextContent('2:1');
		expect(screen.getByTestId('pre-split-balance')).toHaveTextContent('10');
		expect(screen.getByTestId('post-split-balance')).toHaveTextContent('20');
	});

	it('dismisses split banner for session on portfolio page while keeping badge visible', async () => {
		const user = userEvent.setup();
		const { unmount } = renderPage();

		await waitFor(() => {
			expect(screen.getByTestId('key-split-banner')).toBeInTheDocument();
		});

		const dismissBtn = screen.getByTestId('split-banner-dismiss');
		await user.click(dismissBtn);

		expect(screen.queryByTestId('key-split-banner')).not.toBeInTheDocument();

		// Badge remains visible on the row
		const rows = screen.getAllByTestId('portfolio-position-row');
		expect(
			within(rows[0]).getByTestId('split-applied-badge')
		).toBeInTheDocument();

		// Remains dismissed in same session upon re-mount
		unmount();
		renderPage();

		expect(screen.queryByTestId('key-split-banner')).not.toBeInTheDocument();
		expect(
			within(screen.getAllByTestId('portfolio-position-row')[0]).getByTestId('split-applied-badge')
		).toBeInTheDocument();
	});
});
