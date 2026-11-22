import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { LpPosition } from '@/services/lpPositions.service';

const hooks = vi.hoisted(() => ({
	useStellarWallet: vi.fn(),
	useLpPositions: vi.fn(),
	useAddLiquidity: vi.fn(),
	useClaimLpRewards: vi.fn(),
	useRemoveLiquidity: vi.fn(),
	useSpendableXlmBalance: vi.fn(),
	useLpPool: vi.fn(),
}));

vi.mock('@/hooks/useStellarWallet', () => ({
	useStellarWallet: hooks.useStellarWallet,
}));

vi.mock('@/hooks/useLpPositions', async importOriginal => {
	const original =
		await importOriginal<typeof import('@/hooks/useLpPositions')>();
	return {
		describeLpTransactionError: original.describeLpTransactionError,
		useLpPositions: hooks.useLpPositions,
		useAddLiquidity: hooks.useAddLiquidity,
		useClaimLpRewards: hooks.useClaimLpRewards,
		useRemoveLiquidity: hooks.useRemoveLiquidity,
		useSpendableXlmBalance: hooks.useSpendableXlmBalance,
		useLpPool: hooks.useLpPool,
	};
});

import LiquidityPositionsSection from '../LiquidityPositionsSection';

const XLM = 10_000_000n;
const WALLET = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const OTHER = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
const KEY = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4';

function position(overrides: Partial<LpPosition> = {}): LpPosition {
	return {
		lpId: '1',
		keyId: KEY,
		keyName: 'Alpha Key',
		creatorId: 'alpha',
		contributionStroops: 100n * XLM,
		shareBps: 5000,
		poolTotalLiquidityStroops: 200n * XLM,
		pendingRewardsStroops: 2n * XLM,
		claimedRewardsStroops: 1n * XLM,
		lock: { kind: 'none' },
		...overrides,
	};
}

function mutation(overrides: Record<string, unknown> = {}) {
	return {
		mutate: vi.fn(),
		reset: vi.fn(),
		isPending: false,
		isError: false,
		error: null,
		variables: undefined,
		...overrides,
	};
}

function query(overrides: Record<string, unknown> = {}) {
	return {
		data: undefined,
		isLoading: false,
		isError: false,
		dataUpdatedAt: 0,
		refetch: vi.fn(),
		...overrides,
	};
}

function renderSection(publicWallet?: string) {
	return render(
		<MemoryRouter>
			<LiquidityPositionsSection publicWallet={publicWallet} />
		</MemoryRouter>
	);
}

let add: ReturnType<typeof mutation>;
let claim: ReturnType<typeof mutation>;
let remove: ReturnType<typeof mutation>;

beforeEach(() => {
	hooks.useStellarWallet.mockReturnValue({
		address: WALLET,
		isConnected: true,
		loading: false,
		activeSigner: { type: 'software' },
	});
	add = mutation();
	claim = mutation();
	remove = mutation();
	hooks.useAddLiquidity.mockReturnValue(add);
	hooks.useClaimLpRewards.mockReturnValue(claim);
	hooks.useRemoveLiquidity.mockReturnValue(remove);
	hooks.useSpendableXlmBalance.mockReturnValue(query({ data: 50n * XLM }));
	hooks.useLpPool.mockReturnValue(query({ data: null }));
});

describe('LiquidityPositionsSection (#1030)', () => {
	it('loads the connected Stellar wallet positions and aggregates earnings', () => {
		hooks.useLpPositions.mockReturnValue(
			query({
				data: [
					position(),
					position({
						lpId: '2',
						keyName: 'Beta Key',
						pendingRewardsStroops: 3n * XLM,
						claimedRewardsStroops: null,
					}),
				],
			})
		);
		renderSection();

		expect(hooks.useLpPositions).toHaveBeenCalledWith(WALLET);
		// (2 + 3) unclaimed + (1 + 0) claimed = 6 XLM
		expect(screen.getByTestId('lp-earnings-total')).toHaveTextContent(
			'6.0000000 XLM'
		);
		expect(screen.getByTestId('lp-earnings-unclaimed')).toHaveTextContent(
			'5.0000000 XLM'
		);
		expect(screen.getByTestId('lp-earnings-claimed')).toHaveTextContent(
			'1.0000000 XLM'
		);
		expect(screen.getByTestId('lp-earnings-count')).toHaveTextContent('2');
		expect(screen.getAllByRole('listitem')).toHaveLength(2);
	});

	it('withholds the total when a position reward is unavailable', () => {
		hooks.useLpPositions.mockReturnValue(
			query({
				data: [
					position(),
					position({ lpId: '2', pendingRewardsStroops: null }),
				],
			})
		);
		renderSection();
		expect(screen.getByTestId('lp-earnings-total')).toHaveTextContent(
			'Unavailable'
		);
		expect(screen.getByTestId('lp-earnings-incomplete')).toBeInTheDocument();
	});

	it('claims the clicked position with its lp id and key', () => {
		hooks.useLpPositions.mockReturnValue(query({ data: [position()] }));
		renderSection();
		fireEvent.click(screen.getByTestId('lp-claim-1'));
		expect(claim.mutate).toHaveBeenCalledWith({ lpId: '1', keyId: KEY });
	});

	it('confirms before removing, then submits the removal', () => {
		hooks.useLpPositions.mockReturnValue(query({ data: [position()] }));
		renderSection();
		fireEvent.click(screen.getByTestId('lp-remove-1'));
		const dialog = screen.getByRole('dialog');
		expect(dialog).toHaveTextContent('100.0000000 XLM');
		expect(dialog).toHaveTextContent('2.0000000 XLM');
		fireEvent.click(within(dialog).getByTestId('lp-remove-confirm'));
		expect(remove.mutate).toHaveBeenCalledWith(
			{ lpId: '1', keyId: KEY },
			expect.objectContaining({ onSuccess: expect.any(Function) })
		);
	});

	it('shows the removal failure inside the confirmation dialog', () => {
		hooks.useLpPositions.mockReturnValue(query({ data: [position()] }));
		hooks.useRemoveLiquidity.mockReturnValue(
			mutation({ isError: true, error: new Error('Error(Contract, #2)') })
		);
		renderSection();
		fireEvent.click(screen.getByTestId('lp-remove-1'));
		expect(screen.getByTestId('lp-remove-error')).toHaveTextContent(
			'This liquidity position no longer exists.'
		);
	});

	it('does not offer removal of a locked position', () => {
		hooks.useLpPositions.mockReturnValue(
			query({
				data: [
					position({
						// +30s margin keeps the label stable however long the render takes.
						lock: {
							kind: 'until',
							unlocksAtMs: Date.now() + 3 * 86_400_000 + 30_000,
						},
					}),
				],
			})
		);
		renderSection();
		expect(screen.getByTestId('lp-remove-1')).toBeDisabled();
		expect(screen.getByTestId('lp-lock-status-1')).toHaveTextContent(
			'Locked · 3d 0h 0m remaining'
		);
	});

	it('opens the add-liquidity modal for the pool and submits through the mutation', () => {
		hooks.useLpPositions.mockReturnValue(query({ data: [position()] }));
		renderSection();
		fireEvent.click(screen.getByTestId('lp-add-1'));
		fireEvent.change(screen.getByLabelText('Amount (XLM)'), {
			target: { value: '5' },
		});
		fireEvent.click(screen.getByTestId('add-liquidity-submit'));
		expect(add.mutate).toHaveBeenCalledWith(
			{ keyId: KEY, amountInput: '5' },
			expect.objectContaining({ onSuccess: expect.any(Function) })
		);
	});

	it('shows an empty state when the wallet has no positions', () => {
		hooks.useLpPositions.mockReturnValue(query({ data: [] }));
		renderSection();
		expect(screen.getByTestId('lp-positions-empty')).toHaveTextContent(
			'No liquidity positions yet'
		);
		expect(screen.getByTestId('lp-earnings-total')).toHaveTextContent(
			'0.0000000 XLM'
		);
	});

	it('shows a skeleton while loading', () => {
		hooks.useLpPositions.mockReturnValue(query({ isLoading: true }));
		renderSection();
		expect(screen.getByTestId('lp-positions-skeleton')).toBeInTheDocument();
	});

	it('shows an error with retry when nothing could be loaded', () => {
		const refetch = vi.fn();
		hooks.useLpPositions.mockReturnValue(query({ isError: true, refetch }));
		renderSection();
		fireEvent.click(
			within(screen.getByTestId('lp-positions-error')).getByRole('button', {
				name: /Retry/,
			})
		);
		expect(refetch).toHaveBeenCalled();
	});

	it('flags stale data when a refresh fails after a successful load', () => {
		hooks.useLpPositions.mockReturnValue(
			query({ data: [position()], isError: true, dataUpdatedAt: Date.now() })
		);
		renderSection();
		expect(screen.getByTestId('lp-positions-stale')).toHaveTextContent(
			/Couldn't refresh positions/
		);
		expect(screen.getByTestId('lp-position-1')).toBeInTheDocument();
	});

	it('asks for a Stellar wallet when none is connected on the own portfolio', () => {
		hooks.useStellarWallet.mockReturnValue({
			address: undefined,
			isConnected: false,
			loading: false,
			activeSigner: null,
		});
		hooks.useLpPositions.mockReturnValue(query());
		renderSection();
		expect(screen.getByTestId('lp-connect-wallet')).toBeInTheDocument();
	});

	it("renders another wallet's positions read-only", () => {
		hooks.useLpPositions.mockReturnValue(query({ data: [position()] }));
		renderSection(OTHER);
		expect(hooks.useLpPositions).toHaveBeenCalledWith(OTHER);
		expect(screen.getByTestId('lp-rewards-1')).toBeInTheDocument();
		expect(screen.queryByTestId('lp-claim-1')).not.toBeInTheDocument();
		expect(hooks.useClaimLpRewards).toHaveBeenCalledWith({
			wallet: undefined,
			signer: null,
		});
	});
});
