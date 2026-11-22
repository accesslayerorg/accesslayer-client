import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { adminService } from '@/services/admin.service';
import showToast from '@/utils/toast.util';

function errorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: 'Something went wrong. Please try again.';
}

export function useAclWhitelist() {
	return useQuery({
		queryKey: queryKeys.admin.aclWhitelist(),
		queryFn: () => adminService.getAclWhitelist(),
	});
}

export function useAclHistory() {
	return useQuery({
		queryKey: queryKeys.admin.aclHistory(),
		queryFn: () => adminService.getAclHistory(),
	});
}

export function useAddAclContract() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['admin', 'acl', 'add'],
		mutationFn: ({ address, functions }: { address: string; functions: string[] }) =>
			adminService.addAclContract(address, functions),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.admin.aclWhitelist(),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.admin.aclHistory(),
			});
			showToast.success('Contract added to ACL');
		},
		onError: (error: unknown) => {
			showToast.error(errorMessage(error));
		},
	});
}

export function useRemoveAclContract() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['admin', 'acl', 'remove'],
		mutationFn: (address: string) => adminService.removeAclContract(address),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.admin.aclWhitelist(),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.admin.aclHistory(),
			});
			showToast.success('Contract removed from ACL');
		},
		onError: (error: unknown) => {
			showToast.error(errorMessage(error));
		},
	});
}
