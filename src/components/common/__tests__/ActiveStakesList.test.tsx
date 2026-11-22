import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActiveStakesList from '@/components/common/ActiveStakesList';
import type { VaultStake } from '@/services/stakingVault.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const LOCKED_STAKE: VaultStake = {
	id: 'stake-locked',
	keyId: 'key-1',
	stakedAmount: 3,
	// One year in the future — always locked during tests
	lockExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1_000).toISOString(),
	accruedRewards: 12.5,
	rewardPoolBalance: 500,
};

const EXPIRED_STAKE: VaultStake = {
	id: 'stake-expired',
	keyId: 'key-1',
	stakedAmount: 1,
	// One year in the past — always expired during tests
	lockExpiresAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1_000).toISOString(),
	accruedRewards: 4.2,
	rewardPoolBalance: 500,
};

function makeProps(overrides = {}) {
	return {
		stakes: [LOCKED_STAKE, EXPIRED_STAKE],
		pendingUnstakeId: null as string | null,
		onUnstake: vi.fn(),
		...overrides,
	};
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ActiveStakesList (#1017)', () => {
	it('shows an empty-state message when there are no stakes', () => {
		render(<ActiveStakesList stakes={[]} pendingUnstakeId={null} onUnstake={vi.fn()} />);

		expect(screen.getByTestId('active-stakes-empty')).toBeInTheDocument();
		expect(screen.queryByTestId('active-stakes-list')).not.toBeInTheDocument();
	});

	it('renders a row for each stake', () => {
		render(<ActiveStakesList {...makeProps()} />);

		expect(screen.getByTestId('active-stakes-list')).toBeInTheDocument();
		expect(screen.getByTestId('vault-stake-row-stake-locked')).toBeInTheDocument();
		expect(screen.getByTestId('vault-stake-row-stake-expired')).toBeInTheDocument();
	});

	it('shows accrued rewards for each stake (acceptance: accrued rewards)', () => {
		render(<ActiveStakesList {...makeProps()} />);

		// Both reward values should be visible
		expect(screen.getByTestId('vault-stake-rewards-stake-locked')).toBeInTheDocument();
		expect(screen.getByTestId('vault-stake-rewards-stake-expired')).toBeInTheDocument();
	});

	it('disables the Unstake button with a tooltip for a locked stake (acceptance: unstake disabled during lock)', () => {
		render(<ActiveStakesList {...makeProps({ stakes: [LOCKED_STAKE] })} />);

		const unstakeBtn = screen.getByTestId('unstake-button-stake-locked');
		expect(unstakeBtn).toBeDisabled();
		expect(unstakeBtn).toHaveAttribute('aria-disabled', 'true');
	});

	it('enables the Unstake button once the lock has expired (acceptance: unstake enabled after lock)', () => {
		render(<ActiveStakesList {...makeProps({ stakes: [EXPIRED_STAKE] })} />);

		expect(screen.getByTestId('unstake-button-stake-expired')).toBeEnabled();
	});

	it('calls onUnstake with the correct stakeId when Unstake is clicked', async () => {
		const user = userEvent.setup();
		const props = makeProps({ stakes: [EXPIRED_STAKE] });
		render(<ActiveStakesList {...props} />);

		await user.click(screen.getByTestId('unstake-button-stake-expired'));

		expect(props.onUnstake).toHaveBeenCalledWith('stake-expired');
	});

	it('shows a loading spinner on the pending unstake row', () => {
		render(
			<ActiveStakesList
				{...makeProps({ stakes: [EXPIRED_STAKE], pendingUnstakeId: 'stake-expired' })}
			/>
		);

		expect(screen.getByTestId('unstake-button-stake-expired')).toBeDisabled();
		expect(screen.getByText(/unstaking…/i)).toBeInTheDocument();
	});

	it('shows the countdown for a locked stake (acceptance: lock expiry countdown)', () => {
		render(<ActiveStakesList {...makeProps({ stakes: [LOCKED_STAKE] })} />);

		const countdown = screen.getByTestId('vault-stake-countdown-stake-locked');
		expect(countdown).toBeInTheDocument();
		// Should show days remaining (e.g. "365d 0h" — not "Unlocked")
		expect(countdown).not.toHaveTextContent(/unlocked/i);
	});

	it('shows the reward pool balance for each stake', () => {
		render(<ActiveStakesList {...makeProps()} />);

		expect(screen.getByTestId('vault-stake-pool-stake-locked')).toBeInTheDocument();
		expect(screen.getByTestId('vault-stake-pool-stake-expired')).toBeInTheDocument();
	});
});
