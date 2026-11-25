import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dcaService } from '@/services/dca.service';
import { queryKeys } from '@/lib/queryKeys';
import type { CreateDcaPlanInput, DcaExecutionRun, DcaPlan } from '@/types/dca.types';
import toast from 'react-hot-toast';

export function useDcaPlans(wallet?: string) {
	const queryClient = useQueryClient();
	const queryKey = queryKeys.dca.byWallet(wallet);

	const {
		data: plans = [],
		isLoading,
		isError,
		refetch,
	} = useQuery({
		queryKey,
		queryFn: () => dcaService.getPlans(wallet),
		staleTime: 30 * 1000,
	});

	const createMutation = useMutation({
		mutationFn: (input: CreateDcaPlanInput) => dcaService.createPlan(input),
		onSuccess: (newPlan) => {
			queryClient.setQueryData<DcaPlan[]>(queryKey, (old = []) => [newPlan, ...old]);
			queryClient.invalidateQueries({ queryKey: queryKeys.dca.all() });
			toast.success(`DCA Plan for ${newPlan.creatorName} created successfully!`);
		},
		onError: (err: unknown) => {
			const message = err instanceof Error ? err.message : 'Failed to create DCA plan';
			toast.error(message);
		},
	});

	const pauseMutation = useMutation({
		mutationFn: (planId: string) => dcaService.pausePlan(planId),
		onMutate: async (planId) => {
			await queryClient.cancelQueries({ queryKey });
			const previousPlans = queryClient.getQueryData<DcaPlan[]>(queryKey);

			// Immediate state update (#1470)
			queryClient.setQueryData<DcaPlan[]>(queryKey, (old = []) =>
				old.map((p) => (p.id === planId ? { ...p, status: 'paused' as const } : p))
			);

			return { previousPlans };
		},
		onError: (_err, _planId, context) => {
			if (context?.previousPlans) {
				queryClient.setQueryData(queryKey, context.previousPlans);
			}
			toast.error('Failed to pause plan');
		},
		onSuccess: (updatedPlan) => {
			toast.success(`Plan for ${updatedPlan.creatorName} paused`);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const resumeMutation = useMutation({
		mutationFn: (planId: string) => dcaService.resumePlan(planId),
		onMutate: async (planId) => {
			await queryClient.cancelQueries({ queryKey });
			const previousPlans = queryClient.getQueryData<DcaPlan[]>(queryKey);

			// Immediate state update (#1470)
			queryClient.setQueryData<DcaPlan[]>(queryKey, (old = []) =>
				old.map((p) => (p.id === planId ? { ...p, status: 'active' as const } : p))
			);

			return { previousPlans };
		},
		onError: (_err, _planId, context) => {
			if (context?.previousPlans) {
				queryClient.setQueryData(queryKey, context.previousPlans);
			}
			toast.error('Failed to resume plan');
		},
		onSuccess: (updatedPlan) => {
			toast.success(`Plan for ${updatedPlan.creatorName} resumed`);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const cancelMutation = useMutation({
		mutationFn: (planId: string) => dcaService.cancelPlan(planId),
		onMutate: async (planId) => {
			await queryClient.cancelQueries({ queryKey });
			const previousPlans = queryClient.getQueryData<DcaPlan[]>(queryKey);

			queryClient.setQueryData<DcaPlan[]>(queryKey, (old = []) =>
				old.map((p) => (p.id === planId ? { ...p, status: 'cancelled' as const } : p))
			);

			return { previousPlans };
		},
		onError: (_err, _planId, context) => {
			if (context?.previousPlans) {
				queryClient.setQueryData(queryKey, context.previousPlans);
			}
			toast.error('Failed to cancel plan');
		},
		onSuccess: (updatedPlan) => {
			toast.success(`Plan for ${updatedPlan.creatorName} cancelled`);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const recordRunMutation = useMutation({
		mutationFn: ({
			planId,
			run,
		}: {
			planId: string;
			run: Omit<DcaExecutionRun, 'id' | 'planId' | 'timestamp'>;
		}) => dcaService.recordExecutionRun(planId, run),
		onSuccess: ({ plan, autoPaused }) => {
			queryClient.invalidateQueries({ queryKey });
			if (autoPaused) {
				toast.error(
					`DCA Plan for ${plan.creatorName} was automatically paused after 3 consecutive failures.`,
					{ duration: 6000 }
				);
			}
		},
	});

	return {
		plans,
		isLoading,
		isError,
		refetch,
		createPlan: createMutation.mutateAsync,
		isCreating: createMutation.isPending,
		pausePlan: pauseMutation.mutate,
		isPausing: pauseMutation.isPending,
		resumePlan: resumeMutation.mutate,
		isResuming: resumeMutation.isPending,
		cancelPlan: cancelMutation.mutate,
		isCancelling: cancelMutation.isPending,
		recordRun: recordRunMutation.mutateAsync,
	};
}
