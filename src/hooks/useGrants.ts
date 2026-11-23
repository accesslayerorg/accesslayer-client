import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	getGrant,
	listGrants,
	reviewMilestone,
	submitEvidence,
	type Grant,
	type GrantFilters,
	type ReviewMilestoneInput,
	type SubmitEvidenceInput,
} from '@/services/grants.service';
import showToast from '@/utils/toast.util';

function message(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}

export function useGrants(filters: Omit<GrantFilters, 'cursor'> = {}) {
	return useInfiniteQuery({
		queryKey: queryKeys.grants.pages(filters as Record<string, unknown>),
		queryFn: ({ pageParam }) =>
			listGrants({ ...filters, cursor: pageParam ?? null }),
		initialPageParam: null as string | null,
		getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
		staleTime: 20_000,
	});
}

export function useGrant(grantId: string | undefined) {
	return useQuery({
		queryKey: queryKeys.grants.detail(grantId ?? ''),
		queryFn: () => getGrant(grantId ?? ''),
		enabled: Boolean(grantId),
		staleTime: 10_000,
	});
}

export function useSubmitEvidence() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: ['grant', 'submit-evidence'],
		mutationFn: async (input: SubmitEvidenceInput) => submitEvidence(input),
		onSuccess: () => {
			showToast.success('Evidence submitted for review');
			void queryClient.invalidateQueries({
				queryKey: queryKeys.grants.all(),
			});
		},
		onError: error =>
			showToast.error(message(error, 'Could not submit evidence')),
	});
}

export function useReviewMilestone() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['grant', 'review-milestone'],
		mutationFn: async (input: ReviewMilestoneInput) => reviewMilestone(input),
		onMutate: async input => {
			await queryClient.cancelQueries({ queryKey: queryKeys.grants.all() });
			const grant = queryClient.getQueryData<Grant | undefined>(
				queryKeys.grants.detail(input.grantId)
			);
			const previous = grant;
			if (!grant || input.decision !== 'approve') return { previous };

			const target = grant.milestones.find(m => m.id === input.milestoneId);
			const releasedStroops =
				grant.releasedStroops + (target?.amountStroops ?? 0);
			queryClient.setQueryData<Grant>(
				queryKeys.grants.detail(grant.id),
				current =>
					current
						? {
								...current,
								releasedStroops,
								milestones: current.milestones.map(m =>
									m.id === input.milestoneId
										? { ...m, state: 'approved' }
										: m
								),
							}
						: current
			);
			return { previous };
		},
		onSuccess: (_result, input) => {
			showToast.success(
				input.decision === 'approve'
					? 'Milestone approved and funds released'
					: 'Evidence returned to pending'
			);
		},
		onError: (error, _input, context) => {
			if (context?.previous) {
				queryClient.setQueryData(
					queryKeys.grants.detail(context.previous.id),
					context.previous
				);
			}
			showToast.error(message(error, 'Could not review milestone'));
		},
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.grants.all(),
			});
		},
	});
}
