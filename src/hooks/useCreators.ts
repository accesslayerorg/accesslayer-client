import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	courseService,
	type Course,
	type GetCoursesParams,
} from '@/services/course.service';
import showToast from '@/utils/toast.util';

export function useCreatorList(params?: GetCoursesParams) {
	return useQuery({
		queryKey: queryKeys.creators.list(params),
		queryFn: async () => [],
	});
}

export function useCreatorDetail(id: string) {
	return useQuery({
		queryKey: queryKeys.creators.detail(id),
		queryFn: () => courseService.getCourse(id),
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


