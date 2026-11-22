import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import WalletPortfolioPage from '../WalletPortfolioPage';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';
import type { Course } from '@/services/course.service';

const mockUseAccount = vi.fn();
vi.mock('wagmi', () => ({
	useAccount: (...args: unknown[]) => mockUseAccount(...args),
}));

const mockUseWalletHoldings = vi.fn();
vi.mock('@/hooks/useWallet', () => ({
	useWalletHoldings: (...args: unknown[]) => mockUseWalletHoldings(...args),
}));

// Badge progress (#1225) is covered by BadgeProgressTracker's own tests.
vi.mock('@/components/common/BadgeProgressTracker', () => ({
	default: () => null,
}));

const mockUseCreatorPrices = vi.fn();
vi.mock('@/hooks/useCreatorPrices', () => ({
	useCreatorPrices: (...args: unknown[]) => mockUseCreatorPrices(...args),
}));

const WALLET = 'GPORTFOLIOTESTWALLET';

/** +100%: 10 keys bought at 0.1 XLM, now 0.2 XLM each. */
const GAIN: HeldKeyPosition = {
	creatorId: 'alpha',
	quantity: 10,
	averagePurchasePriceStroops: 1_000_000,
	priceStroops: 2_000_000,
};

/** -50%: 5 keys bought at 0.2 XLM, now 0.1 XLM each. */
const LOSS: HeldKeyPosition = {
	creatorId: 'beta',
	quantity: 5,
	averagePurchasePriceStroops: 2_000_000,
	priceStroops: 1_000_000,
};

const CREATORS: Course[] = [
	{
		id: 'alpha',
		title: 'Zeta Key',
		description: '',
		instructorId: 'creator-a',
		category: 'Art',
		level: 'BEGINNER',
		priceStroops: 2_000_000,
	},
	{
		id: 'beta',
		title: 'Alpha Key',
		description: '',
		instructorId: 'creator-b',
		category: 'Music',
		level: 'BEGINNER',
		priceStroops: 1_000_000,
	},
];

function mockWallet({
	address = WALLET,
	holdings = [GAIN, LOSS] as HeldKeyPosition[],
	creators = CREATORS as Course[],
	isLoading = false,
}: {
	address?: string | null;
	holdings?: HeldKeyPosition[];
	creators?: Course[];
	isLoading?: boolean;
} = {}) {
	mockUseAccount.mockReturnValue({ address });
	mockUseWalletHoldings.mockReturnValue({ data: holdings, isLoading });
	mockUseCreatorPrices.mockReturnValue({ data: creators, isLoading });
}

function renderPage() {
	return render(
		<MemoryRouter initialEntries={['/portfolio']}>
			<Routes>
				<Route path="/portfolio" element={<WalletPortfolioPage />} />
				<Route
					path="/creator/:id"
					element={<div data-testid="navigated-detail" />}
				/>
			</Routes>
		</MemoryRouter>
	);
}

function renderedRowIds(): string[] {
	return screen
		.getAllByTestId('portfolio-position-row')
		.map(row => row.getAttribute('data-key-id'));
}

describe('WalletPortfolioPage (#1116)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockWallet();
	});

	it('renders summary cards with total value and total unrealised PnL', async () => {
		renderPage();

		await waitFor(() => {
			expect(
				screen.getByTestId('portfolio-positions-table')
			).toBeInTheDocument();
		});

		// Value: 10 × 0.2 XLM + 5 × 0.1 XLM = 2.5 XLM.
		expect(screen.getByTestId('portfolio-total-value')).toHaveTextContent(
			'2.5 XLM'
		);
		// PnL: (2.5 − 2.0) XLM = +0.50 XLM, +25%.
		expect(screen.getByTestId('portfolio-total-pnl')).toHaveTextContent(
			'+0.50 XLM'
		);
		expect(
			screen.getByTestId('portfolio-total-pnl-percent')
		).toHaveTextContent('+25');
	});

	it('renders one row per holding with per-position PnL', async () => {
		renderPage();

		await waitFor(() => {
			expect(renderedRowIds()).toEqual(['alpha', 'beta']);
		});

		const rows = screen.getAllByTestId('portfolio-position-row');
		expect(
			within(rows[0]).getByRole('link', { name: 'Zeta Key' })
		).toHaveAttribute('href', '/creator/alpha');
		expect(
			within(rows[0]).getByTestId('portfolio-row-pnl')
		).toHaveTextContent('+1.00 XLM');
		expect(
			within(rows[0]).getByTestId('portfolio-row-pnl-percent')
		).toHaveTextContent('+100');
		expect(
			within(rows[1]).getByTestId('portfolio-row-pnl-percent')
		).toHaveTextContent('-50');
	});

	it('re-sorts the table when a sortable header is clicked', async () => {
		const user = userEvent.setup();
		renderPage();

		await waitFor(() => {
			expect(renderedRowIds()).toEqual(['alpha', 'beta']);
		});

		// Default order is current value descending (2 XLM before 0.5 XLM).
		await user.click(screen.getByTestId('portfolio-sort-key_name'));

		// Key name ascending: "Alpha Key" (beta) before "Zeta Key" (alpha).
		await waitFor(() => {
			expect(renderedRowIds()).toEqual(['beta', 'alpha']);
		});
		expect(
			screen.getByRole('columnheader', { name: /Key/i })
		).toHaveAttribute('aria-sort', 'ascending');

		await user.click(screen.getByTestId('portfolio-sort-pnl_percent'));
		await waitFor(() => {
			expect(renderedRowIds()).toEqual(['alpha', 'beta']);
		});
	});

	it('navigates to the key detail page when a row is clicked', async () => {
		const user = userEvent.setup();
		renderPage();

		await waitFor(() => {
			expect(renderedRowIds()).toEqual(['alpha', 'beta']);
		});

		await user.click(screen.getAllByTestId('portfolio-position-row')[1]);

		expect(screen.getByTestId('navigated-detail')).toBeInTheDocument();
	});

	it('shows the empty state when the wallet holds no keys', async () => {
		mockWallet({ holdings: [] });
		renderPage();

		expect(
			await screen.findByTestId('portfolio-positions-empty')
		).toBeInTheDocument();
	});

	it('shows a connect prompt when no wallet is connected', async () => {
		mockWallet({ address: null });
		renderPage();

		expect(
			await screen.findByTestId('portfolio-connect-empty')
		).toBeInTheDocument();
	});
});
