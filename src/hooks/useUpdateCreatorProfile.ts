import { useMutation, useQueryClient } from '@tanstack/react-query';
import { courseService, type Course } from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';
import showToast from '@/utils/toast.util';

interface UpdateCreatorProfileVariables {
	creatorId: string;
	data: Partial<Course>;
}

/**
 * Mutation hook for updating a creator's profile information.
 *
 * On success:
 * - Invalidates the creator profile query to refetch fresh data
 * - Shows success toast: "Profile updated successfully"
 * - Toast auto-dismisses after 4 seconds
 *
 * On error:
 * - Rolls back optimistic updates (if any)
 * - Shows error toast with server error message
 *
 * Usage:
 * ```ts
 * const mutation = useUpdateCreatorProfile();
 * mutation.mutate({ creatorId: '123', data: { title: 'New Name' } });
 * ```
 */
export function useUpdateCreatorProfile() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ creatorId, data }: UpdateCreatorProfileVariables) => {
			return courseService.updateCourse(creatorId, data);
		},
		onError: (error) => {
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to update profile';
			showToast.error(errorMessage);
		},
		onSuccess: (_, variables) => {
			// Invalidate the creator profile query to refetch fresh data
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(variables.creatorId),
			});

			// Show success toast that auto-dismisses after 4 seconds
			showToast.success('Profile updated successfully');
		},
	});
}
