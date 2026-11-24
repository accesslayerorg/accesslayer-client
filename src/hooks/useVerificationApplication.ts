import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	creatorVerificationService,
	type ProofCheckResult,
	type VerificationApplication,
	type VerificationApplicationDraft,
} from '@/services/creatorVerification.service';
import showToast from '@/utils/toast.util';

export function useVerificationApplication() {
	const query = useQuery<VerificationApplication | null>({
		queryKey: queryKeys.verificationApplication.mine(),
		queryFn: () => creatorVerificationService.getMyApplication(),
		retry: false,
	});

	return {
		application: query.data ?? null,
		isLoading: query.isLoading,
		isError: query.isError,
		error: query.error,
		refetch: query.refetch,
	};
}

export function useSubmitVerificationApplication() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (draft: VerificationApplicationDraft) =>
			creatorVerificationService.submitApplication(draft),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.verificationApplication.mine(),
			});
			showToast.success('Verification application submitted');
		},
		onError: () => {
			showToast.error('Failed to submit your application. Please try again.');
		},
	});
}

export function useResubmitVerificationApplication() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			draft,
		}: {
			id: string;
			draft: VerificationApplicationDraft;
		}) => creatorVerificationService.resubmitApplication(id, draft),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.verificationApplication.mine(),
			});
			showToast.success('Verification application resubmitted');
		},
		onError: () => {
			showToast.error('Failed to resubmit your application. Please try again.');
		},
	});
}

export function useCheckProofCode() {
	return useMutation<ProofCheckResult, Error, string>({
		mutationFn: proofCode =>
			creatorVerificationService.checkProofCode(proofCode),
		onError: () => {
			showToast.error('Could not check the proof post. Please try again.');
		},
	});
}
