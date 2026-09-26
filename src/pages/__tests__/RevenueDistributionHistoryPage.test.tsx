import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RevenueDistributionHistoryPage from '../RevenueDistributionHistoryPage';

vi.mock('wagmi', () => ({
	useAccount: vi.fn(),
}));

const { useAccount } = vi.mocked(await import('wagmi'));

describe('RevenueDistributionHistoryPage', () => {
	it('shows connect wallet message when no wallet is connected', () => {
		useAccount.mockReturnValue({ address: undefined } as never);

		const queryClient = new QueryClient();
		render(
			<QueryClientProvider client={queryClient}>
				<RevenueDistributionHistoryPage />
			</QueryClientProvider>
		);

		expect(screen.getByText('Please connect your wallet to view your revenue distribution history.')).toBeInTheDocument();
	});

	it('renders page title and table when wallet is connected', () => {
		useAccount.mockReturnValue({ address: 'GTESTWALLET' } as never);

		const queryClient = new QueryClient();
		render(
			<QueryClientProvider client={queryClient}>
				<RevenueDistributionHistoryPage />
			</QueryClientProvider>
		);

		expect(screen.getByText('Revenue Distribution History')).toBeInTheDocument();
	});

	it('sets document title correctly', () => {
		useAccount.mockReturnValue({ address: 'GTESTWALLET' } as never);

		const queryClient = new QueryClient();
		render(
			<QueryClientProvider client={queryClient}>
				<RevenueDistributionHistoryPage />
			</QueryClientProvider>
		);

		expect(document.title).toBe('Revenue Distribution History — AccessLayer');
	});
});
