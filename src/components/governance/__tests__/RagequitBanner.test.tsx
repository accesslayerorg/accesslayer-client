import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import RagequitBanner from '../RagequitBanner';
import { ragequitService } from '@/services/ragequit.service';

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

describe('RagequitBanner', () => {
	beforeEach(() => {
		ragequitService.reset();
	});

	it('eligible holders see the banner, countdown, estimated payout and exit button', async () => {
		ragequitService.setMockRagequitState('prop-101', {
			isOpen: true,
			windowEndsAt: new Date(Date.now() + 3600 * 1000).toISOString(),
			totalReserveXlm: 100000,
			totalCirculatingKeys: 10000,
			payoutPerKeyXlm: 10,
			userKeys: 25,
			estimatedPayoutXlm: 250,
			isEligible: true,
			cumulativeExits: 500,
			exitCap: 2000,
		});

		renderWithProviders(<RagequitBanner proposalId="prop-101" />);

		await waitFor(() => {
			expect(screen.getByTestId('ragequit-banner')).toBeInTheDocument();
		});

		// Banner & countdown
		expect(screen.getByTestId('ragequit-countdown')).toBeInTheDocument();

		// Estimated payout
		expect(screen.getByTestId('ragequit-payout-estimate')).toHaveTextContent('250.00 XLM');

		// Exit button is visible for eligible holders
		expect(screen.getByTestId('ragequit-exit-button')).toBeInTheDocument();
	});

	it('ineligible holders (e.g. voted in favor) see the reason and NO exit button', async () => {
		ragequitService.setMockRagequitState('prop-102', {
			isOpen: true,
			windowEndsAt: new Date(Date.now() + 3600 * 1000).toISOString(),
			userVoteDirection: 'for',
			isEligible: false,
		});

		renderWithProviders(<RagequitBanner proposalId="prop-102" />);

		await waitFor(() => {
			expect(screen.getByTestId('ragequit-banner')).toBeInTheDocument();
		});

		// Displays reason
		expect(screen.getByTestId('ragequit-ineligible-notice')).toHaveTextContent(
			/You voted in favor of this proposal and are not eligible to ragequit/i
		);

		// NO exit button
		expect(screen.queryByTestId('ragequit-exit-button')).toBeNull();
	});

	it('the exits progress bar reflects cumulative exits against the cap', async () => {
		ragequitService.setMockRagequitState('prop-103', {
			isOpen: true,
			windowEndsAt: new Date(Date.now() + 3600 * 1000).toISOString(),
			cumulativeExits: 800,
			exitCap: 2000,
		});

		renderWithProviders(<RagequitBanner proposalId="prop-103" />);

		await waitFor(() => {
			expect(screen.getByTestId('ragequit-banner')).toBeInTheDocument();
		});

		expect(screen.getByTestId('ragequit-exits-progress-text')).toHaveTextContent(
			'800 / 2,000 keys (40.0% of cap)'
		);

		const bar = screen.getByTestId('ragequit-exits-bar');
		expect(bar).toHaveStyle({ width: '40%' });
	});

	it('the banner disappears when the window ends', async () => {
		// Window ended in the past, not executed
		ragequitService.setMockRagequitState('prop-104', {
			isOpen: false,
			windowEndsAt: new Date(Date.now() - 10000).toISOString(),
			isExecuted: false,
		});

		const { container } = renderWithProviders(<RagequitBanner proposalId="prop-104" />);

		await waitFor(() => {
			expect(container).toBeEmptyDOMElement();
		});
	});

	it('shows final result and link to executed proposal after window closes with execution', async () => {
		ragequitService.setMockRagequitState('prop-105', {
			isOpen: false,
			windowEndsAt: new Date(Date.now() - 10000).toISOString(),
			isExecuted: true,
			executedProposalId: 'prop-105',
			cumulativeExits: 1200,
		});

		renderWithProviders(<RagequitBanner proposalId="prop-105" />);

		await waitFor(() => {
			expect(screen.getByTestId('ragequit-closed-banner')).toBeInTheDocument();
		});

		expect(screen.getByTestId('executed-proposal-link')).toHaveAttribute(
			'href',
			'/governance/prop-105'
		);
	});
});
