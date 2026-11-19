import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	curveContractService,
	type CurveProposal,
} from '@/services/curveContract.service';
import showToast from '@/utils/toast.util';

export interface CurveProposalData {
	currentParams: {
		slope: number;
		intercept: number;
	};
	pendingProposal: CurveProposal | null;
}

export function useCurveProposal(creatorId: string) {
	const queryClient = useQueryClient();

	const query = useQuery<CurveProposalData>({
		queryKey: queryKeys.creators.curveProposal(creatorId),
		queryFn: async () => {
			const currentParams = curveContractService.getCurveParams(creatorId);
			const pendingProposal =
				curveContractService.getPendingProposal(creatorId);
			return {
				currentParams,
				pendingProposal,
			};
		},
		enabled: !!creatorId,
	});

	const proposeMutation = useMutation({
		mutationFn: async ({
			slope,
			intercept,
		}: {
			slope: number;
			intercept: number;
		}) => {
			return curveContractService.propose_curve_update({
				creatorId,
				slope,
				intercept,
			});
		},
		onSuccess: data => {
			queryClient.setQueryData<CurveProposalData>(
				queryKeys.creators.curveProposal(creatorId),
				old => ({
					currentParams:
						old?.currentParams ??
						curveContractService.getCurveParams(creatorId),
					pendingProposal: data.proposal,
				})
			);
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.curveProposal(creatorId),
			});
			if (typeof showToast.curveUpdateProposed === 'function') {
				showToast.curveUpdateProposed(
					'CurveUpdateProposed: Bonding curve parameter update proposed successfully.'
				);
			} else {
				showToast.success(
					'CurveUpdateProposed: Bonding curve parameter update proposed successfully.'
				);
			}
			return data;
		},
		onError: (error: unknown) => {
			const message =
				error instanceof Error
					? error.message
					: 'Failed to propose curve update';
			showToast.error(message);
		},
	});

	const cancelMutation = useMutation({
		mutationFn: async () => {
			return curveContractService.cancel_curve_update({
				creatorId,
			});
		},
		onSuccess: data => {
			queryClient.setQueryData<CurveProposalData>(
				queryKeys.creators.curveProposal(creatorId),
				old => ({
					currentParams:
						old?.currentParams ??
						curveContractService.getCurveParams(creatorId),
					pendingProposal: null,
				})
			);
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.curveProposal(creatorId),
			});
			showToast.success('Curve update proposal cancelled');
			return data;
		},
		onError: (error: unknown) => {
			const message =
				error instanceof Error
					? error.message
					: 'Failed to cancel proposal';
			showToast.error(message);
		},
	});

	const currentParams = query.data?.currentParams ?? {
		slope: 0.001,
		intercept: 1.0,
	};

	const pendingProposal =
		query.data?.pendingProposal &&
		query.data.pendingProposal.status === 'pending'
			? query.data.pendingProposal
			: null;

	return {
		currentParams,
		pendingProposal,
		hasActiveProposal: !!pendingProposal,
		isLoading: query.isLoading,
		isProposing: proposeMutation.isPending,
		isCancelling: cancelMutation.isPending,
		proposeError: proposeMutation.error,
		cancelError: cancelMutation.error,
		proposeCurveUpdate: (params: { slope: number; intercept: number }) =>
			proposeMutation.mutateAsync(params),
		cancelCurveUpdate: () => cancelMutation.mutateAsync(),
		refetch: () => query.refetch(),
	};
}
