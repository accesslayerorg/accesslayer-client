import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	cancelLimitOrder,
	createLimitOrder,
	listOpenOrders,
	type CreateLimitOrderInput,
	type LimitOrder,
} from '@/services/orders';

export function useLimitOrders(creatorId: string, walletAddress?: string) {
	return useQuery<LimitOrder[]>({
		queryKey: queryKeys.limitOrders.list(creatorId, walletAddress ?? ''),
		queryFn: () => listOpenOrders(creatorId, walletAddress!),
		enabled: Boolean(creatorId && walletAddress),
		refetchInterval: 30_000,
	});
}

export function useCreateLimitOrder(creatorId: string, walletAddress?: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (
			input: Omit<CreateLimitOrderInput, 'creatorId' | 'walletAddress'>
		) =>
			createLimitOrder({
				...input,
				creatorId,
				walletAddress: walletAddress!,
			}),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: queryKeys.limitOrders.list(
					creatorId,
					walletAddress ?? ''
				),
			}),
	});
}

export function useCancelLimitOrder(creatorId: string, walletAddress?: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (orderId: string) => cancelLimitOrder(orderId),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: queryKeys.limitOrders.list(
					creatorId,
					walletAddress ?? ''
				),
			}),
	});
}
