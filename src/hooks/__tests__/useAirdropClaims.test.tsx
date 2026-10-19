import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import {
	PartialAirdropClaimError,
	sequenceClaimAirdropCalls,
	useAirdropAllocations,
	useClaimAirdropMutation,
	useClaimAllAirdropsMutation,
	type AirdropAllocation,
} from '@/hooks/useAirdropClaims';
import { fetchAirdropsForWallet } from '@/services/airdrop.service';
import { loadAirdropClaimHistory } from '@/utils/airdropClaim.utils';
import { queryKeys } from '@/lib/queryKeys';
import showToast from '@/utils/toast.util';

vi.mock('@/services/airdrop.service', () => ({
	fetchAirdropsForWallet: vi.fn(),
}));

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

const mockFetch = vi.mocked(fetchAirdropsForWallet);
const mockSuccess = vi.mocked(showToast.success);
const mockError = vi.mocked(showToast.error);

const WALLET = 'GAIRDROPWALLET00000000000000000000000000000000000000000000001';

function makeAirdrop(overrides: Partial<AirdropAllocation> = {}): AirdropAllocation {
	return {
		id: 'airdrop-1',
		keyId: 'key-1',
		keyName: 'Alice',
		snapshotDate: '2026-09-01T00:00:00Z',
		totalDistributed: 10_000,
		userAllocation: 25,
		...overrides,
	};
}

describe('useAirdropClaims', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.clearAllMocks();
		window.localStorage.clear();
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	describe('useAirdropAllocations', () => {
		it('fetches allocations and caches them under the airdrop query key', async () => {
			const allocations = [
				makeAirdrop(),
				makeAirdrop({ id: 'airdrop-2', keyId: 'key-2', keyName: 'Bob' }),
			];
			mockFetch.mockResolvedValue(allocations);

			const { result } = renderHook(() => useAirdropAllocations(WALLET), {
				wrapper,
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			expect(mockFetch).toHaveBeenCalledWith(WALLET);
			expect(result.current.data).toEqual(allocations);
			expect(
				queryClient.getQueryData(queryKeys.airdrop.allocations(WALLET))
			).toEqual(allocations);
		});

		it('does not fetch when wallet is empty', () => {
			mockFetch.mockResolvedValue([]);
			renderHook(() => useAirdropAllocations(''), { wrapper });
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe('sequenceClaimAirdropCalls', () => {
		it('submits one claim_airdrop call per airdrop, in order', async () => {
			const airdrops = [
				makeAirdrop({ id: 'a', userAllocation: 10 }),
				makeAirdrop({ id: 'b', userAllocation: 20 }),
				makeAirdrop({ id: 'c', userAllocation: 30 }),
			];
			const submittedIds: string[] = [];
			const submit = vi.fn(async (airdrop: AirdropAllocation) => {
				submittedIds.push(airdrop.id);
				return {
					success: true as const,
					transactionHash: `hash-${airdrop.id}`,
					claimedAt: 1_000,
				};
			});

			const records = await sequenceClaimAirdropCalls(airdrops, submit);

			expect(submittedIds).toEqual(['a', 'b', 'c']);
			expect(records.map(record => record.id)).toEqual(['a', 'b', 'c']);
			expect(records.map(record => record.amount)).toEqual([10, 20, 30]);
			expect(records.map(record => record.transactionHash)).toEqual([
				'hash-a',
				'hash-b',
				'hash-c',
			]);
		});

		it('stops on mid-sequence failure and throws PartialAirdropClaimError with completed records', async () => {
			const airdrops = [
				makeAirdrop({ id: 'a', userAllocation: 10 }),
				makeAirdrop({ id: 'b', userAllocation: 20 }),
				makeAirdrop({ id: 'c', userAllocation: 30 }),
			];
			const submit = vi.fn(async (airdrop: AirdropAllocation) => {
				if (airdrop.id === 'b') throw new Error('user rejected');
				return {
					success: true as const,
					transactionHash: `hash-${airdrop.id}`,
					claimedAt: 1_000,
				};
			});

			await expect(sequenceClaimAirdropCalls(airdrops, submit)).rejects.toThrow(
				PartialAirdropClaimError
			);
			expect(submit).toHaveBeenCalledTimes(2);

			try {
				await sequenceClaimAirdropCalls(airdrops, submit);
			} catch (error) {
				expect(error).toBeInstanceOf(PartialAirdropClaimError);
				const partial = error as PartialAirdropClaimError;
				expect(partial.completedRecords.map(record => record.id)).toEqual([
					'a',
				]);
			}
		});

		it('rethrows the original error when the first call fails', async () => {
			const submit = vi.fn(async () => {
				throw new Error('network down');
			});

			await expect(
				sequenceClaimAirdropCalls([makeAirdrop()], submit)
			).rejects.toThrow('network down');
		});
	});

	describe('useClaimAirdropMutation', () => {
		it('submits claim_airdrop, appends the claim record, and toasts', async () => {
			const onAppended = vi.fn();
			const airdrop = makeAirdrop({ id: 'claim-me', userAllocation: 42 });

			const { result } = renderHook(
				() => useClaimAirdropMutation(WALLET, { onAppended }),
				{ wrapper }
			);

			result.current.mutate(airdrop);

			await waitFor(
				() => expect(result.current.isSuccess).toBe(true),
				{ timeout: 5000 }
			);

			expect(onAppended).toHaveBeenCalledTimes(1);
			const records = onAppended.mock.calls[0][0];
			expect(records).toHaveLength(1);
			expect(records[0]).toMatchObject({
				id: 'claim-me',
				keyId: 'key-1',
				amount: 42,
			});
			expect(records[0].transactionHash).toMatch(/^[0-9a-f]{64}$/);
			expect(mockSuccess).toHaveBeenCalledWith('Airdrop claimed');
			expect(mockError).not.toHaveBeenCalled();

			expect(loadAirdropClaimHistory(WALLET)).toHaveLength(1);
		});
	});

	describe('useClaimAllAirdropsMutation', () => {
		it('sequences every unclaimed claim and appends all records', async () => {
			const onAppended = vi.fn();
			const airdrops = [
				makeAirdrop({ id: 'all-1', keyId: 'key-1', userAllocation: 10 }),
				makeAirdrop({ id: 'all-2', keyId: 'key-2', userAllocation: 15.5 }),
			];

			const { result } = renderHook(
				() => useClaimAllAirdropsMutation(WALLET, { onAppended }),
				{ wrapper }
			);

			result.current.mutate({ airdrops });

			await waitFor(
				() => expect(result.current.isSuccess).toBe(true),
				{ timeout: 5000 }
			);

			expect(result.current.data?.claimedCount).toBe(2);
			expect(result.current.data?.claimedAmount).toBeCloseTo(25.5);
			expect(onAppended).toHaveBeenCalledTimes(1);
			const records = onAppended.mock.calls[0][0];
			expect(records.map((record: { id: string }) => record.id)).toEqual([
				'all-1',
				'all-2',
			]);
			expect(mockSuccess).toHaveBeenCalledWith('Claimed 2 airdrops');

			const history = loadAirdropClaimHistory(WALLET);
			expect(history.map(record => record.id).sort()).toEqual([
				'all-1',
				'all-2',
			]);
		});
	});
});
