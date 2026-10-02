import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import { SigningPipelineError } from '@/lib/signing/errors';
import type { Signer } from '@/lib/signing/types';
import type { LpPosition } from '@/services/lpPositions.service';

const mocks = vi.hoisted(() => ({
	fetchLpPositions: vi.fn(),
	fetchLpPool: vi.fn(),
	getSpendableXlmStroops: vi.fn(),
	addLiquidity: vi.fn(),
	claimRewards: vi.fn(),
	removeLiquidity: vi.fn(),
	toastError: vi.fn(),
	toastTx: vi.fn(),
}));

vi.mock('@/services/lpPositions.service', () => ({
	fetchLpPositions: mocks.fetchLpPositions,
	fetchLpPool: mocks.fetchLpPool,
}));

vi.mock('@/services/stellarAccount.service', () => ({
	stellarAccountService: {
		getSpendableXlmStroops: mocks.getSpendableXlmStroops,
	},
}));

vi.mock('@/services/lpContract.service', async importOriginal => {
	const original =
		await importOriginal<typeof import('@/services/lpContract.service')>();
	return {
		...original,
		lpContractService: {
			addLiquidity: mocks.addLiquidity,
			claimRewards: mocks.claimRewards,
			removeLiquidity: mocks.removeLiquidity,
		},
	};
});

vi.mock('@/utils/toast.util', () => ({
	default: {
		error: mocks.toastError,
		transactionSuccess: mocks.toastTx,
		success: vi.fn(),
	},
}));

import {
	assertPositionRemovable,
	describeLpTransactionError,
	useAddLiquidity,
	useClaimLpRewards,
	useLpPositions,
	useRemoveLiquidity,
} from '../useLpPositions';
import { LpContractError } from '@/services/lpContract.service';

const WALLET = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const KEY = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4';
const HASH = 'f'.repeat(64);
const XLM = 10_000_000n;

const signer: Signer = {
	type: 'software',
	getPublicKey: vi.fn().mockResolvedValue(WALLET),
	sign: vi.fn(),
};

function position(overrides: Partial<LpPosition> = {}): LpPosition {
	return {
		lpId: '1',
		keyId: KEY,
		keyName: 'Alpha Key',
		creatorId: null,
		contributionStroops: 100n * XLM,
		shareBps: 5000,
		poolTotalLiquidityStroops: 200n * XLM,
		pendingRewardsStroops: 5n * XLM,
		claimedRewardsStroops: 0n,
		lock: { kind: 'none' },
		...overrides,
	};
}

let queryClient: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
	<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	Object.values(mocks).forEach(mock => mock.mockReset());
});

describe('useLpPositions', () => {
	it('loads positions under the lp positions query key', async () => {
		mocks.fetchLpPositions.mockResolvedValue([position()]);
		const { result } = renderHook(() => useLpPositions(WALLET), { wrapper });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(mocks.fetchLpPositions).toHaveBeenCalledWith(WALLET);
		expect(queryClient.getQueryData(queryKeys.lp.positions(WALLET))).toEqual([
			position(),
		]);
	});

	it('stays idle without a wallet', () => {
		const { result } = renderHook(() => useLpPositions(undefined), {
			wrapper,
		});
		expect(result.current.fetchStatus).toBe('idle');
		expect(mocks.fetchLpPositions).not.toHaveBeenCalled();
	});
});

describe('useAddLiquidity', () => {
	it('re-validates against a fresh balance and submits the exact stroop amount', async () => {
		mocks.getSpendableXlmStroops.mockResolvedValue(50n * XLM);
		mocks.addLiquidity.mockResolvedValue({ hash: HASH, value: 8n });
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

		const { result } = renderHook(
			() => useAddLiquidity({ wallet: WALLET, signer }),
			{ wrapper }
		);
		await act(async () => {
			await result.current.mutateAsync({ keyId: KEY, amountInput: '12.5' });
		});

		expect(mocks.getSpendableXlmStroops).toHaveBeenCalledWith(WALLET);
		expect(mocks.addLiquidity).toHaveBeenCalledWith({
			keyId: KEY,
			provider: WALLET,
			amountStroops: 125_000_000n,
			signer,
		});
		expect(invalidate).toHaveBeenCalledWith({
			queryKey: queryKeys.lp.positions(WALLET),
		});
		expect(invalidate).toHaveBeenCalledWith({
			queryKey: queryKeys.lp.pool(KEY),
		});
		expect(invalidate).toHaveBeenCalledWith({
			queryKey: queryKeys.wallet.xlmBalance(WALLET),
		});
		expect(mocks.toastTx).toHaveBeenCalledWith(
			'Liquidity added',
			expect.stringContaining('#8'),
			HASH,
			expect.stringContaining(HASH)
		);
	});

	it('does not submit when the balance dropped below the amount after the modal opened', async () => {
		mocks.getSpendableXlmStroops.mockResolvedValue(10n * XLM);
		const { result } = renderHook(
			() => useAddLiquidity({ wallet: WALLET, signer }),
			{ wrapper }
		);

		await act(async () => {
			await result.current
				.mutateAsync({ keyId: KEY, amountInput: '12.5' })
				.catch(() => undefined);
		});

		expect(mocks.addLiquidity).not.toHaveBeenCalled();
		expect(mocks.toastError).toHaveBeenCalledWith(
			expect.stringMatching(/exceeds your available balance/)
		);
	});

	it.each(['0', 'abc', '1.123456789'])(
		'does not submit an invalid amount (%s)',
		async amountInput => {
			mocks.getSpendableXlmStroops.mockResolvedValue(50n * XLM);
			const { result } = renderHook(
				() => useAddLiquidity({ wallet: WALLET, signer }),
				{ wrapper }
			);
			await act(async () => {
				await result.current
					.mutateAsync({ keyId: KEY, amountInput })
					.catch(() => undefined);
			});
			expect(mocks.addLiquidity).not.toHaveBeenCalled();
		}
	);

	it('refuses to run without a connected signer', async () => {
		const { result } = renderHook(
			() => useAddLiquidity({ wallet: undefined, signer: null }),
			{ wrapper }
		);
		await act(async () => {
			await result.current
				.mutateAsync({ keyId: KEY, amountInput: '1' })
				.catch(() => undefined);
		});
		expect(mocks.getSpendableXlmStroops).not.toHaveBeenCalled();
		expect(mocks.addLiquidity).not.toHaveBeenCalled();
	});
});

describe('useClaimLpRewards', () => {
	it('submits the claim for the position and refreshes rewards after confirmation', async () => {
		mocks.claimRewards.mockResolvedValue({ hash: HASH, value: 5n * XLM });
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
		const { result } = renderHook(
			() => useClaimLpRewards({ wallet: WALLET, signer }),
			{ wrapper }
		);

		await act(async () => {
			await result.current.mutateAsync({ lpId: '1', keyId: KEY });
		});

		expect(mocks.claimRewards).toHaveBeenCalledWith({
			lpId: '1',
			provider: WALLET,
			signer,
		});
		expect(invalidate).toHaveBeenCalledWith({
			queryKey: queryKeys.lp.positions(WALLET),
		});
		expect(mocks.toastTx).toHaveBeenCalledWith(
			'Rewards claimed',
			'5.0000000 XLM was sent to your wallet.',
			HASH,
			expect.any(String)
		);
	});

	it('shows the failure and does not refresh as if it succeeded', async () => {
		mocks.claimRewards.mockRejectedValue(
			new LpContractError(
				'TRANSACTION_FAILED',
				'The transaction was submitted but did not succeed on-chain.'
			)
		);
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
		const { result } = renderHook(
			() => useClaimLpRewards({ wallet: WALLET, signer }),
			{ wrapper }
		);

		await act(async () => {
			await result.current
				.mutateAsync({ lpId: '1', keyId: KEY })
				.catch(() => undefined);
		});

		expect(mocks.toastError).toHaveBeenCalledWith(
			'The transaction was submitted but did not succeed on-chain.'
		);
		expect(mocks.toastTx).not.toHaveBeenCalled();
		expect(invalidate).not.toHaveBeenCalled();
	});

	it('re-syncs positions when the contract says there is nothing to claim', async () => {
		mocks.claimRewards.mockRejectedValue(
			new LpContractError(
				'NOTHING_TO_CLAIM',
				'There are no rewards to claim right now.'
			)
		);
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
		const { result } = renderHook(
			() => useClaimLpRewards({ wallet: WALLET, signer }),
			{ wrapper }
		);

		await act(async () => {
			await result.current
				.mutateAsync({ lpId: '1', keyId: KEY })
				.catch(() => undefined);
		});

		expect(mocks.toastError).toHaveBeenCalledWith(
			'There are no rewards to claim right now.'
		);
		expect(invalidate).toHaveBeenCalledWith({
			queryKey: queryKeys.lp.positions(WALLET),
		});
	});
});

describe('useRemoveLiquidity', () => {
	it('re-checks the lock from fresh data before submitting', async () => {
		mocks.fetchLpPositions.mockResolvedValue([position()]);
		mocks.removeLiquidity.mockResolvedValue({
			hash: HASH,
			value: 105n * XLM,
		});
		const { result } = renderHook(
			() => useRemoveLiquidity({ wallet: WALLET, signer }),
			{ wrapper }
		);

		await act(async () => {
			await result.current.mutateAsync({ lpId: '1', keyId: KEY });
		});

		expect(mocks.fetchLpPositions).toHaveBeenCalledWith(WALLET);
		expect(mocks.removeLiquidity).toHaveBeenCalledWith({
			lpId: '1',
			provider: WALLET,
			signer,
		});
		expect(mocks.toastTx).toHaveBeenCalledWith(
			'Liquidity removed',
			expect.stringContaining('105.0000000 XLM'),
			HASH,
			expect.any(String)
		);
	});

	it('blocks removal when fresh data shows the position is now locked', async () => {
		mocks.fetchLpPositions.mockResolvedValue([
			position({
				lock: { kind: 'until', unlocksAtMs: Date.now() + 86_400_000 },
			}),
		]);
		const { result } = renderHook(
			() => useRemoveLiquidity({ wallet: WALLET, signer }),
			{ wrapper }
		);

		await act(async () => {
			await result.current
				.mutateAsync({ lpId: '1', keyId: KEY })
				.catch(() => undefined);
		});

		expect(mocks.removeLiquidity).not.toHaveBeenCalled();
		expect(mocks.toastError).toHaveBeenCalledWith(
			'This position is still locked.'
		);
		// The fresh lock state is written to the cache so the list re-renders
		// with the countdown instead of the stale "unlocked" row.
		const cached = queryClient.getQueryData<LpPosition[]>(
			queryKeys.lp.positions(WALLET)
		);
		expect(cached?.[0].lock.kind).toBe('until');
	});

	it('re-syncs positions when the contract rejects the removal', async () => {
		mocks.fetchLpPositions.mockResolvedValue([position()]);
		mocks.removeLiquidity.mockRejectedValue(
			new LpContractError(
				'CONTRACT_REJECTED',
				'This liquidity position has already been closed.'
			)
		);
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
		const { result } = renderHook(
			() => useRemoveLiquidity({ wallet: WALLET, signer }),
			{ wrapper }
		);

		await act(async () => {
			await result.current
				.mutateAsync({ lpId: '1', keyId: KEY })
				.catch(() => undefined);
		});

		expect(mocks.toastTx).not.toHaveBeenCalled();
		expect(invalidate).toHaveBeenCalledWith({
			queryKey: queryKeys.lp.positions(WALLET),
		});
	});
});

describe('assertPositionRemovable', () => {
	it('rejects a position that is no longer active', () => {
		expect(() => assertPositionRemovable([], '1')).toThrow(
			'This liquidity position is no longer active.'
		);
	});

	it('rejects an unverifiable lock', () => {
		expect(() =>
			assertPositionRemovable([position({ lock: { kind: 'invalid' } })], '1')
		).toThrow(/could not be verified/);
	});

	it('accepts a position whose lock has expired', () => {
		expect(
			assertPositionRemovable(
				[position({ lock: { kind: 'until', unlocksAtMs: 1_000 } })],
				'1',
				2_000
			)
		).toMatchObject({ lpId: '1' });
	});
});

describe('describeLpTransactionError', () => {
	it('explains wallet rejections from the signing pipeline', () => {
		expect(
			describeLpTransactionError(new SigningPipelineError('UserRejected'))
		).toBe('Transaction cancelled in your wallet.');
		expect(
			describeLpTransactionError(new SigningPipelineError('NetworkMismatch'))
		).toMatch(/Switch your wallet/);
	});

	it('maps raw contract errors and falls back to the generic copy', () => {
		expect(
			describeLpTransactionError(new Error('Error(Contract, #3)'))
		).toMatch(/not authorized/);
		expect(describeLpTransactionError(new Error('socket hang up'))).toMatch(
			/Transaction failed/
		);
	});
});
