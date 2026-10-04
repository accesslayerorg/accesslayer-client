import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import StakingPositionsList from '@/components/common/StakingPositionsList';
import type { StakingPosition } from '@/services/stakingPositions.service';

const mockClaimMutation = {
	mutate: vi.fn(),
	isPending: false,
	variables: null as { keyId: string } | null,
};

vi.mock('@/hooks/useWallet', () => ({
	useClaimStakeMutation: () => mockClaimMutation,
}));

const WALLET = 'GDEMOWALLET0000000000000000000000000000000000000000000001';

// 2001-01-01 (past) and 2099-01-01 (future) unlock ledgers.
const UNLOCKED_LEDGER_MS = new Date('2001-01-01T00:00:00Z').getTime();
const LOCKED_LEDGER_MS = new Date('2099-01-01T00:00:00Z').getTime();

function position(overrides: Partial<StakingPosition> = {}): StakingPosition {
	return {
		id: 'pos-1',
		keyId: 'creator-1',
		keyName: 'Alpha Key',
		stakedQuantity: 120,
		unlockLedger: Math.floor(UNLOCKED_LEDGER_MS / 1000),
		claimableReward: 1_250_000,
		priceStroops: 2_500_000,
		price: null,
		...overrides,
	};
}

type ListVariant = 'locked' | 'unlocked' | 'loading' | 'empty' | 'error';

function renderList({
	type,
	isOwnProfile = true,
}: {
	type?: ListVariant;
	isOwnProfile?: boolean;
} = {}) {
	let positions: StakingPosition[] = [position()];
	let isLoading = false;
	let isError = false;

	if (type === 'loading') {
		positions = [];
		isLoading = true;
	} else if (type === 'empty') {
		positions = [];
	} else if (type === 'error') {
		positions = [];
		isError = true;
	} else if (type === 'locked') {
		positions = [
			position({
				id: 'pos-locked',
				unlockLedger: LOCKED_LEDGER_MS / 1000,
			}),
		];
	}

	return render(
		<MemoryRouter>
			<StakingPositionsList
				walletAddress={WALLET}
				positions={positions}
				isOwnProfile={isOwnProfile}
				isLoading={isLoading}
				isError={isError}
			/>
		</MemoryRouter>
	);
}

describe('StakingPositionsList (#921)', () => {
	beforeEach(() => {
		mockClaimMutation.mutate.mockReset();
	});

	it('renders each position with quantity, bond-curve value, and lock status', () => {
		renderList();

		expect(screen.getByTestId('staking-position-pos-1')).toBeInTheDocument();
		expect(screen.getByText('Alpha Key')).toBeInTheDocument();
		// 2_500_000 stroops × 120 keys = 300_000_000 stroops = 30 XLM
		expect(screen.getByTestId('staking-value-pos-1')).toHaveTextContent(
			'30 XLM'
		);
		expect(screen.getByTestId('staking-lock-status-pos-1')).toHaveTextContent(
			'Unlocked'
		);
	});

	it('shows the lock countdown while a position is still locked', () => {
		renderList({ type: 'locked' });

		expect(
			screen.getByTestId('staking-lock-status-pos-locked')
		).toHaveTextContent('Unlocks in');
	});

	it('shows claimable rewards and a Claim action for the owner', () => {
		renderList();

		expect(screen.getByTestId('staking-claimable-pos-1')).toHaveTextContent(
			'0.1250 XLM'
		);
		const claimButton = screen.getByTestId('staking-claim-pos-1');
		expect(claimButton).toHaveTextContent('Claim');

		fireEvent.click(claimButton);
		expect(mockClaimMutation.mutate).toHaveBeenCalledWith({
			keyId: 'creator-1',
		});
	});

	it('hides Claim and claimable rewards on a public profile', () => {
		renderList({ isOwnProfile: false });

		expect(
			screen.queryByTestId('staking-claim-pos-1')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('staking-claimable-pos-1')
		).not.toBeInTheDocument();
		// Lock status and value stay visible publicly.
		expect(
			screen.getByTestId('staking-lock-status-pos-1')
		).toBeInTheDocument();
		expect(screen.getByTestId('staking-value-pos-1')).toBeInTheDocument();
	});

	it('shows a skeleton while loading', () => {
		renderList({ type: 'loading' });

		expect(
			screen.getByTestId('staking-positions-skeleton')
		).toBeInTheDocument();
	});

	it('shows an empty state when there are no staking positions', () => {
		renderList({ type: 'empty' });

		expect(
			screen.getByRole('status', { name: 'No active staking positions' })
		).toBeInTheDocument();
	});

	it('shows an error state when the fetch fails', () => {
		renderList({ type: 'error' });

		expect(
			screen.getByRole('status', { name: "Couldn't load staking positions" })
		).toBeInTheDocument();
	});
});
