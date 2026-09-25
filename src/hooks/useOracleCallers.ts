import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { adminService } from '@/services/admin.service';
import showToast from '@/utils/toast.util';

function errorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: 'Something went wrong. Please try again.';
}

export function useOracleCallers() {
	return useQuery({
		queryKey: queryKeys.admin.oracleCallers(),
		queryFn: () => adminService.getOracleCallers(),
	});
}

export function useAddOracleCaller() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['admin', 'oracle', 'callers', 'add'],
		mutationFn: (address: string) => adminService.addOracleCaller(address),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.admin.oracleCallers(),
			});
			showToast.success('Caller approved');
		},
		onError: (error: unknown) => {
			showToast.error(errorMessage(error));
		},
	});
}

export function useRemoveOracleCaller() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['admin', 'oracle', 'callers', 'remove'],
		mutationFn: (address: string) => adminService.removeOracleCaller(address),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.admin.oracleCallers(),
			});
			showToast.success('Caller removed');
		},
		onError: (error: unknown) => {
			showToast.error(errorMessage(error));
		},
	});
}
