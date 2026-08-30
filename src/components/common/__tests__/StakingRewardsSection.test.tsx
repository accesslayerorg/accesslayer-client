import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import StakingRewardsSection from '@/components/common/StakingRewardsSection';

function renderSection(props: React.ComponentProps<typeof StakingRewardsSection>) {
	return render(
		<MemoryRouter>
			<StakingRewardsSection {...props} />
		</MemoryRouter>
	);
}

describe('StakingRewardsSection (#817)', () => {
	it('renders pool balance and total staked', () => {
		renderSection({
			stakingPoolBalance: 6000,
			totalStaked: 42,
			recentFeeInflow: 50,
		});

		expect(screen.getByTestId('staking-pool-balance')).toHaveTextContent('6000.00 XLM');
		expect(screen.getByTestId('staking-total-staked')).toHaveTextContent('42 keys');
	});

	it('computes and displays the estimated APY', () => {
		renderSection({
			stakingPoolBalance: 6000,
			totalStaked: 42,
			recentFeeInflow: 50,
		});

		// 50 * 12 / 6000 * 100 = 10%
		expect(screen.getByTestId('staking-estimated-apy')).toHaveTextContent('10%');
	});

	it('shows a placeholder APY when it cannot be computed', () => {
		renderSection({
			stakingPoolBalance: 0,
			totalStaked: 5,
			recentFeeInflow: 50,
		});

		expect(screen.getByTestId('staking-estimated-apy')).toHaveTextContent('—');
	});

	it('links the CTA to the portfolio staking tab', () => {
		renderSection({
			stakingPoolBalance: 6000,
			totalStaked: 42,
			recentFeeInflow: 50,
		});

		const cta = screen.getByTestId('staking-cta');
		expect(cta.tagName).toBe('A');
		expect(cta).toHaveAttribute('href', '/profile?tab=staking');
		expect(cta).toHaveTextContent('Stake your keys');
	});

	it('renders nothing when there is no staking activity', () => {
		const { container } = renderSection({
			stakingPoolBalance: 0,
			totalStaked: 0,
			recentFeeInflow: 0,
		});

		expect(screen.queryByTestId('staking-rewards-section')).not.toBeInTheDocument();
		expect(container).toBeEmptyDOMElement();
	});

	it('shows a loading skeleton while data fetches', () => {
		renderSection({ isLoading: true });

		expect(screen.getByTestId('staking-rewards-skeleton')).toBeInTheDocument();
		expect(screen.queryByTestId('staking-rewards-section')).not.toBeInTheDocument();
	});
});
