import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { adminService } from '@/services/admin.service';
import showToast from '@/utils/toast.util';

function errorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: 'The timelock action could not be completed.';
}

export function useTimelockActions(
	isAdmin: boolean,
	walletAddress?: string,
	connected?: boolean
) {
	const queryClient = useQueryClient();
	const enabled = isAdmin && Boolean(connected && walletAddress);

	const pending = useQuery({
		queryKey: queryKeys.admin.timelockPending(),
		queryFn: () => adminService.getPendingTimelockActions(),
		enabled,
		refetchInterval: 30_000,
	});

	const history = useQuery({
		queryKey: queryKeys.admin.timelockHistory(),
		queryFn: () => adminService.getTimelockHistory(),
		enabled,
		refetchInterval: 60_000,
	});

	const cancel = useMutation({
		mutationKey: ['admin', 'timelock', 'cancel'],
		mutationFn: (actionId: string) => {
			if (!enabled)
				throw new Error(
					'Connect an authorized admin wallet to cancel actions.'
				);
			return adminService.cancelTimelockAction(actionId);
		},
		onSuccess: async (_result, actionId) => {
			queryClient.setQueryData(
				queryKeys.admin.timelockPending(),
				(actions: Array<{ id: string }> | undefined) =>
					actions?.filter(action => action.id !== actionId)
			);
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: queryKeys.admin.timelockPending(),
				}),
				queryClient.invalidateQueries({
					queryKey: queryKeys.admin.timelockHistory(),
				}),
			]);
			showToast.success('Timelock action cancelled');
		},
		onError: (error: unknown) => showToast.error(errorMessage(error)),
	});

	return { pending, history, cancel, enabled };
}
