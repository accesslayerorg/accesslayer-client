import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	useReferralHolds,
	useReviewReferralHoldMutation,
} from '../useReferralHolds';
import { queryKeys } from '@/lib/queryKeys';
import {
	fetchReferralHoldsPage,
	submitReferralHoldReview,
	type ReferralHold,
	type ReferralHoldsPage,
} from '@/services/adminReferralHolds.service';
import showToast from '@/utils/toast.util';

vi.mock('@/services/adminReferralHolds.service', async () => {
	const actual =
		await vi.importActual<typeof import('@/services/adminReferralHolds.service')>(
			'@/services/adminReferralHolds.service'
		);
	return {
		...actual,
		fetchReferralHoldsPage: vi.fn(),
		fetchReferralHoldDetail: vi.fn(),
		fetchReferralHoldsSummary: vi.fn(),
		submitReferralHoldReview: vi.fn(),
	};
});

vi.mock('@/utils/toast.util', () => ({
	default: { success: vi.fn(), error: vi.fn() },
}));

const mockFetchPage = vi.mocked(fetchReferralHoldsPage);
const mockSubmitReview = vi.mocked(submitReferralHoldReview);

function makeHold(id: string, status: ReferralHold['status'] = 'held'): ReferralHold {
	return {
		id,
		referrer: `REFERRER_${id}`,
		referee: `REFEREE_${id}`,
		reason: 'self-referral',
		clusterSize: 3,
		amountXlm: 4.5,
		status,
		createdAt: '2026-01-01T00:00:00.000Z',
	};
}

function createWrapper(queryClient?: QueryClient) {
	const client =
		queryClient ??
		new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return React.createElement(QueryClientProvider, { client }, children);
	};
}

describe('useReferralHolds (#1405)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('passes the status filter to the service and fetches only the first page', async () => {
		const page: ReferralHoldsPage = {
			items: [makeHold('h1')],
			nextCursor: null,
		};
		mockFetchPage.mockResolvedValue(page);

		const { result } = renderHook(
			() => useReferralHolds({ status: 'held', reason: 'self-referral' }),
			{ wrapper: createWrapper() }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(mockFetchPage).toHaveBeenCalledTimes(1);
		expect(mockFetchPage).toHaveBeenCalledWith(
			{ status: 'held', reason: 'self-referral' },
			null
		);
		expect(result.current.holds).toHaveLength(1);
		expect(result.current.hasNextPage).toBe(false);
	});

	it('fetches the next cursor page and flattens the rows', async () => {
		mockFetchPage
			.mockResolvedValueOnce({
				items: [makeHold('h1')],
				nextCursor: 'cursor-2',
			})
			.mockResolvedValueOnce({
				items: [makeHold('h2')],
				nextCursor: null,
			});

		const { result } = renderHook(
			() => useReferralHolds({ status: 'held' }),
			{ wrapper: createWrapper() }
		);
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		await act(async () => {
			await result.current.fetchNextPage();
		});

		expect(mockFetchPage).toHaveBeenCalledTimes(2);
		expect(mockFetchPage).toHaveBeenNthCalledWith(
			2,
			{ status: 'held', reason: undefined },
			'cursor-2'
		);
		await waitFor(() =>
			expect(result.current.holds.map(hold => hold.id)).toEqual(['h1', 'h2'])
		);
		expect(result.current.hasNextPage).toBe(false);
	});
});

describe('useReviewReferralHoldMutation (#1407)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function seedCache(queryClient: QueryClient) {
		const listKey = queryKeys.admin.referralHolds.list({ status: 'held' });
		queryClient.setQueryData<{ pages: ReferralHoldsPage[]; pageParams: (string | null)[] }>(
			listKey,
			{
				pages: [{ items: [makeHold('h1')], nextCursor: null }],
				pageParams: [null],
			}
		);
		queryClient.setQueryData(queryKeys.admin.referralHolds.summary(), {
			held: 1,
			released: 0,
			rejected: 0,
			amountHeldXlm: 4.5,
		});
		return listKey;
	}

	function readStatus(queryClient: QueryClient, listKey: readonly unknown[]) {
		const data = queryClient.getQueryData<{
			pages: ReferralHoldsPage[];
		}>(listKey);
		return data?.pages[0].items[0].status;
	}

	it('optimistically marks the row released with the required note', async () => {
		mockSubmitReview.mockReturnValue(new Promise(() => {}));
		const queryClient = new QueryClient({
			defaultOptions: { mutations: { retry: false } },
		});
		const listKey = seedCache(queryClient);

		const { result } = renderHook(() => useReviewReferralHoldMutation(), {
			wrapper: createWrapper(queryClient),
		});

		act(() => {
			result.current.mutate({
				holdId: 'h1',
				action: 'release',
				note: 'Verified unique funding source',
				reviewer: 'CADMIN',
			});
		});

		await waitFor(() => expect(readStatus(queryClient, listKey)).toBe('released'));
		expect(mockSubmitReview).toHaveBeenCalledWith('h1', {
			action: 'release',
			note: 'Verified unique funding source',
			reviewer: 'CADMIN',
		});
		const summary = queryClient.getQueryData<{
			held: number;
			released: number;
			rejected: number;
		}>(queryKeys.admin.referralHolds.summary());
		expect(summary).toMatchObject({ held: 0, released: 1, rejected: 0 });
	});

	it('optimistically marks the row rejected', async () => {
		mockSubmitReview.mockReturnValue(new Promise(() => {}));
		const queryClient = new QueryClient({
			defaultOptions: { mutations: { retry: false } },
		});
		const listKey = seedCache(queryClient);

		const { result } = renderHook(() => useReviewReferralHoldMutation(), {
			wrapper: createWrapper(queryClient),
		});

		act(() => {
			result.current.mutate({
				holdId: 'h1',
				action: 'reject',
				note: 'Confirmed sybil cluster',
			});
		});

		await waitFor(() => expect(readStatus(queryClient, listKey)).toBe('rejected'));
	});

	it('rolls the optimistic row back when the review fails', async () => {
		mockSubmitReview.mockRejectedValue(new Error('server error'));
		const queryClient = new QueryClient({
			defaultOptions: { mutations: { retry: false } },
		});
		const listKey = seedCache(queryClient);

		const { result } = renderHook(() => useReviewReferralHoldMutation(), {
			wrapper: createWrapper(queryClient),
		});

		act(() => {
			result.current.mutate({
				holdId: 'h1',
				action: 'release',
				note: 'Will fail',
			});
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(readStatus(queryClient, listKey)).toBe('held');
		expect(showToast.error).toHaveBeenCalled();
	});
});
