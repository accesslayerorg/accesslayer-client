import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReviewMilestone } from '@/hooks/useGrants';
import { queryKeys } from '@/lib/queryKeys';
import {
	getGrant,
	listGrants,
	resetGrantStore,
	reviewMilestone,
	submitEvidence,
} from '@/services/grants.service';
import { computeEvidenceHash } from '@/utils/hash.utils';

const RECIPIENT = 'GRECIPIENT_1';
const REVIEWER = 'GREVIEWER_1';
const OUTSIDER = 'GOUTSIDER';

const { showToastSuccess, showToastError } = vi.hoisted(() => ({
	showToastSuccess: vi.fn(),
	showToastError: vi.fn(),
}));

vi.mock('@/utils/toast.util', () => ({
	default: { success: showToastSuccess, error: showToastError },
}));

describe('grants (#1440)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.clearAllMocks();
		resetGrantStore();
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('paginates grants with cursors', () => {
		const first = listGrants({ limit: 2 });
		expect(first.grants).toHaveLength(2);
		expect(first.nextCursor).toBe('2');

		const second = listGrants({ limit: 2, cursor: first.nextCursor });
		expect(second.grants).toHaveLength(1);
		expect(second.nextCursor).toBeNull();
		expect(second.grants[0].id).toBe('grant-3');
	});

	it('shows returned funds on cancelled grants', () => {
		const cancelled = listGrants({ status: 'cancelled' }).grants;
		expect(cancelled).toHaveLength(1);
		expect(cancelled[0].returnedAmountStroops).toBe(13_000_000);
	});

	it('gates evidence submission to the recipient', () => {
		const evidence = {
			milestoneId: 'grant-1-m3',
			link: 'https://github.com/example/sdk',
			description: 'SDK published',
			fileHash: computeEvidenceHash('https://github.com/example/sdk'),
		};

		expect(() =>
			submitEvidence({ ...evidence, wallet: OUTSIDER })
		).toThrowError(/Only the grant recipient/);
		expect(() =>
			submitEvidence({ ...evidence, wallet: REVIEWER, link: 'not-a-link' })
		).toThrowError(/valid http\(s\)/);

		const result = submitEvidence({ ...evidence, wallet: RECIPIENT });
		expect(result.milestone.state).toBe('submitted');
		expect(result.milestone.evidence?.fileHash).toBe(evidence.fileHash);
	});

	it('requires a reason on rejection and returns the milestone to pending', () => {
		submitEvidence({
			milestoneId: 'grant-1-m3',
			wallet: RECIPIENT,
			link: 'https://github.com/example/sdk',
			description: 'Draft',
			fileHash: computeEvidenceHash('draft'),
		});

		expect(() =>
			reviewMilestone({
				grantId: 'grant-1',
				milestoneId: 'grant-1-m3',
				wallet: REVIEWER,
				decision: 'reject',
			})
		).toThrowError(/reason is required/i);

		const result = reviewMilestone({
			grantId: 'grant-1',
			milestoneId: 'grant-1-m3',
			wallet: REVIEWER,
			decision: 'reject',
			reason: 'Add the missing type exports.',
		});
		expect(result.milestone.state).toBe('pending');
		expect(result.milestone.rejectionReason).toBe(
			'Add the missing type exports.'
		);
		expect(result.grant.releasedStroops).toBe(20_000_000);
	});

	it('updates released balance and timeline on approval', async () => {
		const { result } = renderHook(() => useReviewMilestone(), { wrapper });
		queryClient.setQueryData(
			queryKeys.grants.detail('grant-1'),
			getGrant('grant-1')
		);

		await act(async () => {
			await result.current.mutateAsync({
				grantId: 'grant-1',
				milestoneId: 'grant-1-m2',
				wallet: REVIEWER,
				decision: 'approve',
			});
		});

		const grant = getGrant('grant-1')!;
		expect(grant.releasedStroops).toBe(45_000_000);
		expect(grant.releases.some(r => r.milestoneId === 'grant-1-m2')).toBe(
			true
		);
		expect(grant.milestones.find(m => m.id === 'grant-1-m2')?.state).toBe(
			'approved'
		);
	});
});
