import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { keySubscriptionContractService } from '@/services/keySubscriptionContract.service';
import { queryKeys } from '@/lib/queryKeys';
import type { CreateSubscriptionInput, CancelSubscriptionInput } from '@/types/keySubscription';
import { useAccount } from 'wagmi';

/**
 * Fetch active subscription for a creator by the connected investor
 */
export function useKeySubscription(creatorId: string) {
	const { address } = useAccount();

	return useQuery({
		queryKey: queryKeys.keySubscription.detail(creatorId, address ?? ''),
		queryFn: async () => {
			if (!address) return null;
			const subscriptions =
				await keySubscriptionContractService.getSubscriptionsForInvestor(
					address
				);
			return (
				subscriptions.find(
					(s) => s.creatorId === creatorId && s.status === 'active'
				) ?? null
			);
		},
		enabled: Boolean(creatorId && address),
		staleTime: 30 * 1000,
		refetchInterval: 30 * 1000,
	});
}

/**
 * Create a new subscription investment
 */
export function useCreateSubscription() {
	const queryClient = useQueryClient();
	const { address } = useAccount();

	return useMutation({
		mutationFn: (input: CreateSubscriptionInput) =>
			keySubscriptionContractService.createSubscription(input),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.keySubscription.detail(
					variables.creatorId,
					address ?? ''
				),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.keySubscription.list(address ?? ''),
			});
		},
	});
}

/**
 * Cancel an active subscription
 */
export function useCancelSubscription() {
	const queryClient = useQueryClient();
	const { address } = useAccount();

	return useMutation({
		mutationFn: (input: CancelSubscriptionInput) =>
			keySubscriptionContractService.cancelSubscription(input),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.keySubscription.detail(
					'',
					address ?? ''
				),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.keySubscription.list(address ?? ''),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.keySubscription.all(),
			});
		},
	});
}

/**
 * Fetch all subscriptions for the connected investor
 */
export function useInvestorSubscriptions() {
	const { address } = useAccount();

	return useQuery({
		queryKey: address
			? queryKeys.keySubscription.list(address)
			: (['keySubscription', 'list', ''] as const),
		queryFn: () =>
			address
				? keySubscriptionContractService.getSubscriptionsForInvestor(address)
				: [],
		enabled: Boolean(address),
		staleTime: 30 * 1000,
		refetchInterval: 30 * 1000,
	});
}