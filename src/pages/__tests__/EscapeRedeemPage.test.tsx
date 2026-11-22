import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import EscapeRedeemPage from '@/pages/EscapeRedeemPage';
import { useEscapeStatus } from '@/hooks/useEscapeStatus';
import { useWalletHoldings } from '@/hooks/useWallet';
import { useCreatorPrices } from '@/hooks/useCreatorPrices';
import { useKeyReserve } from '@/hooks/useKeyReserve';
import { escapeContractService } from '@/services/escapeContract.service';

vi.mock('wagmi', () => ({
	useAccount: vi.fn(() => ({ address: 'GWALLET123' })),
}));

vi.mock('@/hooks/useDocumentTitle', () => ({
	useDocumentTitle: vi.fn(),
}));

vi.mock('@/hooks/useEscapeStatus', () => ({
	useEscapeStatus: vi.fn(),
}));

vi.mock('@/hooks/useWallet', () => ({
	useWalletHoldings: vi.fn(),
}));

vi.mock('@/hooks/useCreatorPrices', () => ({
	useCreatorPrices: vi.fn(),
}));

vi.mock('@/hooks/useKeyReserve', () => ({
	useKeyReserve: vi.fn(),
}));

vi.mock('@/services/escapeContract.service', () => ({
	escapeContractService: {
		escape_redeem: vi.fn(),
	},
}));

const mockUseEscapeStatus = vi.mocked(useEscapeStatus);
const mockUseWalletHoldings = vi.mocked(useWalletHoldings);
const mockUseCreatorPrices = vi.mocked(useCreatorPrices);
const mockUseKeyReserve = vi.mocked(useKeyReserve);
const mockEscapeRedeem = vi.mocked(escapeContractService.escape_redeem);

function renderPage() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={['/escape']}>
				<Routes>
					<Route path="/escape" element={<EscapeRedeemPage />} />
					<Route
						path="/"
						element={<div data-testid="home-page">home</div>}
					/>
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>
	);
}

const baseStatus = {
	status: {
		protocolPaused: true,
		pauseStartedAt: '2026-01-01T00:00:00Z',
		escapeEnabled: true,
	},
	isLoading: false,
	isError: false,
	error: null,
	refetch: vi.fn(),
	isProtocolPaused: true,
	isEscapeModeActive: true,
	escapeAvailableAt: Date.now() - 1000,
	msUntilEscapeAvailable: 0,
	pauseStartedAt: '2026-01-01T00:00:00Z',
};

describe('EscapeRedeemPage (#1320)', () => {
	beforeEach(() => {
		mockUseEscapeStatus.mockReset();
		mockUseWalletHoldings.mockReset();
		mockUseCreatorPrices.mockReset();
		mockUseKeyReserve.mockReset();
		mockEscapeRedeem.mockReset();

		mockUseEscapeStatus.mockReturnValue(
			baseStatus as unknown as ReturnType<typeof useEscapeStatus>
		);
		mockUseCreatorPrices.mockReturnValue({
			data: [],
			isLoading: false,
		} as unknown as ReturnType<typeof useCreatorPrices>);
		mockUseKeyReserve.mockImplementation(((keyId: string) => {
			if (keyId === 'key-a') {
				return {
					data: { reserveStroops: 10_000_000, marketCapStroops: null },
					isLoading: false,
					isError: false,
				};
			}
			return {
				data: { reserveStroops: 5_000_000, marketCapStroops: null },
				isLoading: false,
				isError: false,
			};
		}) as unknown as typeof useKeyReserve);
		mockUseWalletHoldings.mockReturnValue({
			data: [
				{
					creatorId: 'key-a',
					quantity: 2,
					currentSupply: 10,
				},
				{
					creatorId: 'key-b',
					quantity: 1,
					currentSupply: 5,
				},
			],
			isLoading: false,
		} as unknown as ReturnType<typeof useWalletHoldings>);
	});

	afterEach(() => {
		cleanup();
	});

	it('redirects away when escape mode is inactive', async () => {
		mockUseEscapeStatus.mockReturnValue({
			...baseStatus,
			isEscapeModeActive: false,
			status: {
				protocolPaused: true,
				pauseStartedAt: '2026-01-01T00:00:00Z',
				escapeEnabled: false,
			},
		} as unknown as ReturnType<typeof useEscapeStatus>);

		renderPage();

		await waitFor(() => {
			expect(screen.getByTestId('home-page')).toBeInTheDocument();
		});
		expect(
			screen.queryByTestId('escape-redeem-page')
		).not.toBeInTheDocument();
	});

	it('lists holdings with pro-rata payout estimates and the reserve-only note', () => {
		mockUseCreatorPrices.mockReturnValue({
			data: [{ id: 'key-a', title: 'Alpha Key' }],
			isLoading: false,
		} as unknown as ReturnType<typeof useCreatorPrices>);

		renderPage();

		expect(screen.getByTestId('escape-redeem-page')).toBeInTheDocument();
		expect(screen.getByTestId('escape-fee-note')).toHaveTextContent(
			/Fees and yield are skipped/i
		);
		expect(screen.getByTestId('escape-holdings-table')).toBeInTheDocument();
		expect(screen.getByTestId('escape-row-key-a')).toHaveTextContent(
			'Alpha Key'
		);

		// key-a: reserve 10_000_000 stroops / supply 10 = 1_000_000 per key, qty 2 => 2_000_000 total
		expect(screen.getByTestId('escape-row-key-a')).toHaveTextContent(
			'0.10 XLM'
		);
		expect(screen.getByTestId('escape-row-key-a')).toHaveTextContent(
			'0.20 XLM'
		);
	});

	it('redeems a holding, updates the row, and prevents a second redemption', async () => {
		mockEscapeRedeem.mockResolvedValue({
			success: true,
			txHash: '0xabc',
		} as Awaited<ReturnType<typeof escapeContractService.escape_redeem>>);

		renderPage();

		const redeemButton = screen.getByTestId('escape-redeem-key-a');
		fireEvent.click(redeemButton);

		await waitFor(() => {
			expect(mockEscapeRedeem).toHaveBeenCalledWith({
				keyId: 'key-a',
				quantity: 2,
				address: 'GWALLET123',
			});
		});

		await waitFor(() => {
			expect(screen.getByTestId('escape-redeemed-key-a')).toHaveTextContent(
				/Redeemed/i
			);
		});
		expect(
			screen.queryByTestId('escape-redeem-key-a')
		).not.toBeInTheDocument();
	});

	it('shows a readable error when redemption fails', async () => {
		mockEscapeRedeem.mockRejectedValue(
			new Error('Contract call failed: insufficient reserve')
		);

		renderPage();

		fireEvent.click(screen.getByTestId('escape-redeem-key-a'));

		await waitFor(() => {
			expect(screen.getByTestId('escape-error-key-a')).toHaveTextContent(
				/Contract call failed: insufficient reserve/i
			);
		});
		// Row remains redeemable after a failure.
		expect(screen.getByTestId('escape-redeem-key-a')).toBeInTheDocument();
	});
});
