import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import React from 'react';
import StakingDashboardPage from '../StakingDashboardPage';
import { useAccount } from 'wagmi';
import { useStakingPositions } from '@/hooks/useStakingPositions';
import { useWalletHoldings } from '@/hooks/useWallet';

vi.mock('wagmi', () => ({
	useAccount: vi.fn(),
	useConnect: vi.fn(() => ({
		connect: vi.fn(),
		connectors: [],
		error: null,
		isPending: false,
	})),
	useDisconnect: vi.fn(() => ({
		disconnect: vi.fn(),
	})),
}));

vi.mock('@/hooks/useStakingPositions', () => ({
	useStakingPositions: vi.fn(),
}));

vi.mock('@/hooks/useWallet', () => ({
	useWalletHoldings: vi.fn(),
}));

vi.mock('@/hooks/useStakingDashboard', () => ({
	useStakeKeysMutation: () => ({
		mutate: vi.fn(),
		isPending: false,
	}),
	useUnstakeKeysMutation: () => ({
		mutate: vi.fn(),
		isPending: false,
	}),
	useClaimStakingRewardsMutation: () => ({
		mutate: vi.fn(),
		isPending: false,
	}),
}));

const mockUseAccount = vi.mocked(useAccount);
const mockUseStakingPositions = vi.mocked(useStakingPositions);
const mockUseWalletHoldings = vi.mocked(useWalletHoldings);

const WALLET = 'GAAA1234567890';

function renderPage() {
	return render(
		<MemoryRouter initialEntries={['/staking']}>
			<StakingDashboardPage />
		</MemoryRouter>
	);
}

describe('StakingDashboardPage (#917)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders wallet connect prompt when user is not connected', () => {
		mockUseAccount.mockReturnValue({
			address: undefined,
			isConnected: false,
		} as ReturnType<typeof useAccount>);

		mockUseStakingPositions.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: false,
		} as ReturnType<typeof useStakingPositions>);

		mockUseWalletHoldings.mockReturnValue({
			data: undefined,
			isLoading: false,
		} as ReturnType<typeof useWalletHoldings>);

		renderPage();

		expect(screen.getByTestId('staking-connect-prompt')).toBeInTheDocument();
		expect(
			screen.getByText(/Connect your wallet to view your staking positions/i)
		).toBeInTheDocument();
	});

	it('renders summary statistics and lock options when connected', () => {
		mockUseAccount.mockReturnValue({
			address: WALLET,
			isConnected: true,
		} as ReturnType<typeof useAccount>);

		mockUseStakingPositions.mockReturnValue({
			data: {
				positions: [
					{
						id: 'pos-1',
						keyId: 'creator-alpha',
						keyName: 'Alpha Creator',
						stakedQuantity: 10,
						unlockLedger: Math.floor(Date.now() / 1000) + 86400,
						claimableReward: 15.5,
						priceStroops: 100_000_000,
						price: 10,
					},
				],
			},
			isLoading: false,
			isError: false,
		} as ReturnType<typeof useStakingPositions>);

		mockUseWalletHoldings.mockReturnValue({
			data: [
				{
					creatorId: 'creator-alpha',
					quantity: 5,
					name: 'Alpha Creator',
				},
			],
			isLoading: false,
		} as ReturnType<typeof useWalletHoldings>);

		renderPage();

		expect(screen.getByTestId('staking-summary')).toBeInTheDocument();
		expect(screen.getByTestId('stake-form')).toBeInTheDocument();

		// Check lock options APY display
		expect(screen.getByTestId('lock-period-30')).toHaveTextContent('5.0% APY');
		expect(screen.getByTestId('lock-period-90')).toHaveTextContent('12.0% APY');
		expect(screen.getByTestId('lock-period-180')).toHaveTextContent('20.0% APY');
		expect(screen.getByTestId('lock-period-365')).toHaveTextContent('35.0% APY');
	});

	it('disables unstake button when position is still locked', () => {
		mockUseAccount.mockReturnValue({
			address: WALLET,
			isConnected: true,
		} as ReturnType<typeof useAccount>);

		const lockedExpirySec = Math.floor(Date.now() / 1000) + 10000;
		mockUseStakingPositions.mockReturnValue({
			data: {
				positions: [
					{
						id: 'pos-locked',
						keyId: 'creator-locked',
						keyName: 'Locked Key',
						stakedQuantity: 5,
						unlockLedger: lockedExpirySec,
						claimableReward: 2.0,
						priceStroops: 50_000_000,
						price: 5,
					},
				],
			},
			isLoading: false,
			isError: false,
		} as ReturnType<typeof useStakingPositions>);

		mockUseWalletHoldings.mockReturnValue({
			data: [],
			isLoading: false,
		} as ReturnType<typeof useWalletHoldings>);

		renderPage();

		const unstakeBtn = screen.getByTestId('unstake-pos-locked');
		expect(unstakeBtn).toBeDisabled();

		const claimBtn = screen.getByTestId('claim-rewards-pos-locked');
		expect(claimBtn).not.toBeDisabled();
	});

	it('enables unstake button when lock period has expired', () => {
		mockUseAccount.mockReturnValue({
			address: WALLET,
			isConnected: true,
		} as ReturnType<typeof useAccount>);

		const expiredSec = Math.floor(Date.now() / 1000) - 100;
		mockUseStakingPositions.mockReturnValue({
			data: {
				positions: [
					{
						id: 'pos-unlocked',
						keyId: 'creator-unlocked',
						keyName: 'Unlocked Key',
						stakedQuantity: 5,
						unlockLedger: expiredSec,
						claimableReward: 0,
						priceStroops: 50_000_000,
						price: 5,
					},
				],
			},
			isLoading: false,
			isError: false,
		} as ReturnType<typeof useStakingPositions>);

		mockUseWalletHoldings.mockReturnValue({
			data: [],
			isLoading: false,
		} as ReturnType<typeof useWalletHoldings>);

		renderPage();

		const unstakeBtn = screen.getByTestId('unstake-pos-unlocked');
		expect(unstakeBtn).not.toBeDisabled();
	});
});
