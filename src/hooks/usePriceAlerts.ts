import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	priceAlertService,
	type CreatePriceAlertInput,
	type PriceAlert,
} from '@/services/priceAlert.service';

export const PRICE_ALERTS_QUERY_KEY = ['price-alerts'] as const;

export function usePriceAlerts(enabled = true) {
	return useQuery({
		queryKey: PRICE_ALERTS_QUERY_KEY,
		queryFn: () => priceAlertService.getPriceAlerts(),
		enabled,
		refetchInterval: 60_000,
	});
}

export function useCreatePriceAlert() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: CreatePriceAlertInput) => priceAlertService.createPriceAlert(input),
		onSuccess: alert => {
			queryClient.setQueryData<PriceAlert[]>(PRICE_ALERTS_QUERY_KEY, previous => {
				const existing = previous ?? [];
				return [alert, ...existing.filter(item => item.id !== alert.id)];
			});
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: PRICE_ALERTS_QUERY_KEY });
		},
	});
}

export function useDeletePriceAlert() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (alertId: string) => priceAlertService.deletePriceAlert(alertId),
		onMutate: async alertId => {
			await queryClient.cancelQueries({ queryKey: PRICE_ALERTS_QUERY_KEY });
			const previous = queryClient.getQueryData<PriceAlert[]>(PRICE_ALERTS_QUERY_KEY);
			queryClient.setQueryData<PriceAlert[]>(PRICE_ALERTS_QUERY_KEY, (alerts = []) =>
				alerts.filter(alert => alert.id !== alertId)
			);
			return { previous };
		},
		onError: (_error, _alertId, context) => {
			if (context?.previous) {
				queryClient.setQueryData(PRICE_ALERTS_QUERY_KEY, context.previous);
			}
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: PRICE_ALERTS_QUERY_KEY });
		},
	});
}
