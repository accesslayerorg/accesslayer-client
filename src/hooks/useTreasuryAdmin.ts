import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	adminService,
	type TreasuryDistributionInput,
} from '@/services/admin.service';
import showToast from '@/utils/toast.util';

function messageFor(error: unknown): string {
	return error instanceof Error
		? error.message
		: 'Treasury request failed. Please try again.';
}

export function useTreasuryBalance() {
	return useQuery({
		queryKey: queryKeys.admin.treasury(),
		queryFn: () => adminService.getTreasuryBalance(),
		refetchInterval: 30_000,
	});
}

export function useTreasuryDistributions() {
	return useQuery({
		queryKey: queryKeys.admin.treasuryDistributions(),
		queryFn: () => adminService.getTreasuryDistributions(),
	});
}

export function useTreasuryFeeEvents() {
	return useQuery({
		queryKey: queryKeys.admin.treasuryFees(),
		queryFn: () => adminService.getTreasuryFeeEvents(),
	});
}

export function useDistributeTreasuryFees() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['admin', 'treasury', 'distribute'],
		mutationFn: (input: TreasuryDistributionInput) =>
			adminService.distributeTreasuryFees(input),
		onSuccess: result => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.admin.treasury(),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.admin.treasuryDistributions(),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.admin.treasuryFees(),
			});
			showToast.success(`Treasury distribution epoch ${result.epoch} confirmed`);
		},
		onError: error => showToast.error(messageFor(error)),
	});
}
