import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import {
	useKeyFlags,
	useFlagKeyMutation,
	ALREADY_FLAGGED_MESSAGE,
} from '@/hooks/useKeyFlags';
import {
	courseService,
	type KeyFlagReceipt,
	type KeyFlagsStatus,
} from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';

vi.mock('@/services/course.service', async importOriginal => {
	const original =
		await importOriginal<typeof import('@/services/course.service')>();
	return {
		...original,
		courseService: {
			...original.courseService,
			getKeyFlags: vi.fn(),
			flagKey: vi.fn(),
		},
	};
});

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

const mockGetKeyFlags = vi.mocked(courseService.getKeyFlags);
const mockFlagKey = vi.mocked(courseService.flagKey);

const KEY_ID = 'key-1386';
const WALLET = 'GFLAGGERWALLET12345';

function makeStatus(overrides: Partial<KeyFlagsStatus> = {}): KeyFlagsStatus {
	return {
		keyId: KEY_ID,
		flagCount: 2,
		threshold: 4,
		autoFrozen: false,
		reviewStatus: null,
		frozenAt: null,
		requiredStakeStroops: 1_000_000,
		userFlag: null,
		...overrides,
	};
}

function makeReceipt(): KeyFlagReceipt {
	return {
		txHash: '0xflagtx',
		keyId: KEY_ID,
		walletAddress: WALLET,
		reasonCode: 'spam',
		stakeStroops: 1_000_000,
		createdAt: '2026-11-20T10:00:00.000Z',
	};
}

describe('useKeyFlags (#1386)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false, gcTime: Infinity },
				mutations: { retry: false },
			},
		});
		mockGetKeyFlags.mockReset();
		mockFlagKey.mockReset();
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('returns the flag count, threshold, freeze state and wallet flag', async () => {
		mockGetKeyFlags.mockResolvedValue(makeStatus());

		const { result } = renderHook(() => useKeyFlags(KEY_ID, WALLET), {
			wrapper,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(mockGetKeyFlags).toHaveBeenCalledWith(KEY_ID, WALLET);
		expect(result.current.flagCount).toBe(2);
		expect(result.current.threshold).toBe(4);
		expect(result.current.autoFrozen).toBe(false);
		expect(result.current.userFlag).toBeNull();
		expect(result.current.requiredStakeStroops).toBe(1_000_000);
	});

	it('treats the key as frozen once the threshold is reached', async () => {
		mockGetKeyFlags.mockResolvedValue(
			makeStatus({ flagCount: 4, threshold: 4, autoFrozen: false })
		);

		const { result } = renderHook(() => useKeyFlags(KEY_ID, WALLET), {
			wrapper,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.autoFrozen).toBe(true);
		expect(result.current.reviewStatus).toBeNull();
	});

	it('exposes the resolution of the wallet flag (returned and forfeited)', async () => {
		mockGetKeyFlags.mockResolvedValue(
			makeStatus({
				flagCount: 4,
				autoFrozen: true,
				reviewStatus: 'resolved',
				userFlag: {
					id: 'flag-1',
					walletAddress: WALLET,
					reasonCode: 'fraud',
					stakeStroops: 1_000_000,
					createdAt: '2026-11-01T00:00:00.000Z',
					resolution: {
						status: 'returned',
						resolvedAt: '2026-11-05T00:00:00.000Z',
					},
				},
			})
		);

		const { result } = renderHook(() => useKeyFlags(KEY_ID, WALLET), {
			wrapper,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.userFlag?.walletAddress).toBe(WALLET);
		expect(result.current.resolution?.status).toBe('returned');
	});

	it('locks the stake, increments progress and freezes at the threshold', async () => {
		queryClient.setQueryData(
			queryKeys.creators.keyFlags(KEY_ID),
			makeStatus({ flagCount: 3, threshold: 4 })
		);
		mockFlagKey.mockResolvedValue(makeReceipt());

		const { result } = renderHook(
			() => useFlagKeyMutation(KEY_ID, WALLET),
			{ wrapper }
		);

		await act(async () => {
			await result.current.mutateAsync({
				reasonCode: 'spam',
				stakeStroops: 1_000_000,
			});
		});

		expect(mockFlagKey).toHaveBeenCalledWith(KEY_ID, {
			reasonCode: 'spam',
			stakeStroops: 1_000_000,
			walletAddress: WALLET,
		});

		const updated = queryClient.getQueryData<KeyFlagsStatus>(
			queryKeys.creators.keyFlags(KEY_ID)
		);
		expect(updated?.flagCount).toBe(4);
		expect(updated?.autoFrozen).toBe(true);
		expect(updated?.userFlag?.stakeStroops).toBe(1_000_000);
		expect(updated?.userFlag?.resolution).toBeNull();
	});

	it('blocks a second flag from the same wallet without calling the contract', async () => {
		queryClient.setQueryData(
			queryKeys.creators.keyFlags(KEY_ID),
			makeStatus({
				userFlag: {
					id: 'flag-existing',
					walletAddress: WALLET,
					reasonCode: 'abuse',
					stakeStroops: 1_000_000,
					createdAt: '2026-11-01T00:00:00.000Z',
				},
			})
		);

		const { result } = renderHook(
			() => useFlagKeyMutation(KEY_ID, WALLET),
			{ wrapper }
		);

		await expect(
			result.current.mutateAsync({
				reasonCode: 'fraud',
				stakeStroops: 1_000_000,
			})
		).rejects.toThrow(ALREADY_FLAGGED_MESSAGE);

		expect(mockFlagKey).not.toHaveBeenCalled();
	});

	it('refuses to flag without a connected wallet', async () => {
		const { result } = renderHook(
			() => useFlagKeyMutation(KEY_ID, undefined),
			{ wrapper }
		);

		await expect(
			result.current.mutateAsync({ reasonCode: 'spam', stakeStroops: 1_000_000 })
		).rejects.toThrow('Connect your wallet to flag this key.');
		expect(mockFlagKey).not.toHaveBeenCalled();
	});
});
