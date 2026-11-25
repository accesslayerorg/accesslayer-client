import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import ConvictionProposalsPage from '../ConvictionProposalsPage';
import { convictionService } from '@/services/conviction.service';

function renderWithProviders(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>{ui}</MemoryRouter>
		</QueryClientProvider>
	);
}

describe('ConvictionProposalsPage', () => {
	beforeEach(() => {
		convictionService.reset();
	});

	it('lists proposals with requested amount and status', async () => {
		renderWithProviders(<ConvictionProposalsPage />);

		await waitFor(() => {
			expect(
				screen.getByText('Community Grants Round 3 — Protocol Tooling')
			).toBeInTheDocument();
		});

		// Requested amounts
		expect(screen.getByText('15,000 XLM')).toBeInTheDocument();
		expect(screen.getByText('25,000 XLM')).toBeInTheDocument();
	});

	it('shows execute button only after the threshold is crossed', async () => {
		renderWithProviders(<ConvictionProposalsPage />);

		await waitFor(() => {
			expect(
				screen.getByText('Security Audit Sponsorship for Smart Contracts')
			).toBeInTheDocument();
		});

		// Proposal conv-2 has crossed threshold (1550 / 1500), so its execute button is present
		const executeButtons = screen.getAllByTestId('execute-proposal-button');
		expect(executeButtons.length).toBeGreaterThan(0);

		// Proposal conv-1 has NOT crossed threshold (750 / 1000), card should not show execute
		const card1 = screen.getByTestId('conviction-proposal-card-conv-1');
		expect(
			card1.querySelector('[data-testid="execute-proposal-button"]')
		).toBeNull();
	});

	it('shows withdraw action with decay note and reduces user stake on withdraw', async () => {
		renderWithProviders(<ConvictionProposalsPage />);

		await waitFor(() => {
			expect(screen.getByTestId('conviction-proposal-card-conv-1')).toBeInTheDocument();
		});

		const card1 = screen.getByTestId('conviction-proposal-card-conv-1');
		// Initial stake is 50
		expect(card1).toHaveTextContent('50 VOTE');

		// Click withdraw
		const withdrawBtn = card1.querySelector('[data-testid="init-withdraw-button"]')!;
		fireEvent.click(withdrawBtn);

		// Decay note is shown
		expect(
			screen.getByText(
				/Conviction decays gradually over time after stake is withdrawn/i
			)
		).toBeInTheDocument();

		// Confirm withdraw
		const confirmBtn = screen.getByTestId('confirm-withdraw-button');
		fireEvent.click(confirmBtn);

		await waitFor(() => {
			// Stake reduced to 0 VOTE
			expect(card1.querySelector('[data-testid="user-allocated-stake"]')).toHaveTextContent(
				'0 VOTE'
			);
		});
	});

	it('displays final outcome for executed proposals', async () => {
		renderWithProviders(<ConvictionProposalsPage />);

		await waitFor(() => {
			expect(screen.getByTestId('conviction-proposal-card-conv-3')).toBeInTheDocument();
		});

		const card3 = screen.getByTestId('conviction-proposal-card-conv-3');
		expect(
			card3.querySelector('[data-testid="proposal-final-outcome"]')
		).toBeInTheDocument();
		expect(card3).toHaveTextContent(
			'50,000 XLM transferred to the Liquidity Reserve distributor contract'
		);
	});
});
