import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
	type InfiniteData,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	fetchReferralHoldDetail,
	fetchReferralHoldsPage,
	fetchReferralHoldsSummary,
	submitReferralHoldReview,
	type ReferralHold,
	type ReferralHoldDetail,
	type ReferralHoldFilters,
	type ReferralHoldReviewAction,
	type ReferralHoldStatus,
	type ReferralHoldsPage,
	type ReferralHoldsSummary,
} from '@/services/adminReferralHolds.service';
import showToast from '@/utils/toast.util';

export function useReferralHolds(
	filters: ReferralHoldFilters = {},
	enabled = true
) {
	const query = useInfiniteQuery({
		queryKey: queryKeys.admin.referralHolds.list(filters),
		queryFn: ({ pageParam }) =>
			fetchReferralHoldsPage(
				filters,
				pageParam as string | null | undefined
			),
		initialPageParam: null as string | null,
		getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
		staleTime: 30_000,
		enabled,
	});

	const seen = new Set<string>();
	const holds = (query.data?.pages ?? [])
		.flatMap(page => page.items)
		.filter(hold => {
			if (seen.has(hold.id)) return false;
			seen.add(hold.id);
			return true;
		});

	return { ...query, holds };
}

export function useReferralHoldsSummary(enabled = true) {
	return useQuery({
		queryKey: queryKeys.admin.referralHolds.summary(),
		queryFn: fetchReferralHoldsSummary,
		staleTime: 30_000,
		enabled,
	});
}

export function useReferralHoldDetail(
	holdId: string | null | undefined,
	enabled = true
) {
	return useQuery({
		queryKey: queryKeys.admin.referralHolds.detail(holdId ?? ''),
		queryFn: () => fetchReferralHoldDetail(holdId!),
		enabled: enabled && Boolean(holdId),
	});
}

export interface ReviewHoldVariables {
	holdId: string;
	action: ReferralHoldReviewAction;
	note: string;
	reviewer?: string;
}

function isInfiniteHoldData(
	data: unknown
): data is InfiniteData<ReferralHoldsPage> {
	return Boolean(
		data &&
			typeof data === 'object' &&
			'pages' in data &&
			Array.isArray((data as { pages: unknown }).pages)
	);
}

function isHoldDetail(data: unknown): data is ReferralHoldDetail {
	return Boolean(
		data &&
			typeof data === 'object' &&
			'id' in data &&
			'status' in data &&
			'linkedWallets' in data
	);
}

function isSummary(data: unknown): data is ReferralHoldsSummary {
	return Boolean(
		data &&
			typeof data === 'object' &&
			'held' in data &&
			'released' in data &&
			'rejected' in data
	);
}

function findPreviousStatus(
	entries: Array<[readonly unknown[], unknown]>,
	holdId: string
): ReferralHoldStatus | undefined {
	for (const [, data] of entries) {
		if (isInfiniteHoldData(data)) {
			const match = data.pages
				.flatMap(page => page.items)
				.find(hold => hold.id === holdId);
			if (match) return match.status;
		}
		if (isHoldDetail(data) && data.id === holdId) return data.status;
	}
	return undefined;
}

export function useReviewReferralHoldMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ holdId, action, note, reviewer }: ReviewHoldVariables) =>
			submitReferralHoldReview(holdId, { action, note, reviewer }),
		onMutate: async variables => {
			await queryClient.cancelQueries({
				queryKey: queryKeys.admin.referralHolds.all(),
			});

			const previous = queryClient.getQueriesData({
				queryKey: queryKeys.admin.referralHolds.all(),
			});
			const nextStatus: ReferralHoldStatus =
				variables.action === 'release' ? 'released' : 'rejected';
			const previousStatus = findPreviousStatus(previous, variables.holdId);
			const patch: Partial<ReferralHold> = {
				status: nextStatus,
				reviewNote: variables.note,
				reviewedAt: new Date().toISOString(),
				reviewedBy: variables.reviewer ?? null,
			};

			queryClient.setQueriesData<unknown>(
				{ queryKey: queryKeys.admin.referralHolds.all() },
				(old: unknown) => {
					if (!old) return old;
					if (isInfiniteHoldData(old)) {
						return {
							...old,
							pages: old.pages.map(page => ({
								...page,
								items: page.items.map(hold =>
									hold.id === variables.holdId
										? { ...hold, ...patch }
										: hold
								),
							})),
						};
					}
					if (isHoldDetail(old) && old.id === variables.holdId) {
						return { ...old, ...patch };
					}
					if (isSummary(old)) {
						const summary = { ...old };
						if (previousStatus && previousStatus !== nextStatus) {
							summary[previousStatus] = Math.max(
								0,
								summary[previousStatus] - 1
							);
						}
						summary[nextStatus] = summary[nextStatus] + 1;
						return summary;
					}
					return old;
				}
			);

			return { previous };
		},
		onError: (_error, _variables, context) => {
			context?.previous.forEach(([key, data]) => {
				queryClient.setQueryData(key, data);
			});
			showToast.error('Could not review the referral hold. Please try again.');
		},
		onSuccess: (_data, variables) => {
			showToast.success(
				variables.action === 'release'
					? 'Referral reward released'
					: 'Referral hold rejected'
			);
		},
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.admin.referralHolds.all(),
			});
		},
	});
}
