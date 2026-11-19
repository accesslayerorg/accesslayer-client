import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import {
	useClaimAllRevenueShareMutation,
	useClaimRevenueShareMutation,
	useRevenueShareDistributions,
} from '@/hooks/useRevenueShare';
import { useKeyHolders } from '@/hooks/useKeyHolders';
import {
	claimRevenueShare,
	fetchRevenueShareDistributions,
} from '@/services/revenueShare.service';
import { queryKeys } from '@/lib/queryKeys';
import { saveCreatorDistributionHistory } from '@/utils/creatorRevenue.utils';
import type { RevenueShareDistribution } from '@/types/revenueShare';

vi.mock('@/hooks/useKeyHolders', () => ({
	useKeyHolders: vi.fn(),
}));

vi.mock('@/services/revenueShare.service', () => ({
	fetchRevenueShareDistributions: vi.fn(),
	claimRevenueShare: vi.fn(),
}));

vi.mock('@/utils/toast.util', () => ({
	default: { success: vi.fn(), error: vi.fn() },
}));

const KEY_ID = 'key-1';
const WALLET = '0xAAA';

function distribution(
	overrides: Partial<RevenueShareDistribution> = {}
): RevenueShareDistribution {
	return {
		id: 'dist-1',
		creatorId: KEY_ID,
		amount: 100,
		timestamp: 1_700_000_000_000,
		holderCount: 4,
		userShare: 25,
		claimed: false,
		receivedAmount: null,
		claimedAt: null,
		...overrides,
	};
}

describe('useRevenueShare (#1223)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.clearAllMocks();
		window.localStorage.clear();

		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});

		vi.mocked(useKeyHolders).mockReturnValue({
			holders: [],
		} as unknown as ReturnType<typeof useKeyHolders>);

		vi.mocked(fetchRevenueShareDistributions).mockResolvedValue([]);
		vi.mocked(claimRevenueShare).mockResolvedValue({ success: true });
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('loads the distributions for the key and wallet', async () => {
		vi.mocked(fetchRevenueShareDistributions).mockResolvedValue([
			distribution(),
		]);

		const { result } = renderHook(
			() => useRevenueShareDistributions(KEY_ID, WALLET),
			{ wrapper }
		);

		await waitFor(() => {
			expect(result.current.distributions).toHaveLength(1);
		});

		expect(fetchRevenueShareDistributions).toHaveBeenCalledWith(KEY_ID, WALLET);
		expect(result.current.distributions[0].userShare).toBe(25);
	});

	it('lists the distributions the creator recorded locally', async () => {
		saveCreatorDistributionHistory(KEY_ID, [
			{
				id: 'dist-local',
				creatorId: KEY_ID,
				amount: 60,
				timestamp: 1_700_000_000_000,
				holderCount: 3,
				status: 'confirmed',
			},
		]);

		const { result } = renderHook(
			() => useRevenueShareDistributions(KEY_ID, WALLET),
			{ wrapper }
		);

		await waitFor(() => {
			expect(result.current.distributions).toHaveLength(1);
		});

		expect(result.current.distributions[0].id).toBe('dist-local');
		expect(result.current.distributions[0].amount).toBe(60);
	});

	it('estimates the user share from the holder keys when the server omits it', async () => {
		vi.mocked(useKeyHolders).mockReturnValue({
			holders: [
				{
					id: 'h1',
					displayName: 'Alice',
					walletAddress: '0xAAA',
					keyCount: 30,
				},
				{
					id: 'h2',
					displayName: 'Bob',
					walletAddress: '0xBBB',
					keyCount: 10,
				},
			],
		} as unknown as ReturnType<typeof useKeyHolders>);
		vi.mocked(fetchRevenueShareDistributions).mockResolvedValue([
			distribution({ userShare: 0 }),
		]);

		const { result } = renderHook(
			() => useRevenueShareDistributions(KEY_ID, WALLET),
			{ wrapper }
		);

		await waitFor(() => {
			expect(result.current.distributions).toHaveLength(1);
		});

		// 30 / 40 * 100
		expect(result.current.distributions[0].userShare).toBe(75);
	});

	it('marks the distribution claimed after a successful claim', async () => {
		vi.mocked(fetchRevenueShareDistributions).mockResolvedValue([
			distribution(),
		]);

		const { result } = renderHook(
			() => useRevenueShareDistributions(KEY_ID, WALLET),
			{ wrapper }
		);
		await waitFor(() => {
			expect(result.current.distributions).toHaveLength(1);
		});

		const { result: claim } = renderHook(
			() => useClaimRevenueShareMutation(KEY_ID, WALLET),
			{ wrapper }
		);

		await act(async () => {
			await claim.current.mutateAsync('dist-1');
		});

		expect(claimRevenueShare).toHaveBeenCalledWith(KEY_ID, 'dist-1', WALLET);

		const cached = queryClient.getQueryData<RevenueShareDistribution[]>(
			queryKeys.revenueShare.distributions(KEY_ID, WALLET)
		);
		expect(cached?.[0].claimed).toBe(true);
		expect(cached?.[0].receivedAmount).toBe(25);
		expect(cached?.[0].claimedAt).toEqual(expect.any(Number));
	});

	it('claims every unclaimed distribution one after another', async () => {
		const order: string[] = [];
		let releaseFirst!: () => void;

		vi.mocked(claimRevenueShare).mockImplementation(
			async (_keyId: string, distributionId: string) => {
				order.push(distributionId);
				if (distributionId === 'dist-1') {
					await new Promise<void>(resolve => {
						releaseFirst = resolve;
					});
				}
				return { success: true };
			}
		);

		queryClient.setQueryData<RevenueShareDistribution[]>(
			queryKeys.revenueShare.distributions(KEY_ID, WALLET),
			[
				distribution({ id: 'dist-1', userShare: 10 }),
				distribution({ id: 'dist-2', userShare: 20 }),
			]
		);

		const { result } = renderHook(
			() => useClaimAllRevenueShareMutation(KEY_ID, WALLET),
			{ wrapper }
		);

		let pending: Promise<unknown> = Promise.resolve();
		act(() => {
			pending = result.current.mutateAsync(['dist-1', 'dist-2']);
		});

		// The second claim only goes out once the first one has settled.
		await waitFor(() => expect(order).toEqual(['dist-1']));
		expect(order).not.toContain('dist-2');

		await act(async () => {
			releaseFirst();
			await pending;
		});

		expect(order).toEqual(['dist-1', 'dist-2']);
	});
});
