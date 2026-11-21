import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FundRewardPoolForm from '../FundRewardPoolForm';
import { stakingPoolService } from '@/services/stakingPool.service';

vi.mock('wagmi', () => ({
	useAccount: () => ({ address: 'GA7QW3L7Y54N4P5O3G6J8K9L0M1N2P3Q4R5S6T7U8V9W0X1Y2Z3A4B5C' }),
}));

vi.mock('@/services/stakingPool.service', () => ({
	stakingPoolService: {
		getRewardPool: vi.fn(),
		fundRewardPool: vi
			.fn()
			.mockResolvedValue({ transactionHash: 'fundingtx', pool: {} }),
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

const POOL = {
	poolBalanceXlm: 700,
	totalStakedXlm: 10_000,
	rewardRate: 0.12,
	projectedRewardRate: 0.15,
	daysOfRewardsRemaining: 14,
};

describe('FundRewardPoolForm (#1023)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(stakingPoolService.getRewardPool as ReturnType<typeof vi.fn>).mockResolvedValue(POOL);
	});

	it('shows the pool balance and current reward rate', async () => {
		render(<FundRewardPoolForm keyId="key_1" />, { wrapper: makeWrapper() });

		await waitFor(() => {
			expect(screen.getByText('700 XLM')).toBeInTheDocument();
			expect(screen.getByText('12.00% APR')).toBeInTheDocument();
		});
	});

	it('recalculates the estimated reward rate as the amount changes', async () => {
		render(<FundRewardPoolForm keyId="key_1" />, { wrapper: makeWrapper() });

		await screen.findByTestId('fund-reward-pool-form');

		const initial = screen.getByTestId('projected-reward-rate');
		expect(initial.textContent).toContain('12.00%');

		await userEvent.type(screen.getByTestId('fund-pool-amount'), '300');
		await waitFor(() => {
			// 300 into (700 + 300) weights the projected 15% rate by 0.3 →
			// 0.12 * 0.7 + 0.15 * 0.3 = 12.90%
			expect(screen.getByTestId('projected-reward-rate').textContent).toContain('12.90%');
		});
	});

	it('submits the funding transaction with the entered amount', async () => {
		render(<FundRewardPoolForm keyId="key_1" />, { wrapper: makeWrapper() });

		await screen.findByTestId('fund-reward-pool-form');
		await userEvent.type(screen.getByTestId('fund-pool-amount'), '300');
		await userEvent.click(screen.getByTestId('fund-pool-submit'));

		await waitFor(() => {
			expect(stakingPoolService.fundRewardPool).toHaveBeenCalledWith(
				'key_1',
				expect.any(String),
				{ amountXlm: 300 }
			);
		});
	});

	it('warns when the pool covers fewer than 7 days of rewards', async () => {
		(stakingPoolService.getRewardPool as ReturnType<typeof vi.fn>).mockResolvedValue({
			...POOL,
			daysOfRewardsRemaining: 5,
		});
		render(<FundRewardPoolForm keyId="key_1" />, { wrapper: makeWrapper() });

		await waitFor(() => {
			expect(screen.getByTestId('low-balance-warning').textContent).toContain(
				'5 day(s)'
			);
		});
	});

	it('does not show the warning above the threshold', async () => {
		render(<FundRewardPoolForm keyId="key_1" />, { wrapper: makeWrapper() });

		await screen.findByTestId('fund-reward-pool-form');
		expect(screen.queryByTestId('low-balance-warning')).not.toBeInTheDocument();
	});
});
