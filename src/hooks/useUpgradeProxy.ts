import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	adminService,
	type UpgradeHistoryEvent,
	type UpgradeProxyStatus,
} from '@/services/admin.service';
import showToast from '@/utils/toast.util';

function errorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: 'The upgrade proxy action could not be completed.';
}

export function useUpgradeProxy(
	isAdmin: boolean,
	connected?: boolean
) {
	const queryClient = useQueryClient();
	const enabled = isAdmin && Boolean(connected);

	const status = useQuery({
		queryKey: queryKeys.admin.upgradeProxyStatus(),
		queryFn: () => adminService.getUpgradeProxyStatus(),
		enabled,
	});

	const pendingUpgrade = useQuery({
		queryKey: queryKeys.admin.upgradeProxyPending(),
		queryFn: () => adminService.getPendingUpgrade(),
		enabled,
	});

	const history = useQuery({
		queryKey: queryKeys.admin.upgradeProxyHistory(),
		queryFn: () => adminService.getUpgradeHistory(),
		enabled,
	});

	const executeUpgrade = useMutation({
		mutationKey: ['admin', 'proxy', 'execute'],
		mutationFn: ({
			signature,
			signer,
		}: {
			signature: string;
			signer: string;
		}) => adminService.executeUpgrade(signature, signer),
		onSuccess: result => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.admin.upgradeProxyPending(),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.admin.upgradeProxyStatus(),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.admin.upgradeProxyHistory(),
			});
			if (result) {
				queryClient.setQueryData<UpgradeHistoryEvent[]>(
					queryKeys.admin.upgradeProxyHistory(),
					items => [result, ...(items ?? [])]
				);
			}
			showToast.success('Upgrade executed');
		},
		onError: (error: unknown) => {
			showToast.error(errorMessage(error));
		},
	});

	const toggleFreeze = useMutation({
		mutationKey: ['admin', 'proxy', 'freeze'],
		mutationFn: ({
			isFrozen,
			signature,
			signer,
		}: {
			isFrozen: boolean;
			signature: string;
			signer: string;
		}) => adminService.toggleEmergencyFreeze(isFrozen, signature, signer),
		onSuccess: result => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.admin.upgradeProxyStatus(),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.admin.upgradeProxyHistory(),
			});
			queryClient.setQueryData<UpgradeProxyStatus | undefined>(
				queryKeys.admin.upgradeProxyStatus(),
				result
			);
			showToast.success(
				result?.isFrozen
					? 'Emergency freeze enabled'
					: 'Emergency freeze disabled'
			);
		},
		onError: (error: unknown) => {
			showToast.error(errorMessage(error));
		},
	});

	return {
		status,
		pendingUpgrade,
		history,
		executeUpgrade,
		toggleFreeze,
		enabled,
	};
}
