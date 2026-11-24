import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { creatorStreamContractService } from '@/services/creatorStreamContract.service';
import type { EarningsStream, StreamWithdrawal } from '@/types/stream';
import { calculateClaimableBalance } from '@/utils/stream.utils';
import showToast from '@/utils/toast.util';

export interface UseStreamResult {
	stream: EarningsStream | undefined;
	funded: number;
	withdrawn: number;
	rate: number;
	claimable: number;
	isPaused: boolean;
	withdrawals: StreamWithdrawal[];
	withdraw: (amount: number) => Promise<StreamWithdrawal>;
	isLoading: boolean;
	isWithdrawing: boolean;
	error: Error | null;
}

export function useStream(streamId: string): UseStreamResult {
	const queryClient = useQueryClient();

	const {
		data: stream,
		isLoading,
		error,
	} = useQuery({
		queryKey: queryKeys.stream.detail(streamId),
		queryFn: () => creatorStreamContractService.getStream(streamId),
		enabled: Boolean(streamId),
	});

	// Live ticker updates claimable balance each second
	const [now, setNow] = useState<number>(Date.now());

	useEffect(() => {
		if (!stream || stream.isPaused) return;
		const interval = setInterval(() => {
			setNow(Date.now());
		}, 1000);
		return () => clearInterval(interval);
	}, [stream]);

	const mutation = useMutation({
		mutationFn: (amount: number) =>
			creatorStreamContractService.withdraw(streamId, amount),
		onSuccess: res => {
			showToast.success(
				`Successfully withdrew ${res.amountXlm.toFixed(2)} XLM from stream!`
			);
			void queryClient.invalidateQueries({
				queryKey: queryKeys.stream.all(),
			});
		},
		onError: (err: Error) => {
			showToast.error(err.message || 'Withdrawal failed');
		},
	});

	const funded = stream?.fundedAmount ?? 0;
	const withdrawn = stream?.withdrawnAmount ?? 0;
	const rate = stream?.ratePerSecond ?? 0;
	const isPaused = Boolean(stream?.isPaused);
	const claimable = stream ? calculateClaimableBalance(stream, now) : 0;
	const withdrawals = stream?.withdrawals ?? [];

	return {
		stream: stream ?? undefined,
		funded,
		withdrawn,
		rate,
		claimable,
		isPaused,
		withdrawals,
		withdraw: mutation.mutateAsync,
		isLoading,
		isWithdrawing: mutation.isPending,
		error: (error as Error) || null,
	};
}

export function useCreatorStreams(creatorAddress?: string) {
	const queryClient = useQueryClient();

	const {
		data: streams,
		isLoading,
		error,
	} = useQuery({
		queryKey: queryKeys.stream.list(creatorAddress),
		queryFn: () => creatorStreamContractService.getStreams(creatorAddress),
	});

	return {
		streams: streams ?? [],
		isLoading,
		error: (error as Error) || null,
		refetch: () =>
			queryClient.invalidateQueries({ queryKey: queryKeys.stream.all() }),
	};
}
