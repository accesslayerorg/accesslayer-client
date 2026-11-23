import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	privacyService,
	type AccountDeletionState,
} from '@/services/privacy.service';
import showToast from '@/utils/toast.util';

const DELETION_STATE_KEY = ['privacy', 'deletion'] as const;

/** Manages the account deletion request / cancel lifecycle. */
export function useAccountDeletion() {
	const queryClient = useQueryClient();

	const stateQuery = useQuery<AccountDeletionState>({
		queryKey: [...DELETION_STATE_KEY],
		queryFn: () => privacyService.getDeletionState(),
		staleTime: 30_000,
	});

	const requestMutation = useMutation<AccountDeletionState, Error>({
		mutationFn: () => privacyService.requestDeletion(),
		onSuccess: state => {
			queryClient.setQueryData([...DELETION_STATE_KEY], state);
		},
		onError: () => {
			showToast.error('Failed to submit deletion request. Please try again.');
		},
	});

	const cancelMutation = useMutation<AccountDeletionState, Error>({
		mutationFn: () => privacyService.cancelDeletion(),
		onSuccess: state => {
			queryClient.setQueryData([...DELETION_STATE_KEY], state);
			showToast.success('Deletion request cancelled. Your account is active.');
		},
		onError: () => {
			showToast.error('Failed to cancel deletion. Please try again.');
		},
	});

	const deletionState = stateQuery.data ?? null;

	return {
		deletionState,
		isLoading: stateQuery.isLoading,
		isError: stateQuery.isError,
		blockingReasons: deletionState?.blockingReasons ?? [],
		gracePeriodEndsAt: deletionState?.gracePeriodEndsAt ?? null,
		isPending: deletionState?.status === 'pending',
		isSubmitting: requestMutation.isPending,
		isCancelling: cancelMutation.isPending,
		requestDeletion: () => requestMutation.mutate(),
		cancelDeletion: () => cancelMutation.mutate(),
	};
}
