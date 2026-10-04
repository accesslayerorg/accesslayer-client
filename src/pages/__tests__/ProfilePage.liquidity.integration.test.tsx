import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import ProfilePage from '@/pages/ProfilePage';
import type { LpPosition } from '@/services/lpPositions.service';

const mocks = vi.hoisted(() => ({
	useLpPositions: vi.fn(),
	claimMutate: vi.fn(),
	useStellarWallet: vi.fn(),
}));

vi.mock('wagmi', () => ({
	useAccount: () => ({ address: undefined, isConnected: false }),
}));

vi.mock('@/hooks/useWallet', () => ({
	useWalletHoldings: () => ({ data: [], isLoading: false }),
	useTradeHistory: () => ({
		data: { pages: [] },
		fetchNextPage: vi.fn(),
		hasNextPage: false,
		isFetchingNextPage: false,
		isLoading: false,
		isError: false,
	}),
	useClaimStakeMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useCreatorPrices', () => ({
	useCreatorPrices: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useStakingPositions', () => ({
	useStakingPositions: () => ({
		data: { positions: [] },
		isLoading: false,
		isError: false,
	}),
}));

vi.mock('@/hooks/useStellarWallet', () => ({
	useStellarWallet: mocks.useStellarWallet,
}));

vi.mock('@/hooks/useLpPositions', async importOriginal => {
	const original =
		await importOriginal<typeof import('@/hooks/useLpPositions')>();
	const idle = () => ({
		mutate: vi.fn(),
		reset: vi.fn(),
		isPending: false,
		isError: false,
		error: null,
	});
	return {
		describeLpTransactionError: original.describeLpTransactionError,
		useLpPositions: mocks.useLpPositions,
		useAddLiquidity: idle,
		useRemoveLiquidity: idle,
		useClaimLpRewards: () => ({ ...idle(), mutate: mocks.claimMutate }),
		useSpendableXlmBalance: () => ({ data: undefined, isLoading: true }),
		useLpPool: () => ({ data: undefined, isLoading: true }),
	};
});

const WALLET = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const KEY = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4';

const positions: LpPosition[] = [
	{
		lpId: '11',
		keyId: KEY,
		keyName: 'Alpha Key',
		creatorId: 'alpha',
		contributionStroops: 300_000_000n,
		shareBps: 3333,
		poolTotalLiquidityStroops: 900_000_000n,
		pendingRewardsStroops: 4_000_000n,
		claimedRewardsStroops: 1_000_000n,
		lock: { kind: 'none' },
	},
];

function renderAt(path: string) {
	return render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/profile" element={<ProfilePage />} />
				<Route path="/profile/:wallet" element={<ProfilePage />} />
			</Routes>
		</MemoryRouter>
	);
}

describe('ProfilePage Liquidity tab (#1030)', () => {
	beforeEach(() => {
		mocks.useLpPositions.mockReset();
		mocks.claimMutate.mockReset();
		mocks.useStellarWallet.mockReturnValue({
			address: WALLET,
			isConnected: true,
			loading: false,
			activeSigner: { type: 'software' },
		});
		mocks.useLpPositions.mockReturnValue({
			data: positions,
			isLoading: false,
			isError: false,
			dataUpdatedAt: Date.now(),
			refetch: vi.fn(),
		});
	});

	it('adds a Liquidity tab that renders LP positions and earnings', () => {
		renderAt('/profile');
		fireEvent.click(screen.getByRole('tab', { name: /Liquidity/ }));

		const panel = screen.getByTestId('portfolio-liquidity-panel');
		expect(within(panel).getByTestId('lp-share-11')).toHaveTextContent(
			'33.33%'
		);
		expect(within(panel).getByTestId('lp-earnings-total')).toHaveTextContent(
			'0.5000000 XLM'
		);
		fireEvent.click(within(panel).getByTestId('lp-claim-11'));
		expect(mocks.claimMutate).toHaveBeenCalledWith({
			lpId: '11',
			keyId: KEY,
		});
	});

	it('deep-links to the tab and uses the public wallet read-only', () => {
		const other = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
		renderAt(`/profile/${other}?tab=liquidity`);
		expect(mocks.useLpPositions).toHaveBeenCalledWith(other);
		expect(screen.queryByTestId('lp-claim-11')).not.toBeInTheDocument();
	});
});
