import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import EarningsStreamPage from '../EarningsStreamPage';
import { creatorStreamContractService } from '@/services/creatorStreamContract.service';

function renderWithProviders(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>{ui}</MemoryRouter>
		</QueryClientProvider>
	);
}

describe('EarningsStreamPage', () => {
	beforeEach(() => {
		creatorStreamContractService.reset();
	});

	it('renders stream cards with key details, rate, funded, withdrawn', async () => {
		renderWithProviders(<EarningsStreamPage />);

		await waitFor(() => {
			expect(screen.getByText('Alice Keyholder Stream')).toBeInTheDocument();
		});

		expect(screen.getByText('Key: ALICE')).toBeInTheDocument();
		expect(screen.getByText('5,000 XLM')).toBeInTheDocument();
		expect(screen.getByText('1,200 XLM')).toBeInTheDocument();
	});

	it('shows paused notice and frozen indicator when stream is paused', async () => {
		renderWithProviders(<EarningsStreamPage />);

		await waitFor(() => {
			expect(screen.getByText('Bob Production Stream')).toBeInTheDocument();
		});

		expect(screen.getByTestId('stream-paused-notice')).toBeInTheDocument();
		expect(screen.getByTestId('stream-paused-notice')).toHaveTextContent(
			/Stream Paused — Accrual Stopped/i
		);
	});

	it('history rows link to the correct transactions on Stellar Expert', async () => {
		renderWithProviders(<EarningsStreamPage />);

		await waitFor(() => {
			expect(screen.getByTestId('stream-history-table')).toBeInTheDocument();
		});

		const txLink = screen.getByTestId('tx-link-w-1');
		expect(txLink).toHaveAttribute(
			'href',
			'https://stellar.expert/explorer/public/tx/a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01'
		);
	});

	it('shows explanation when creators have no active streams', async () => {
		creatorStreamContractService.setMockStreams([]);

		renderWithProviders(<EarningsStreamPage />);

		await waitFor(() => {
			expect(screen.getByTestId('no-streams-explanation')).toBeInTheDocument();
		});

		expect(screen.getByText('No Earnings Streams Found')).toBeInTheDocument();
		expect(
			screen.getByText(/You do not have any active earnings streams at this time/i)
		).toBeInTheDocument();
	});
});
