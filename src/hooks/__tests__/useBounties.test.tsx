import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	useAwardSubmission,
	useReclaimBounty,
	useRejectSubmission,
	useSubmitWork,
} from '@/hooks/useBounties';
import {
	getBounties,
	getBounty,
	getRemainingWinners,
	getSubmissions,
	resetBountyStore,
} from '@/services/bounty.service';
import { computeProofHash } from '@/utils/hash.utils';

vi.mock('@/hooks/useWallet', () => ({
	useWalletHoldings: vi.fn(() => ({ data: [], isLoading: false })),
}));

const { showToastSuccess, showToastError } = vi.hoisted(() => ({
	showToastSuccess: vi.fn(),
	showToastError: vi.fn(),
}));

vi.mock('@/utils/toast.util', () => ({
	default: { success: showToastSuccess, error: showToastError },
}));

const CREATOR = 'GCREATOR_A';
const WORKER = 'GWORKER_1';

describe('bounties (#1441)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.clearAllMocks();
		resetBountyStore();
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	const workInput = (bountyId: string, isHolder = true) => ({
		bountyId,
		worker: WORKER,
		link: 'https://example.com/work',
		description: 'Here is the completed launch banner design.',
		proofHash: computeProofHash(
			'https://example.com/work',
			'Here is the completed launch banner design.'
		),
		isHolder,
	});

	it('filters the board by key, reward range and status', () => {
		const all = getBounties();
		expect(all.length).toBeGreaterThan(0);

		expect(
			getBounties({ key: 'creator-beta' }).every(
				b => b.keyId === 'creator-beta'
			)
		).toBe(true);
		expect(
			getBounties({ minReward: 30_000_000 }).every(
				b => b.rewardStroops >= 30_000_000
			)
		).toBe(true);
		expect(
			getBounties({ minReward: 10_000_000, maxReward: 30_000_000 }).every(
				b => b.rewardStroops >= 10_000_000 && b.rewardStroops <= 30_000_000
			)
		).toBe(true);
		expect(
			getBounties({ status: 'active' }).every(b => b.status === 'open')
		).toBe(true);
	});

	it('submits work with a proof hash and blocks non-holders on gated bounties', async () => {
		const { result } = renderHook(() => useSubmitWork(), { wrapper });
		const proofHash = workInput('bounty-1').proofHash;

		await act(async () => {
			await result.current.mutateAsync(workInput('bounty-1'));
		});

		const submissions = getSubmissions('bounty-1');
		expect(submissions).toHaveLength(1);
		expect(submissions[0].worker).toBe(WORKER);
		expect(submissions[0].proofHash).toBe(proofHash);
		expect(submissions[0].proofHash).toMatch(/^0x[0-9a-f]{64}$/);

		await expect(
			result.current.mutateAsync(workInput('bounty-1', false))
		).rejects.toThrow(/must hold/i);
		expect(getSubmissions('bounty-1')).toHaveLength(1);
	});

	it('awards at most the winner limit and keeps remaining winners in sync', async () => {
		const submit = renderHook(() => useSubmitWork(), { wrapper });
		const award = renderHook(() => useAwardSubmission(CREATOR), { wrapper });

		for (const worker of [
			'GWORKER_1',
			'GWORKER_2',
			'GWORKER_3',
			'GWORKER_4',
		]) {
			await act(async () => {
				await submit.result.current.mutateAsync({
					...workInput('bounty-1'),
					worker,
				});
			});
		}

		const all = getSubmissions('bounty-1');
		for (const submission of all.slice(0, 3)) {
			await act(async () => {
				await award.result.current.mutateAsync(submission.id);
			});
		}

		expect(getBounty('bounty-1')?.status).toBe('awarded');
		expect(getRemainingWinners(getBounty('bounty-1')!)).toBe(0);

		await expect(award.result.current.mutateAsync(all[3].id)).rejects.toThrow(
			/winner slots/i
		);
		expect(
			getSubmissions('bounty-1').filter(s => s.status === 'awarded')
		).toHaveLength(3);
	});

	it('rejecting grants one resubmission which updates the worker state', async () => {
		const submit = renderHook(() => useSubmitWork(), { wrapper });
		const reject = renderHook(() => useRejectSubmission(CREATOR), {
			wrapper,
		});

		await act(async () => {
			await submit.result.current.mutateAsync(workInput('bounty-1'));
		});
		const submission = getSubmissions('bounty-1')[0];

		await act(async () => {
			await reject.result.current.mutateAsync({
				submissionId: submission.id,
				reason: 'Please add a source link',
			});
		});

		const rejected = getSubmissions('bounty-1')[0];
		expect(rejected.status).toBe('rejected');
		expect(rejected.resubmissionAllowed).toBe(true);

		await act(async () => {
			await submit.result.current.mutateAsync({
				...workInput('bounty-1'),
				link: 'https://example.com/revised',
			});
		});

		const resubmitted = getSubmissions('bounty-1')[0];
		expect(resubmitted.status).toBe('pending');
		expect(resubmitted.resubmissions).toBe(1);
		expect(resubmitted.resubmissionAllowed).toBe(false);
		expect(resubmitted.resubmissionUsed).toBe(true);

		await expect(
			submit.result.current.mutateAsync(workInput('bounty-1'))
		).rejects.toThrow(/already has your submission/i);
	});

	it('reclaims unpaid rewards only after the deadline', async () => {
		const reclaim = renderHook(() => useReclaimBounty(CREATOR), { wrapper });
		await expect(
			reclaim.result.current.mutateAsync('bounty-1')
		).rejects.toThrow(/deadline/i);

		let reclaimed = 0;
		await act(async () => {
			const result = await reclaim.result.current.mutateAsync('bounty-3');
			reclaimed = result.reclaimedStroops;
		});

		expect(reclaimed).toBe(60_000_000 * 2);
		expect(getBounty('bounty-3')?.status).toBe('reclaimed');
		expect(
			getBounties({ status: 'active' }).some(b => b.id === 'bounty-3')
		).toBe(false);
	});
});
