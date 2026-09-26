import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	adminService,
	type MultiSigAction,
	type MultiSigSignature,
} from '@/services/admin.service';
import showToast from '@/utils/toast.util';

function errorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: 'The multi-sig action could not be completed.';
}

export function useMultiSigActions(
	isAdmin: boolean,
	walletAddress?: string,
	connected?: boolean
) {
	const queryClient = useQueryClient();
	const enabled = isAdmin && Boolean(connected && walletAddress);

	const pending = useQuery({
		queryKey: queryKeys.admin.multiSigPending(),
		queryFn: () => adminService.getPendingMultiSigActions(),
		enabled,
	});

	const history = useQuery({
		queryKey: queryKeys.admin.multiSigHistory(),
		queryFn: () => adminService.getMultiSigHistory(),
		enabled,
	});

	const sign = useMutation({
		mutationKey: ['admin', 'multisig', 'sign'],
		mutationFn: ({ action, signature }: { action: MultiSigAction; signature: string }) =>
			adminService.signMultiSigAction(action.id, signature, walletAddress ?? ''),
		onSuccess: (result, { action, signature }) => {
			queryClient.setQueryData<MultiSigAction[]>(
				queryKeys.admin.multiSigPending(),
				actions =>
					(actions ?? []).map(item => {
						if (item.id !== action.id) return item;
						if (result) return result;
						const newSignature: MultiSigSignature = {
							signer: walletAddress ?? '',
							signature,
							signedAt: new Date().toISOString(),
						};
						return { ...item, signatures: [...item.signatures, newSignature] };
					})
			);
		},
		onError: (error: unknown) => {
			showToast.error(errorMessage(error));
		},
	});

	const execute = useMutation({
		mutationKey: ['admin', 'multisig', 'execute'],
		mutationFn: (action: MultiSigAction) =>
			adminService.executeMultiSigAction(action.id),
		onSuccess: (result, action) => {
			queryClient.setQueryData<MultiSigAction[]>(
				queryKeys.admin.multiSigPending(),
				actions => (actions ?? []).filter(item => item.id !== action.id)
			);
			const completed =
				result ??
				({ ...action, executedAt: new Date().toISOString() } satisfies MultiSigAction);
			queryClient.setQueryData<MultiSigAction[]>(
				queryKeys.admin.multiSigHistory(),
				actions => [
					{ ...completed, executedAt: completed.executedAt ?? new Date().toISOString() },
					...(actions ?? []),
				]
			);
			showToast.success('Multi-sig action executed');
		},
		onError: (error: unknown) => {
			showToast.error(errorMessage(error));
		},
	});

	return { pending, history, sign, execute, enabled };
}
