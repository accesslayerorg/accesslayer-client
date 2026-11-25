import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import BorrowPage from '../BorrowPage';
import { oracleService } from '@/services/oracle.service';

vi.mock('@/hooks/useStellarWallet', () => ({
	useStellarWallet: () => ({
		address: 'GCONNECTED1234567890',
		isConnected: true,
		loading: false,
	}),
}));

vi.mock('@/hooks/useVaultPosition', () => ({
	useVaultPosition: () => ({
		data: {
			collateral: 100,
			collateralValueXlm: 100,
			debt: 20,
			interest: 1,
			healthFactor: 2.5,
			liquidationPrice: 0.5,
		},
		isLoading: false,
	}),
	useVaultAction: () => ({
		mutate: vi.fn(),
		isPending: false,
	}),
}));

function renderBorrowPage() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>
				<BorrowPage />
			</MemoryRouter>
		</QueryClientProvider>
	);
}

describe('BorrowPage - Oracle Integration', () => {
	beforeEach(() => {
		oracleService.reset();
	});

	it('shows fallback banner when oracle is on fallback and keeps action buttons enabled', async () => {
		oracleService.setMockStatus('XLM', {
			status: 'fallback',
			source: 'fallback',
			sourceName: 'Backup Feed',
			updatedAt: Date.now() - 5_000,
		});

		renderBorrowPage();

		await waitFor(() => {
			expect(screen.getByTestId('oracle-fallback-banner')).toBeInTheDocument();
		});

		expect(screen.getByTestId('oracle-fallback-banner')).toHaveTextContent(/Oracle Fallback Active/i);

		// Action forms are not disabled by fallback
		expect(screen.queryByText(/Action disabled: Oracle price is stale/i)).toBeNull();
	});

	it('shows stale banner and disables actions with explanation when oracle is stale', async () => {
		oracleService.setMockStatus('XLM', {
			status: 'stale',
			source: 'primary',
			updatedAt: Date.now() - 600_000,
		});

		renderBorrowPage();

		await waitFor(() => {
			expect(screen.getByTestId('oracle-stale-banner')).toBeInTheDocument();
		});

		expect(screen.getByTestId('oracle-stale-banner')).toHaveTextContent(/Oracle Price Stale/i);

		// Deposit, Withdraw, Borrow, Repay buttons are disabled
		const depositBtn = screen.getByRole('button', { name: /Deposit collateral/i });
		expect(depositBtn).toBeDisabled();

		// Explanation appears
		expect(screen.getAllByText(/Action disabled: Oracle price is stale/i).length).toBeGreaterThan(0);
	});
});
