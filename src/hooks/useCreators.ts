import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	courseService,
	type Course,
	type GetCoursesParams,
	type PriceHistoryInterval,
} from '@/services/course.service';
import showToast from '@/utils/toast.util';

export function useCreatorList(params?: GetCoursesParams) {
	return useQuery({
		queryKey: queryKeys.creators.list(params),
		queryFn: async () => [],
	});
}

/**
 * Key detail refresh cadence (#1121): polling every 30s lets the UI pick up
 * an admin freeze (or an unfreeze) without requiring a page reload.
 */
export const CREATOR_DETAIL_REFRESH_INTERVAL_MS = 30_000;

export function useCreatorDetail(id: string) {
	return useQuery({
		queryKey: queryKeys.creators.detail(id),
		queryFn: () => courseService.getCourse(id),
		enabled: !!id,
		staleTime: CREATOR_DETAIL_REFRESH_INTERVAL_MS,
		refetchInterval: CREATOR_DETAIL_REFRESH_INTERVAL_MS,
	});
}

export function usePriceHistory(id: string, interval: PriceHistoryInterval) {
	return useQuery({
		queryKey: queryKeys.creators.priceHistory(id, interval),
		queryFn: () => courseService.getPriceHistory(id, interval),
		enabled: !!id,
	});
}

export function useSetCoCreator(courseId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ address, splitBps }: { address: string; splitBps: number }) =>
			courseService.setCoCreator(courseId, address, splitBps),
		onSuccess: (updatedCourse: Course) => {
			if (updatedCourse) {
				queryClient.setQueryData(
					queryKeys.creators.detail(courseId),
					updatedCourse
				);
			}
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(courseId),
			});
			showToast.success('Co-creator configured successfully');
		},
		onError: (error: unknown) => {
			const message =
				error instanceof Error ? error.message : 'Failed to set co-creator';
			showToast.error(message);
		},
	});
}