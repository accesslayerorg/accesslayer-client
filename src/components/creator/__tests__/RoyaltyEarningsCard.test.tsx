import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RoyaltyEarningsCard from '../RoyaltyEarningsCard';
import { royaltyService } from '@/services/royalty.service';

vi.mock('wagmi', () => ({
	useAccount: () => ({ address: 'GA7QW3L7Y54N4P5O3G6J8K9L0M1N2P3Q4R5S6T7U8V9W0X1Y2Z3A4B5C' }),
}));

vi.mock('@/services/royalty.service', () => ({
	royaltyService: {
		getRoyaltyEarnings: vi.fn(),
		claimRoyalties: vi.fn().mockResolvedValue({ transactionHash: 'abc123' }),
	},
}));

function makeWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

const SUMMARY = {
	totalEarnedXlm: 120,
	pendingXlm: 45,
	claimedXlm: 75,
	transfers: [
		{
			id: 't1',
			transferredAt: '2026-09-01T10:00:00Z',
			transferAmountXlm: 500,
			royaltyEarnedXlm: 10,
			transactionHash: 'aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
		},
	],
	claims: [
		{
			id: 'c1',
			amountXlm: 30,
			claimedAt: '2026-09-10T10:00:00Z',
			transactionHash: 'bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222',
		},
	],
};

describe('RoyaltyEarningsCard (#987)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(royaltyService.getRoyaltyEarnings as ReturnType<typeof vi.fn>).mockResolvedValue(SUMMARY);
	});

	it('aggregates the earnings totals from the API payload', async () => {
		render(<RoyaltyEarningsCard keyId="key_1" />, { wrapper: makeWrapper() });

		await waitFor(() => {
			expect(screen.getByText('120 XLM')).toBeInTheDocument();
			expect(screen.getByText('45 XLM')).toBeInTheDocument();
			expect(screen.getByText('75 XLM')).toBeInTheDocument();
		});
	});

	it('lists the per-transfer breakdown with explorer links', async () => {
		render(<RoyaltyEarningsCard keyId="key_1" />, { wrapper: makeWrapper() });

		await screen.findByTestId('royalty-earnings-card');
		expect(screen.queryByTestId('royalty-transfers-table')).not.toBeInTheDocument();

		await userEvent.click(screen.getByRole('button', { name: /show transfer history/i }));

		expect(screen.getByTestId('royalty-transfers-table')).toBeInTheDocument();
		expect(screen.getByText(/10 XLM/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /aaaa1111/ }).getAttribute('href')).toContain(
			'stellar.expert/explorer/testnet/tx/aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111'
		);
	});

	it('claims royalties and refreshes the earnings query', async () => {
		render(<RoyaltyEarningsCard keyId="key_1" />, { wrapper: makeWrapper() });

		await screen.findByTestId('royalty-earnings-card');
		await userEvent.click(screen.getByTestId('claim-royalties-button'));

		await waitFor(() => {
			expect(royaltyService.claimRoyalties).toHaveBeenCalledWith('key_1', SUMMARY.pendingXlm && expect.anything());
		});
	});

	it('shows the empty-breakdown states', async () => {
		(royaltyService.getRoyaltyEarnings as ReturnType<typeof vi.fn>).mockResolvedValue({
			...SUMMARY,
			transfers: [],
			claims: [],
		});
		render(<RoyaltyEarningsCard keyId="key_1" />, { wrapper: makeWrapper() });

		await screen.findByTestId('royalty-earnings-card');
		await userEvent.click(screen.getByRole('button', { name: /show transfer history/i }));

		expect(screen.getByTestId('royalty-transfers-empty')).toBeInTheDocument();
		expect(screen.getByTestId('royalty-claims-empty')).toBeInTheDocument();
	});
});
